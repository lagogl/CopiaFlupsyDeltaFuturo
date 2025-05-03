// server/controllers/report-controller.ts
import { Request, Response } from 'express';
import { db } from '../db';
import {
  reports, deliveryReports, salesReports, reportTemplates,
  orders, orderItems, clients, payments,
  insertReportSchema, insertDeliveryReportSchema, insertSalesReportSchema,
  Report, DeliveryReport, SalesReport
} from '@shared/schema';
import { eq, like, ilike, and, or, desc, asc, sql, gte, lte, isNotNull, inArray } from 'drizzle-orm';
import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';

// Directory per salvare i report generati
const REPORTS_DIR = path.join(process.cwd(), 'reports');

// Assicurati che la directory esista
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

// Ottiene la lista dei report
export async function getReports(req: Request, res: Response) {
  try {
    const { type, status, search, startDate, endDate, limit, offset, sortBy, sortDirection } = req.query;
    
    // Costruisci la query di base
    let query = db.select().from(reports);
    
    // Applica i filtri
    const whereConditions = [];
    
    if (type) {
      whereConditions.push(eq(reports.type, type as string));
    }
    
    if (status) {
      whereConditions.push(eq(reports.status, status as string));
    }
    
    if (search) {
      const searchTerm = `%${search}%`;
      whereConditions.push(
        or(
          ilike(reports.title, searchTerm),
          ilike(reports.description, searchTerm)
        )
      );
    }
    
    if (startDate) {
      whereConditions.push(gte(reports.createdAt, new Date(startDate as string)));
    }
    
    if (endDate) {
      whereConditions.push(lte(reports.createdAt, new Date(endDate as string)));
    }
    
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }
    
    // Applica ordinamento
    if (sortBy && typeof sortBy === 'string') {
      const direction = sortDirection === 'desc' ? desc : asc;
      
      // Utilizza la colonna specificata per l'ordinamento
      switch (sortBy) {
        case 'createdAt':
          query = query.orderBy(direction(reports.createdAt));
          break;
        case 'title':
          query = query.orderBy(direction(reports.title));
          break;
        case 'type':
          query = query.orderBy(direction(reports.type));
          break;
        case 'status':
          query = query.orderBy(direction(reports.status));
          break;
        default:
          query = query.orderBy(desc(reports.createdAt));
      }
    } else {
      // Ordinamento predefinito
      query = query.orderBy(desc(reports.createdAt));
    }
    
    // Applica paginazione
    if (limit !== undefined) {
      const limitNum = parseInt(limit as string);
      const offsetNum = offset ? parseInt(offset as string) : 0;
      
      if (!isNaN(limitNum)) {
        query = query.limit(limitNum);
        if (!isNaN(offsetNum)) {
          query = query.offset(offsetNum);
        }
      }
    }
    
    const result = await query;
    
    res.json(result);
  } catch (error) {
    console.error('Errore nel recupero dei report:', error);
    res.status(500).json({ message: 'Errore nel recupero dei report', error: error.message });
  }
}

// Ottiene i dettagli di un report specifico
export async function getReportById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const reportId = parseInt(id);
    
    if (isNaN(reportId)) {
      return res.status(400).json({ message: 'ID report non valido' });
    }
    
    // Recupera il report base
    const reportResult = await db.select().from(reports).where(eq(reports.id, reportId));
    
    if (reportResult.length === 0) {
      return res.status(404).json({ message: 'Report non trovato' });
    }
    
    const report = reportResult[0];
    let additionalData = null;
    
    // Recupera dati specifici in base al tipo di report
    if (report.type === 'sales') {
      const salesReportResult = await db.select().from(salesReports).where(eq(salesReports.reportId, reportId));
      if (salesReportResult.length > 0) {
        additionalData = salesReportResult[0];
      }
    } else if (report.type === 'delivery') {
      const deliveryReportResult = await db.select().from(deliveryReports).where(eq(deliveryReports.reportId, reportId));
      if (deliveryReportResult.length > 0) {
        additionalData = deliveryReportResult[0];
        
        // Recupera anche i dati del cliente e dell'ordine
        if (additionalData.clientId) {
          const clientResult = await db.select().from(clients).where(eq(clients.id, additionalData.clientId));
          if (clientResult.length > 0) {
            additionalData.client = clientResult[0];
          }
        }
        
        if (additionalData.orderId) {
          const orderResult = await db.select().from(orders).where(eq(orders.id, additionalData.orderId));
          if (orderResult.length > 0) {
            additionalData.order = orderResult[0];
          }
        }
      }
    }
    
    // Costruisci la risposta
    const response = {
      ...report,
      additionalData
    };
    
    res.json(response);
  } catch (error) {
    console.error('Errore nel recupero del report:', error);
    res.status(500).json({ message: 'Errore nel recupero del report', error: error.message });
  }
}

// Genera un report di vendita
export async function generateSalesReport(req: Request, res: Response) {
  try {
    const { title, description, startDate, endDate, format = 'pdf' } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'I parametri startDate e endDate sono obbligatori' });
    }
    
    // Crea un nuovo report
    const report = {
      title: title || `Report Vendite ${startDate} - ${endDate}`,
      description: description || `Report delle vendite dal ${startDate} al ${endDate}`,
      type: 'sales',
      format,
      parameters: {
        startDate,
        endDate
      },
      startDate,
      endDate,
      status: 'processing',
      generatedBy: req.user?.id // Assumendo che req.user contenga l'utente autenticato
    };
    
    // Validazione con Zod
    const validatedReport = insertReportSchema.parse(report);
    
    // Inserisci il report nel database
    const [createdReport] = await db.insert(reports).values(validatedReport).returning();
    
    if (!createdReport) {
      return res.status(500).json({ message: 'Errore nella creazione del report' });
    }
    
    // Avvia la generazione del report in modo asincrono
    generateSalesReportAsync(createdReport.id, startDate, endDate)
      .then(() => console.log(`Report di vendita ${createdReport.id} generato con successo`))
      .catch(error => console.error(`Errore nella generazione del report ${createdReport.id}:`, error));
    
    res.status(202).json({
      message: 'Generazione del report avviata',
      reportId: createdReport.id
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Dati del report non validi', 
        errors: error.errors 
      });
    }
    
    console.error('Errore nell\'avvio della generazione del report:', error);
    res.status(500).json({ message: 'Errore nell\'avvio della generazione del report', error: error.message });
  }
}

// Funzione asincrona per generare il report di vendita
async function generateSalesReportAsync(reportId: number, startDate: string, endDate: string) {
  try {
    // Recupera tutti gli ordini nel periodo specificato
    const ordersInPeriod = await db
      .select()
      .from(orders)
      .where(
        and(
          gte(orders.orderDate, startDate),
          lte(orders.orderDate, endDate),
          // Considera solo gli ordini completati o consegnati
          inArray(orders.status, ['completed', 'delivered'])
        )
      );
    
    if (ordersInPeriod.length === 0) {
      await updateReportStatus(reportId, 'completed', 'Nessun ordine trovato nel periodo specificato');
      return;
    }
    
    // Calcola statistiche di vendita
    const totalSales = ordersInPeriod.reduce(
      (sum, order) => sum + parseFloat(order.totalAmount as string),
      0
    );
    
    const totalVat = ordersInPeriod.reduce(
      (sum, order) => sum + parseFloat(order.vatAmount as string),
      0
    );
    
    const totalOrders = ordersInPeriod.length;
    
    const completedOrders = ordersInPeriod.filter(order => order.status === 'completed').length;
    const deliveredOrders = ordersInPeriod.filter(order => order.status === 'delivered').length;
    const cancelledOrders = ordersInPeriod.filter(order => order.status === 'cancelled').length;
    
    // Calcola l'importo medio degli ordini
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
    
    // Identifica il cliente con più ordini/acquisti
    const clientOrders = ordersInPeriod.reduce((acc, order) => {
      const clientId = order.clientId;
      acc[clientId] = acc[clientId] || { count: 0, total: 0 };
      acc[clientId].count++;
      acc[clientId].total += parseFloat(order.totalAmount as string);
      return acc;
    }, {} as Record<number, { count: number, total: number }>);
    
    let topClientId = null;
    let maxTotal = 0;
    
    for (const [clientId, data] of Object.entries(clientOrders)) {
      if (data.total > maxTotal) {
        maxTotal = data.total;
        topClientId = parseInt(clientId);
      }
    }
    
    // Crea o aggiorna il record di report di vendita
    const salesReportData = {
      reportId,
      startDate,
      endDate,
      totalSales: totalSales.toFixed(2),
      totalVat: totalVat.toFixed(2),
      totalOrders,
      completedOrders,
      cancelledOrders,
      topClientId,
      avgOrderValue: avgOrderValue.toFixed(2),
      metadata: {
        ordersByStatus: {
          completed: completedOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders
        }
      }
    };
    
    // Verifica se esiste già un record
    const existingSalesReport = await db
      .select({ id: salesReports.id })
      .from(salesReports)
      .where(eq(salesReports.reportId, reportId));
    
    if (existingSalesReport.length > 0) {
      // Aggiorna il record esistente
      await db
        .update(salesReports)
        .set(salesReportData)
        .where(eq(salesReports.id, existingSalesReport[0].id));
    } else {
      // Crea un nuovo record
      await db.insert(salesReports).values(salesReportData);
    }
    
    // Genera il file di report
    const fileName = `sales_report_${reportId}_${Date.now()}.json`;
    const filePath = path.join(REPORTS_DIR, fileName);
    
    // Dati per il report
    const reportData = {
      reportInfo: {
        id: reportId,
        title: `Report Vendite ${startDate} - ${endDate}`,
        generatedAt: new Date().toISOString(),
        period: { startDate, endDate }
      },
      summary: {
        totalSales,
        totalVat,
        totalOrders,
        completedOrders,
        deliveredOrders,
        cancelledOrders,
        avgOrderValue
      },
      orders: ordersInPeriod
    };
    
    // Scrivi il file
    fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2));
    
    // Aggiorna il record del report
    await db
      .update(reports)
      .set({
        status: 'completed',
        filePath,
        fileSize: fs.statSync(filePath).size,
        completedAt: new Date()
      })
      .where(eq(reports.id, reportId));
    
  } catch (error) {
    console.error('Errore nella generazione del report di vendita:', error);
    await updateReportStatus(reportId, 'failed', error.message);
  }
}

// Genera un report di consegna
export async function generateDeliveryReport(req: Request, res: Response) {
  try {
    const { 
      title, description, orderId, clientId, deliveryDate, 
      totalItems, totalWeight, transportInfo, notes, format = 'pdf' 
    } = req.body;
    
    if (!orderId || !clientId) {
      return res.status(400).json({ message: 'I parametri orderId e clientId sono obbligatori' });
    }
    
    // Verifica che l'ordine esista
    const orderExists = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.id, orderId));
    
    if (orderExists.length === 0) {
      return res.status(404).json({ message: 'Ordine non trovato' });
    }
    
    // Verifica che il cliente esista
    const clientExists = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.id, clientId));
    
    if (clientExists.length === 0) {
      return res.status(404).json({ message: 'Cliente non trovato' });
    }
    
    // Crea un nuovo report
    const report = {
      title: title || `DDT Ordine #${orderId}`,
      description: description || `Documento di trasporto per l'ordine #${orderId}`,
      type: 'delivery',
      format,
      parameters: {
        orderId,
        clientId,
        deliveryDate
      },
      status: 'processing',
      generatedBy: req.user?.id // Assumendo che req.user contenga l'utente autenticato
    };
    
    // Validazione con Zod
    const validatedReport = insertReportSchema.parse(report);
    
    // Inserisci il report nel database
    const [createdReport] = await db.insert(reports).values(validatedReport).returning();
    
    if (!createdReport) {
      return res.status(500).json({ message: 'Errore nella creazione del report' });
    }
    
    // Crea i dati del report di consegna
    const deliveryReportData = {
      reportId: createdReport.id,
      orderId,
      clientId,
      deliveryDate: deliveryDate || new Date().toISOString().slice(0, 10),
      totalItems,
      totalWeight,
      transportInfo,
      notes
    };
    
    // Validazione con Zod
    const validatedDeliveryReport = insertDeliveryReportSchema.parse(deliveryReportData);
    
    // Inserisci i dati del report di consegna
    await db.insert(deliveryReports).values(validatedDeliveryReport);
    
    // Avvia la generazione del report in modo asincrono
    generateDeliveryReportAsync(createdReport.id, orderId, clientId)
      .then(() => console.log(`Report di consegna ${createdReport.id} generato con successo`))
      .catch(error => console.error(`Errore nella generazione del report ${createdReport.id}:`, error));
    
    res.status(202).json({
      message: 'Generazione del report avviata',
      reportId: createdReport.id
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Dati del report non validi', 
        errors: error.errors 
      });
    }
    
    console.error('Errore nell\'avvio della generazione del report:', error);
    res.status(500).json({ message: 'Errore nell\'avvio della generazione del report', error: error.message });
  }
}

// Funzione asincrona per generare il report di consegna
async function generateDeliveryReportAsync(reportId: number, orderId: number, clientId: number) {
  try {
    // Recupera i dati dell'ordine
    const orderResult = await db.select().from(orders).where(eq(orders.id, orderId));
    
    if (orderResult.length === 0) {
      await updateReportStatus(reportId, 'failed', 'Ordine non trovato');
      return;
    }
    
    const order = orderResult[0];
    
    // Recupera i dati del cliente
    const clientResult = await db.select().from(clients).where(eq(clients.id, clientId));
    
    if (clientResult.length === 0) {
      await updateReportStatus(reportId, 'failed', 'Cliente non trovato');
      return;
    }
    
    const client = clientResult[0];
    
    // Recupera le voci dell'ordine
    const orderItemsResult = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    
    // Calcola il totale degli articoli e il peso totale
    const totalItems = orderItemsResult.length;
    const totalWeight = orderItemsResult.reduce(
      (sum, item) => sum + parseFloat(item.quantity as string),
      0
    );
    
    // Aggiorna il record di consegna con i dati calcolati
    await db
      .update(deliveryReports)
      .set({
        totalItems,
        totalWeight: totalWeight.toFixed(3)
      })
      .where(eq(deliveryReports.reportId, reportId));
    
    // Genera il file di report
    const fileName = `delivery_report_${reportId}_${Date.now()}.json`;
    const filePath = path.join(REPORTS_DIR, fileName);
    
    // Dati per il report
    const reportData = {
      reportInfo: {
        id: reportId,
        title: `DDT Ordine #${orderId}`,
        generatedAt: new Date().toISOString()
      },
      order,
      client,
      items: orderItemsResult,
      deliveryInfo: {
        totalItems,
        totalWeight,
        deliveryDate: order.actualDeliveryDate || new Date().toISOString().slice(0, 10)
      }
    };
    
    // Scrivi il file
    fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2));
    
    // Aggiorna il record del report
    await db
      .update(reports)
      .set({
        status: 'completed',
        filePath,
        fileSize: fs.statSync(filePath).size,
        completedAt: new Date()
      })
      .where(eq(reports.id, reportId));
    
    // Se l'ordine non è ancora stato segnato come consegnato, aggiornalo
    if (order.status !== 'delivered' && order.status !== 'completed') {
      await db
        .update(orders)
        .set({
          status: 'delivered',
          actualDeliveryDate: order.actualDeliveryDate || new Date().toISOString().slice(0, 10),
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId));
    }
    
  } catch (error) {
    console.error('Errore nella generazione del report di consegna:', error);
    await updateReportStatus(reportId, 'failed', error.message);
  }
}

// Funzione di utility per aggiornare lo stato di un report
async function updateReportStatus(reportId: number, status: 'pending' | 'processing' | 'completed' | 'failed', error?: string) {
  try {
    const updateData: any = {
      status,
      updatedAt: new Date()
    };
    
    if (status === 'completed') {
      updateData.completedAt = new Date();
    }
    
    if (error) {
      updateData.error = error;
    }
    
    await db
      .update(reports)
      .set(updateData)
      .where(eq(reports.id, reportId));
  } catch (updateError) {
    console.error(`Errore nell'aggiornamento dello stato del report ${reportId}:`, updateError);
  }
}

// Scarica un report
export async function downloadReport(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const reportId = parseInt(id);
    
    if (isNaN(reportId)) {
      return res.status(400).json({ message: 'ID report non valido' });
    }
    
    // Recupera il report
    const reportResult = await db.select().from(reports).where(eq(reports.id, reportId));
    
    if (reportResult.length === 0) {
      return res.status(404).json({ message: 'Report non trovato' });
    }
    
    const report = reportResult[0];
    
    // Verifica che il report sia completato
    if (report.status !== 'completed') {
      return res.status(400).json({ 
        message: `Il report non è pronto per il download (stato attuale: ${report.status})` 
      });
    }
    
    // Verifica che il file esista
    if (!report.filePath || !fs.existsSync(report.filePath)) {
      return res.status(404).json({ message: 'File del report non trovato' });
    }
    
    // Determina il tipo di contenuto in base al formato
    let contentType = 'application/octet-stream';
    switch (report.format) {
      case 'pdf':
        contentType = 'application/pdf';
        break;
      case 'excel':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case 'csv':
        contentType = 'text/csv';
        break;
      case 'json':
        contentType = 'application/json';
        break;
      case 'html':
        contentType = 'text/html';
        break;
    }
    
    // Imposta gli header della risposta
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename=${path.basename(report.filePath)}`);
    
    // Invia il file
    const fileStream = fs.createReadStream(report.filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Errore nel download del report:', error);
    res.status(500).json({ message: 'Errore nel download del report', error: error.message });
  }
}

// Elimina un report
export async function deleteReport(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const reportId = parseInt(id);
    
    if (isNaN(reportId)) {
      return res.status(400).json({ message: 'ID report non valido' });
    }
    
    // Recupera il report
    const reportResult = await db.select().from(reports).where(eq(reports.id, reportId));
    
    if (reportResult.length === 0) {
      return res.status(404).json({ message: 'Report non trovato' });
    }
    
    const report = reportResult[0];
    
    // Elimina il file se esiste
    if (report.filePath && fs.existsSync(report.filePath)) {
      fs.unlinkSync(report.filePath);
    }
    
    // Usa una transazione per eliminare i dati correlati
    await db.transaction(async (tx) => {
      // Elimina report specifici in base al tipo
      if (report.type === 'sales') {
        await tx.delete(salesReports).where(eq(salesReports.reportId, reportId));
      } else if (report.type === 'delivery') {
        await tx.delete(deliveryReports).where(eq(deliveryReports.reportId, reportId));
      }
      
      // Elimina il report principale
      await tx.delete(reports).where(eq(reports.id, reportId));
    });
    
    res.json({ message: 'Report eliminato con successo' });
  } catch (error) {
    console.error('Errore nell\'eliminazione del report:', error);
    res.status(500).json({ message: 'Errore nell\'eliminazione del report', error: error.message });
  }
}