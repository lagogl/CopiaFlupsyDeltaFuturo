import { Request, Response } from 'express';
import { db } from '../db';
import { 
  reports, 
  salesReports, 
  deliveryReports, 
  reportTemplates,
  orders,
  orderItems,
  clients,
  insertReportSchema,
  insertSalesReportSchema,
  insertDeliveryReportSchema,
  insertReportTemplateSchema
} from '../../shared/schema';

// Estendi l'interfaccia Request per includere l'utente
interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    role: string;
  }
}
import { eq, like, desc, count, sql, or, and, not, asc, inArray, isNull, isNotNull, between } from 'drizzle-orm';
import { fromZodError } from 'zod-validation-error';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Controller per la gestione dei report
 */
export class ReportController {
  /**
   * Directory in cui vengono salvati i report generati
   */
  private static REPORTS_DIR = path.join(process.cwd(), 'reports');

  /**
   * Inizializza la directory dei report se non esiste
   */
  private static initReportsDir() {
    if (!fs.existsSync(ReportController.REPORTS_DIR)) {
      fs.mkdirSync(ReportController.REPORTS_DIR, { recursive: true });
    }
  }

  /**
   * Ottiene l'elenco di tutti i report
   */
  static async getReports(req: Request, res: Response) {
    try {
      const { type, status, startDate, endDate } = req.query;
      
      // Query di base con join per ottenere il nome dell'utente che ha generato il report
      let query = db.select({
        id: reports.id,
        title: reports.title,
        type: reports.type,
        format: reports.format,
        status: reports.status,
        createdAt: reports.createdAt,
        completedAt: reports.completedAt,
        startDate: reports.startDate,
        endDate: reports.endDate,
        filePath: reports.filePath
      })
      .from(reports)
      .orderBy(desc(reports.createdAt));
      
      // Applicazione dei filtri
      const filters = [];
      
      // Filtro per tipo di report
      if (type && typeof type === 'string') {
        filters.push(eq(reports.type, type));
      }
      
      // Filtro per stato del report
      if (status && typeof status === 'string') {
        filters.push(eq(reports.status, status));
      }
      
      // Filtro per data di inizio periodo
      if (startDate && typeof startDate === 'string') {
        filters.push(sql`${reports.createdAt} >= ${startDate}`);
      }
      
      // Filtro per data di fine periodo
      if (endDate && typeof endDate === 'string') {
        filters.push(sql`${reports.createdAt} <= ${endDate}`);
      }
      
      // Applica tutti i filtri se presenti
      const finalQuery = filters.length > 0 
        ? query.where(and(...filters))
        : query;
      
      const result = await finalQuery;
      res.json(result);
    } catch (error) {
      console.error('Errore nel recupero dei report:', error);
      res.status(500).json({ message: 'Errore nel recupero dei report' });
    }
  }

  /**
   * Ottiene un report specifico con tutti i dettagli
   */
  static async getReportById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const reportId = parseInt(id, 10);

      if (isNaN(reportId)) {
        return res.status(400).json({ message: 'ID report non valido' });
      }

      // Recupera i dati del report
      const [reportData] = await db.select()
        .from(reports)
        .where(eq(reports.id, reportId));

      if (!reportData) {
        return res.status(404).json({ message: 'Report non trovato' });
      }

      // In base al tipo di report, recupera dati specifici
      let specificReport = null;
      if (reportData.type === 'sales') {
        const [salesReportData] = await db.select()
          .from(salesReports)
          .where(eq(salesReports.reportId, reportId));
        specificReport = salesReportData;
      } else if (reportData.type === 'delivery') {
        const [deliveryReportData] = await db.select()
          .from(deliveryReports)
          .where(eq(deliveryReports.reportId, reportId));
        specificReport = deliveryReportData;
      }

      // Componi la risposta completa
      const response = {
        ...reportData,
        specificData: specificReport
      };

      res.json(response);
    } catch (error) {
      console.error('Errore nel recupero del report:', error);
      res.status(500).json({ message: 'Errore nel recupero del report' });
    }
  }

  /**
   * Ottiene il file del report
   */
  static async getReportFile(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const reportId = parseInt(id, 10);

      if (isNaN(reportId)) {
        return res.status(400).json({ message: 'ID report non valido' });
      }

      // Recupera i dati del report
      const [reportData] = await db.select()
        .from(reports)
        .where(eq(reports.id, reportId));

      if (!reportData) {
        return res.status(404).json({ message: 'Report non trovato' });
      }

      if (!reportData.filePath) {
        return res.status(404).json({ message: 'File del report non trovato' });
      }

      // Verifica se il file esiste
      const filePath = reportData.filePath;
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'File del report non trovato sul server' });
      }

      // Determina il tipo di contenuto in base al formato del report
      let contentType = 'application/octet-stream';
      if (reportData.format === 'pdf') {
        contentType = 'application/pdf';
      } else if (reportData.format === 'excel') {
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (reportData.format === 'csv') {
        contentType = 'text/csv';
      } else if (reportData.format === 'json') {
        contentType = 'application/json';
      } else if (reportData.format === 'html') {
        contentType = 'text/html';
      }

      // Invia il file
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename=${path.basename(filePath)}`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('Errore nel recupero del file del report:', error);
      res.status(500).json({ message: 'Errore nel recupero del file del report' });
    }
  }

  /**
   * Genera un nuovo report di vendita
   */
  static async generateSalesReport(req: AuthRequest, res: Response) {
    try {
      ReportController.initReportsDir();
      
      const { title, format, startDate, endDate, parameters } = req.body;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Le date di inizio e fine sono obbligatorie' });
      }
      
      // Validazione dei dati del report
      const reportData = {
        title: title || `Report vendite ${startDate} - ${endDate}`,
        description: `Report vendite dal ${startDate} al ${endDate}`,
        type: 'sales',
        format: format || 'pdf',
        parameters: parameters || {},
        startDate,
        endDate,
        status: 'processing',
        generatedBy: req.user?.id
      };
      
      const validatedReport = insertReportSchema.safeParse(reportData);
      if (!validatedReport.success) {
        const validationError = fromZodError(validatedReport.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      // Crea il report nel database
      const [newReport] = await db.insert(reports)
        .values(validatedReport.data)
        .returning();
      
      // Raccoglie i dati per il report
      const salesData = await ReportController.collectSalesData(startDate, endDate);
      
      // Crea i dati specifici del report vendite
      const salesReportData = {
        reportId: newReport.id,
        startDate,
        endDate,
        totalSales: salesData.totalSales,
        totalVat: salesData.totalVat,
        totalOrders: salesData.totalOrders,
        completedOrders: salesData.completedOrders,
        cancelledOrders: salesData.cancelledOrders,
        topSizeId: salesData.topSizeId,
        topLotId: salesData.topLotId,
        topClientId: salesData.topClientId,
        totalWeight: salesData.totalWeight,
        avgOrderValue: salesData.avgOrderValue,
        metadata: { detailedData: salesData.detailedData }
      };
      
      const validatedSalesReport = insertSalesReportSchema.safeParse(salesReportData);
      if (!validatedSalesReport.success) {
        const validationError = fromZodError(validatedSalesReport.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      // Inserisci i dati specifici del report vendite
      const [newSalesReport] = await db.insert(salesReports)
        .values(validatedSalesReport.data)
        .returning();
      
      // Genera il file del report (simulato per ora)
      const fileName = `sales_report_${newReport.id}_${new Date().getTime()}.${format}`;
      const filePath = path.join(ReportController.REPORTS_DIR, fileName);
      
      // Qui dovrebbe andare la logica di generazione del file
      // Per ora generiamo un file JSON di esempio
      const jsonData = {
        reportInfo: newReport,
        salesData: salesData
      };
      
      // Scriviamo i dati su file
      fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
      
      // Aggiorna il report con il percorso del file e lo stato
      const [updatedReport] = await db.update(reports)
        .set({
          filePath,
          fileSize: fs.statSync(filePath).size,
          status: 'completed',
          completedAt: new Date()
        })
        .where(eq(reports.id, newReport.id))
        .returning();
      
      // Restituisci il report completato
      res.status(201).json({
        ...updatedReport,
        salesReport: newSalesReport
      });
    } catch (error) {
      console.error('Errore nella generazione del report vendite:', error);
      res.status(500).json({ message: 'Errore nella generazione del report vendite' });
    }
  }

  /**
   * Raccoglie i dati per il report di vendita
   */
  private static async collectSalesData(startDate: string, endDate: string) {
    try {
      // Filtro per il periodo
      const dateFilter = and(
        sql`${orders.orderDate} >= ${startDate}`,
        sql`${orders.orderDate} <= ${endDate}`
      );
      
      // Conteggio totale degli ordini nel periodo
      const [totalOrdersResult] = await db
        .select({ count: count() })
        .from(orders)
        .where(dateFilter);
      
      const totalOrders = totalOrdersResult.count;
      
      // Ordini completati
      const [completedOrdersResult] = await db
        .select({ count: count() })
        .from(orders)
        .where(and(
          dateFilter,
          eq(orders.status, 'completed')
        ));
      
      const completedOrders = completedOrdersResult.count;
      
      // Ordini annullati
      const [cancelledOrdersResult] = await db
        .select({ count: count() })
        .from(orders)
        .where(and(
          dateFilter,
          eq(orders.status, 'cancelled')
        ));
      
      const cancelledOrders = cancelledOrdersResult.count;
      
      // Importo totale vendite
      const [totalSalesResult] = await db
        .select({
          totalSales: sql`SUM(${orders.totalAmount})`,
          totalVat: sql`SUM(${orders.vatAmount})`
        })
        .from(orders)
        .where(and(
          dateFilter,
          not(eq(orders.status, 'cancelled'))
        ));
      
      const totalSales = Number(totalSalesResult.totalSales || 0);
      const totalVat = Number(totalSalesResult.totalVat || 0);
      
      // Valore medio ordini
      const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
      
      // Peso totale venduto
      const [totalWeightResult] = await db
        .select({
          totalWeight: sql`SUM(${orderItems.quantity})`
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(and(
          dateFilter,
          not(eq(orders.status, 'cancelled'))
        ));
      
      const totalWeight = Number(totalWeightResult.totalWeight || 0);
      
      // Cliente con più acquisti
      const clientPurchases = await db
        .select({
          clientId: orders.clientId,
          total: sql`SUM(${orders.totalAmount})`,
          count: count()
        })
        .from(orders)
        .where(and(
          dateFilter,
          not(eq(orders.status, 'cancelled'))
        ))
        .groupBy(orders.clientId)
        .orderBy(desc(sql`SUM(${orders.totalAmount})`))
        .limit(1);
      
      const topClientId = clientPurchases.length > 0 ? clientPurchases[0].clientId : null;
      
      // Top taglia e lotto più venduti (se applicabile)
      const topSize = await db
        .select({
          sizeId: orderItems.sizeId,
          count: count(),
          totalQuantity: sql`SUM(${orderItems.quantity})`
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(and(
          dateFilter,
          not(eq(orders.status, 'cancelled')),
          isNotNull(orderItems.sizeId)
        ))
        .groupBy(orderItems.sizeId)
        .orderBy(desc(sql`SUM(${orderItems.quantity})`))
        .limit(1);
      
      const topSizeId = topSize.length > 0 ? topSize[0].sizeId : null;
      
      const topLot = await db
        .select({
          lotId: orderItems.lotId,
          count: count(),
          totalQuantity: sql`SUM(${orderItems.quantity})`
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(and(
          dateFilter,
          not(eq(orders.status, 'cancelled')),
          isNotNull(orderItems.lotId)
        ))
        .groupBy(orderItems.lotId)
        .orderBy(desc(sql`SUM(${orderItems.quantity})`))
        .limit(1);
      
      const topLotId = topLot.length > 0 ? topLot[0].lotId : null;
      
      // Dati dettagliati per il report
      const detailedData = {
        orders: await db
          .select({
            id: orders.id,
            orderNumber: orders.orderNumber,
            clientId: orders.clientId,
            clientName: clients.name,
            orderDate: orders.orderDate,
            status: orders.status,
            totalAmount: orders.totalAmount,
            vatAmount: orders.vatAmount
          })
          .from(orders)
          .leftJoin(clients, eq(orders.clientId, clients.id))
          .where(dateFilter)
          .orderBy(desc(orders.orderDate)),
        
        clientSummary: await db
          .select({
            clientId: orders.clientId,
            clientName: clients.name,
            orderCount: count(),
            totalAmount: sql`SUM(${orders.totalAmount})`
          })
          .from(orders)
          .leftJoin(clients, eq(orders.clientId, clients.id))
          .where(and(
            dateFilter,
            not(eq(orders.status, 'cancelled'))
          ))
          .groupBy(orders.clientId, clients.name)
          .orderBy(desc(sql`SUM(${orders.totalAmount})`))
      };
      
      return {
        totalOrders,
        completedOrders,
        cancelledOrders,
        totalSales,
        totalVat,
        avgOrderValue,
        totalWeight,
        topClientId,
        topSizeId,
        topLotId,
        detailedData
      };
    } catch (error) {
      console.error('Errore nella raccolta dei dati di vendita:', error);
      throw error;
    }
  }

  /**
   * Genera un nuovo report di consegna
   */
  static async generateDeliveryReport(req: AuthRequest, res: Response) {
    try {
      ReportController.initReportsDir();
      
      const { title, format, orderId, deliveryDate, parameters } = req.body;
      
      if (!orderId) {
        return res.status(400).json({ message: 'ID ordine obbligatorio' });
      }
      
      // Ottieni i dati dell'ordine
      const [orderData] = await db.select({
        ...orders,
        clientName: clients.name
      })
      .from(orders)
      .leftJoin(clients, eq(orders.clientId, clients.id))
      .where(eq(orders.id, orderId));
      
      if (!orderData) {
        return res.status(404).json({ message: 'Ordine non trovato' });
      }
      
      // Ottieni gli articoli dell'ordine
      const orderItemsData = await db.select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));
      
      // Calcola il numero totale di articoli e il peso totale
      const totalItems = orderItemsData.length;
      const totalWeight = orderItemsData.reduce((sum, item) => sum + Number(item.quantity), 0);
      
      // Validazione dei dati del report
      const reportData = {
        title: title || `DDT ordine ${orderData.orderNumber}`,
        description: `Documento di trasporto per l'ordine ${orderData.orderNumber}`,
        type: 'delivery',
        format: format || 'pdf',
        parameters: parameters || {},
        status: 'processing',
        generatedBy: req.user?.id
      };
      
      const validatedReport = insertReportSchema.safeParse(reportData);
      if (!validatedReport.success) {
        const validationError = fromZodError(validatedReport.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      // Crea il report nel database
      const [newReport] = await db.insert(reports)
        .values(validatedReport.data)
        .returning();
      
      // Crea i dati specifici del report di consegna
      const deliveryReportData = {
        reportId: newReport.id,
        orderId,
        clientId: orderData.clientId,
        deliveryDate: deliveryDate || new Date().toISOString().split('T')[0],
        totalItems,
        totalWeight,
        transportInfo: parameters?.transportInfo || '',
        notes: parameters?.notes || '',
        signedBy: parameters?.signedBy || '',
        metadata: { items: orderItemsData }
      };
      
      const validatedDeliveryReport = insertDeliveryReportSchema.safeParse(deliveryReportData);
      if (!validatedDeliveryReport.success) {
        const validationError = fromZodError(validatedDeliveryReport.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      // Inserisci i dati specifici del report di consegna
      const [newDeliveryReport] = await db.insert(deliveryReports)
        .values(validatedDeliveryReport.data)
        .returning();
      
      // Genera il file del report (simulato per ora)
      const fileName = `delivery_report_${newReport.id}_${new Date().getTime()}.${format}`;
      const filePath = path.join(ReportController.REPORTS_DIR, fileName);
      
      // Qui dovrebbe andare la logica di generazione del file
      // Per ora generiamo un file JSON di esempio
      const jsonData = {
        reportInfo: newReport,
        orderData: orderData,
        items: orderItemsData,
        deliveryInfo: newDeliveryReport
      };
      
      // Scriviamo i dati su file
      fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2));
      
      // Aggiorna il report con il percorso del file e lo stato
      const [updatedReport] = await db.update(reports)
        .set({
          filePath,
          fileSize: fs.statSync(filePath).size,
          status: 'completed',
          completedAt: new Date()
        })
        .where(eq(reports.id, newReport.id))
        .returning();
      
      // Se l'ordine non ha ancora una data di consegna effettiva, aggiornala
      if (!orderData.actualDeliveryDate) {
        await db.update(orders)
          .set({
            actualDeliveryDate: deliveryDate || new Date().toISOString().split('T')[0],
            status: orderData.status === 'ready' ? 'shipped' : orderData.status,
            updatedAt: new Date()
          })
          .where(eq(orders.id, orderId));
      }
      
      // Restituisci il report completato
      res.status(201).json({
        ...updatedReport,
        deliveryReport: newDeliveryReport
      });
    } catch (error) {
      console.error('Errore nella generazione del report di consegna:', error);
      res.status(500).json({ message: 'Errore nella generazione del report di consegna' });
    }
  }

  /**
   * Elimina un report
   */
  static async deleteReport(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const reportId = parseInt(id, 10);

      if (isNaN(reportId)) {
        return res.status(400).json({ message: 'ID report non valido' });
      }

      // Verifica che il report esista e ottieni il percorso del file
      const [reportData] = await db.select()
        .from(reports)
        .where(eq(reports.id, reportId));

      if (!reportData) {
        return res.status(404).json({ message: 'Report non trovato' });
      }

      // Se esiste il file, eliminalo
      if (reportData.filePath && fs.existsSync(reportData.filePath)) {
        fs.unlinkSync(reportData.filePath);
      }

      // Elimina i dati specifici del report in base al tipo
      if (reportData.type === 'sales') {
        await db.delete(salesReports)
          .where(eq(salesReports.reportId, reportId));
      } else if (reportData.type === 'delivery') {
        await db.delete(deliveryReports)
          .where(eq(deliveryReports.reportId, reportId));
      }

      // Elimina il report principale
      const [deletedReport] = await db.delete(reports)
        .where(eq(reports.id, reportId))
        .returning();

      res.json(deletedReport);
    } catch (error) {
      console.error('Errore nell\'eliminazione del report:', error);
      res.status(500).json({ message: 'Errore nell\'eliminazione del report' });
    }
  }

  /**
   * Ottiene l'elenco dei modelli di report
   */
  static async getReportTemplates(req: Request, res: Response) {
    try {
      const { type } = req.query;
      
      let query = db.select()
        .from(reportTemplates)
        .where(eq(reportTemplates.active, true))
        .orderBy(desc(reportTemplates.isDefault), asc(reportTemplates.name));
      
      // Filtro per tipo di report
      if (type && typeof type === 'string') {
        query = query.where(eq(reportTemplates.type, type));
      }
      
      const result = await query;
      res.json(result);
    } catch (error) {
      console.error('Errore nel recupero dei modelli di report:', error);
      res.status(500).json({ message: 'Errore nel recupero dei modelli di report' });
    }
  }

  /**
   * Crea un nuovo modello di report
   */
  static async createReportTemplate(req: AuthRequest, res: Response) {
    try {
      // Validazione dei dati del template
      const validatedData = insertReportTemplateSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        const validationError = fromZodError(validatedData.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      // Se è impostato come predefinito, rimuovi il flag dagli altri template dello stesso tipo
      if (validatedData.data.isDefault) {
        await db.update(reportTemplates)
          .set({ isDefault: false })
          .where(and(
            eq(reportTemplates.type, validatedData.data.type),
            eq(reportTemplates.isDefault, true)
          ));
      }
      
      // Crea il template
      const [newTemplate] = await db.insert(reportTemplates)
        .values({
          ...validatedData.data,
          createdBy: req.user?.id,
          updatedAt: new Date()
        })
        .returning();
      
      res.status(201).json(newTemplate);
    } catch (error) {
      console.error('Errore nella creazione del modello di report:', error);
      res.status(500).json({ message: 'Errore nella creazione del modello di report' });
    }
  }

  /**
   * Aggiorna un modello di report esistente
   */
  static async updateReportTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const templateId = parseInt(id, 10);

      if (isNaN(templateId)) {
        return res.status(400).json({ message: 'ID modello non valido' });
      }

      // Verifica che il template esista
      const [existingTemplate] = await db.select()
        .from(reportTemplates)
        .where(eq(reportTemplates.id, templateId));

      if (!existingTemplate) {
        return res.status(404).json({ message: 'Modello di report non trovato' });
      }

      // Validazione dei dati del template
      const validatedData = insertReportTemplateSchema.partial().safeParse(req.body);
      
      if (!validatedData.success) {
        const validationError = fromZodError(validatedData.error);
        return res.status(400).json({ message: validationError.message });
      }
      
      // Se è impostato come predefinito, rimuovi il flag dagli altri template dello stesso tipo
      if (validatedData.data.isDefault) {
        await db.update(reportTemplates)
          .set({ isDefault: false })
          .where(and(
            eq(reportTemplates.type, existingTemplate.type),
            eq(reportTemplates.isDefault, true),
            not(eq(reportTemplates.id, templateId))
          ));
      }
      
      // Aggiorna il template
      const [updatedTemplate] = await db.update(reportTemplates)
        .set({
          ...validatedData.data,
          updatedAt: new Date()
        })
        .where(eq(reportTemplates.id, templateId))
        .returning();
      
      res.json(updatedTemplate);
    } catch (error) {
      console.error('Errore nell\'aggiornamento del modello di report:', error);
      res.status(500).json({ message: 'Errore nell\'aggiornamento del modello di report' });
    }
  }

  /**
   * Elimina un modello di report
   */
  static async deleteReportTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const templateId = parseInt(id, 10);

      if (isNaN(templateId)) {
        return res.status(400).json({ message: 'ID modello non valido' });
      }

      // Verifica che il template esista
      const [existingTemplate] = await db.select()
        .from(reportTemplates)
        .where(eq(reportTemplates.id, templateId));

      if (!existingTemplate) {
        return res.status(404).json({ message: 'Modello di report non trovato' });
      }

      // Elimina il template
      const [deletedTemplate] = await db.delete(reportTemplates)
        .where(eq(reportTemplates.id, templateId))
        .returning();

      res.json(deletedTemplate);
    } catch (error) {
      console.error('Errore nell\'eliminazione del modello di report:', error);
      res.status(500).json({ message: 'Errore nell\'eliminazione del modello di report' });
    }
  }
}