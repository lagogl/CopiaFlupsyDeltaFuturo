// server/controllers/order-controller.ts
import { Request, Response } from 'express';
import { db } from '../db';
import { 
  orders, orderItems, clients, payments, 
  insertOrderSchema, insertOrderItemSchema, insertPaymentSchema,
  Order, OrderItem, Payment
} from '@shared/schema';
import { eq, like, ilike, and, or, desc, sql, gte, lte, isNotNull, inArray } from 'drizzle-orm';
import { z } from 'zod';

// Genera un numero d'ordine univoco (formato: ORD-YYYYMMDD-XXX)
async function generateOrderNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Trova l'ultimo numero d'ordine per oggi
  const prefix = `ORD-${dateStr}`;
  const latestOrder = await db
    .select({ orderNumber: orders.orderNumber })
    .from(orders)
    .where(like(orders.orderNumber, `${prefix}%`))
    .orderBy(desc(orders.orderNumber))
    .limit(1);
  
  let sequenceNumber = 1;
  
  if (latestOrder.length > 0) {
    const lastNumber = latestOrder[0].orderNumber.split('-')[2];
    sequenceNumber = parseInt(lastNumber) + 1;
  }
  
  // Formatta il numero sequenziale con zero-padding (es. 001, 022, 123)
  const sequenceStr = sequenceNumber.toString().padStart(3, '0');
  
  return `${prefix}-${sequenceStr}`;
}

// Ottiene la lista degli ordini con filtri e paginazione
export async function getOrders(req: Request, res: Response) {
  try {
    const {
      clientId,
      search,
      status,
      startDate,
      endDate,
      paymentStatus,
      sortBy,
      sortDirection,
      limit,
      offset
    } = req.query;
    
    // Costruisci la query di base con join al cliente
    let query = db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        clientId: orders.clientId,
        orderDate: orders.orderDate,
        status: orders.status,
        totalAmount: orders.totalAmount,
        paymentStatus: orders.paymentStatus,
        clientName: clients.name
      })
      .from(orders)
      .leftJoin(clients, eq(orders.clientId, clients.id));
    
    // Applica i filtri
    const whereConditions = [];
    
    if (clientId) {
      const clientIdNum = parseInt(clientId as string);
      if (!isNaN(clientIdNum)) {
        whereConditions.push(eq(orders.clientId, clientIdNum));
      }
    }
    
    if (search) {
      const searchTerm = `%${search}%`;
      whereConditions.push(
        or(
          ilike(orders.orderNumber, searchTerm),
          ilike(clients.name, searchTerm)
        )
      );
    }
    
    if (status) {
      if (Array.isArray(status)) {
        whereConditions.push(inArray(orders.status, status as string[]));
      } else {
        whereConditions.push(eq(orders.status, status as string));
      }
    }
    
    if (startDate) {
      whereConditions.push(gte(orders.orderDate, startDate as string));
    }
    
    if (endDate) {
      whereConditions.push(lte(orders.orderDate, endDate as string));
    }
    
    if (paymentStatus) {
      whereConditions.push(eq(orders.paymentStatus, paymentStatus as string));
    }
    
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }
    
    // Applica ordinamento
    if (sortBy && typeof sortBy === 'string') {
      const direction = sortDirection === 'desc' ? desc : undefined;
      
      // Utilizza la colonna specificata per l'ordinamento
      switch (sortBy) {
        case 'orderDate':
          query = query.orderBy(direction ? desc(orders.orderDate) : orders.orderDate);
          break;
        case 'orderNumber':
          query = query.orderBy(direction ? desc(orders.orderNumber) : orders.orderNumber);
          break;
        case 'totalAmount':
          query = query.orderBy(direction ? desc(orders.totalAmount) : orders.totalAmount);
          break;
        case 'clientName':
          query = query.orderBy(direction ? desc(clients.name) : clients.name);
          break;
        case 'status':
          query = query.orderBy(direction ? desc(orders.status) : orders.status);
          break;
        default:
          query = query.orderBy(desc(orders.orderDate));
      }
    } else {
      // Ordinamento predefinito
      query = query.orderBy(desc(orders.orderDate));
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
    console.error('Errore nel recupero degli ordini:', error);
    res.status(500).json({ message: 'Errore nel recupero degli ordini', error: error.message });
  }
}

// Ottiene il dettaglio di un ordine specifico
export async function getOrderById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const orderId = parseInt(id);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ message: 'ID ordine non valido' });
    }
    
    // Recupera l'ordine
    const orderResult = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));
    
    if (orderResult.length === 0) {
      return res.status(404).json({ message: 'Ordine non trovato' });
    }
    
    const order = orderResult[0];
    
    // Recupera il cliente
    const clientResult = await db
      .select()
      .from(clients)
      .where(eq(clients.id, order.clientId));
    
    const client = clientResult.length > 0 ? clientResult[0] : null;
    
    // Recupera le voci dell'ordine
    const orderItemsResult = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
    
    // Recupera i pagamenti
    const paymentsResult = await db
      .select()
      .from(payments)
      .where(eq(payments.orderId, orderId));
    
    // Costruisci la risposta
    const response = {
      order,
      client,
      items: orderItemsResult,
      payments: paymentsResult
    };
    
    res.json(response);
  } catch (error) {
    console.error('Errore nel recupero del dettaglio ordine:', error);
    res.status(500).json({ message: 'Errore nel recupero del dettaglio ordine', error: error.message });
  }
}

// Crea un nuovo ordine
export async function createOrder(req: Request, res: Response) {
  try {
    const { order, items, payment } = req.body;
    
    // Verifica che il cliente esista
    const clientExists = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.id, order.clientId));
    
    if (clientExists.length === 0) {
      return res.status(400).json({ message: 'Cliente non trovato' });
    }
    
    // Genera un numero d'ordine univoco
    const orderNumber = await generateOrderNumber();
    
    // Validazione con Zod
    const validatedOrder = insertOrderSchema.parse({
      ...order,
      orderNumber,
      orderDate: order.orderDate || new Date().toISOString().slice(0, 10)
    });
    
    // Usa una transazione per garantire l'integrità dei dati
    const newOrder = await db.transaction(async (tx) => {
      // Inserisci l'ordine
      const [createdOrder] = await tx
        .insert(orders)
        .values({
          ...validatedOrder,
          updatedAt: new Date()
        })
        .returning();
      
      if (!createdOrder) {
        throw new Error('Errore durante la creazione dell\'ordine');
      }
      
      // Inserisci le voci dell'ordine
      if (items && items.length > 0) {
        for (const item of items) {
          const validatedItem = insertOrderItemSchema.parse({
            ...item,
            orderId: createdOrder.id,
            totalPrice: calculateTotalPrice(item)
          });
          
          await tx
            .insert(orderItems)
            .values({
              ...validatedItem,
              updatedAt: new Date()
            });
        }
      }
      
      // Inserisci il pagamento iniziale (se presente)
      if (payment) {
        const validatedPayment = insertPaymentSchema.parse({
          ...payment,
          orderId: createdOrder.id
        });
        
        await tx
          .insert(payments)
          .values({
            ...validatedPayment,
            updatedAt: new Date()
          });
        
        // Aggiorna lo stato di pagamento dell'ordine
        if (validatedPayment.amount >= createdOrder.totalAmount) {
          await tx
            .update(orders)
            .set({ paymentStatus: 'paid', updatedAt: new Date() })
            .where(eq(orders.id, createdOrder.id));
        } else if (validatedPayment.amount > 0) {
          await tx
            .update(orders)
            .set({ paymentStatus: 'partial', updatedAt: new Date() })
            .where(eq(orders.id, createdOrder.id));
        }
      }
      
      return createdOrder;
    });
    
    // Recupera l'ordine completo con tutti i dettagli
    const result = await getOrderById({ params: { id: newOrder.id.toString() } } as Request, {
      json: (data) => {
        res.status(201).json(data);
      },
      status: () => ({ json: () => {} })
    } as unknown as Response);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Dati dell\'ordine non validi', 
        errors: error.errors 
      });
    }
    
    console.error('Errore nella creazione dell\'ordine:', error);
    res.status(500).json({ message: 'Errore nella creazione dell\'ordine', error: error.message });
  }
}

// Funzione di supporto per calcolare il prezzo totale
function calculateTotalPrice(item: any): string {
  const quantity = parseFloat(item.quantity);
  const unitPrice = parseFloat(item.unitPrice);
  
  if (isNaN(quantity) || isNaN(unitPrice)) {
    return "0";
  }
  
  return (quantity * unitPrice).toFixed(2);
}

// Aggiorna un ordine esistente
export async function updateOrder(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const orderId = parseInt(id);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ message: 'ID ordine non valido' });
    }
    
    const { order, items, deleteItems } = req.body;
    
    // Verifica che l'ordine esista
    const existingOrder = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.id, orderId));
    
    if (existingOrder.length === 0) {
      return res.status(404).json({ message: 'Ordine non trovato' });
    }
    
    // Validazione con Zod
    const validatedOrder = insertOrderSchema.parse({
      ...order,
      // Mantieni alcune proprietà originali
      orderNumber: undefined // Non permettere di modificare il numero d'ordine
    });
    
    // Usa una transazione per garantire l'integrità dei dati
    await db.transaction(async (tx) => {
      // Aggiorna l'ordine
      await tx
        .update(orders)
        .set({
          ...validatedOrder,
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId));
      
      // Elimina voci dell'ordine se richiesto
      if (deleteItems && deleteItems.length > 0) {
        await tx
          .delete(orderItems)
          .where(and(
            eq(orderItems.orderId, orderId),
            inArray(orderItems.id, deleteItems)
          ));
      }
      
      // Aggiorna o inserisci nuove voci dell'ordine
      if (items && items.length > 0) {
        for (const item of items) {
          if (item.id) {
            // Aggiorna voce esistente
            const itemId = parseInt(item.id);
            if (!isNaN(itemId)) {
              const validatedItem = insertOrderItemSchema.parse({
                ...item,
                orderId,
                totalPrice: calculateTotalPrice(item)
              });
              
              await tx
                .update(orderItems)
                .set({
                  ...validatedItem,
                  updatedAt: new Date()
                })
                .where(and(
                  eq(orderItems.id, itemId),
                  eq(orderItems.orderId, orderId)
                ));
            }
          } else {
            // Inserisci nuova voce
            const validatedItem = insertOrderItemSchema.parse({
              ...item,
              orderId,
              totalPrice: calculateTotalPrice(item)
            });
            
            await tx
              .insert(orderItems)
              .values({
                ...validatedItem,
                updatedAt: new Date()
              });
          }
        }
      }
    });
    
    // Recupera l'ordine aggiornato
    const result = await getOrderById({ params: { id } } as Request, {
      json: (data) => {
        res.json(data);
      },
      status: () => ({ json: () => {} })
    } as unknown as Response);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Dati dell\'ordine non validi', 
        errors: error.errors 
      });
    }
    
    console.error('Errore nell\'aggiornamento dell\'ordine:', error);
    res.status(500).json({ message: 'Errore nell\'aggiornamento dell\'ordine', error: error.message });
  }
}

// Aggiorna lo stato di un ordine
export async function updateOrderStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const orderId = parseInt(id);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ message: 'ID ordine non valido' });
    }
    
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Stato ordine non specificato' });
    }
    
    // Verifica che l'ordine esista
    const existingOrder = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));
    
    if (existingOrder.length === 0) {
      return res.status(404).json({ message: 'Ordine non trovato' });
    }
    
    // Aggiorna lo stato
    const result = await db
      .update(orders)
      .set({
        status,
        updatedAt: new Date(),
        // Se lo stato è "delivered" (consegnato), imposta la data di consegna effettiva
        ...(status === 'delivered' && !existingOrder[0].actualDeliveryDate ? { actualDeliveryDate: new Date().toISOString().slice(0, 10) } : {})
      })
      .where(eq(orders.id, orderId))
      .returning();
    
    res.json(result[0]);
  } catch (error) {
    console.error('Errore nell\'aggiornamento dello stato dell\'ordine:', error);
    res.status(500).json({ message: 'Errore nell\'aggiornamento dello stato dell\'ordine', error: error.message });
  }
}

// Aggiunge un pagamento a un ordine
export async function addPayment(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const orderId = parseInt(id);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ message: 'ID ordine non valido' });
    }
    
    // Verifica che l'ordine esista
    const existingOrder = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));
    
    if (existingOrder.length === 0) {
      return res.status(404).json({ message: 'Ordine non trovato' });
    }
    
    // Validazione con Zod
    const validatedPayment = insertPaymentSchema.parse({
      ...req.body,
      orderId
    });
    
    // Ottieni pagamenti esistenti
    const existingPayments = await db
      .select({
        amount: sql<string>`sum(${payments.amount})`
      })
      .from(payments)
      .where(eq(payments.orderId, orderId));
    
    const existingAmount = parseFloat(existingPayments[0]?.amount || '0');
    const newAmount = parseFloat(validatedPayment.amount);
    const totalPaid = existingAmount + newAmount;
    const totalAmount = parseFloat(existingOrder[0].totalAmount);
    
    // Determina il nuovo stato di pagamento
    let paymentStatus = 'pending';
    if (totalPaid >= totalAmount) {
      paymentStatus = 'paid';
    } else if (totalPaid > 0) {
      paymentStatus = 'partial';
    }
    
    // Usa una transazione
    await db.transaction(async (tx) => {
      // Inserisci il nuovo pagamento
      await tx
        .insert(payments)
        .values({
          ...validatedPayment,
          updatedAt: new Date()
        });
      
      // Aggiorna lo stato di pagamento dell'ordine
      await tx
        .update(orders)
        .set({
          paymentStatus,
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId));
    });
    
    // Recupera l'ordine aggiornato
    const result = await getOrderById({ params: { id } } as Request, {
      json: (data) => {
        res.json(data);
      },
      status: () => ({ json: () => {} })
    } as unknown as Response);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Dati del pagamento non validi', 
        errors: error.errors 
      });
    }
    
    console.error('Errore nell\'aggiunta del pagamento:', error);
    res.status(500).json({ message: 'Errore nell\'aggiunta del pagamento', error: error.message });
  }
}

// Cancella un ordine
export async function deleteOrder(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const orderId = parseInt(id);
    
    if (isNaN(orderId)) {
      return res.status(400).json({ message: 'ID ordine non valido' });
    }
    
    // Verifica che l'ordine esista
    const existingOrder = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));
    
    if (existingOrder.length === 0) {
      return res.status(404).json({ message: 'Ordine non trovato' });
    }
    
    // Controllo: se l'ordine è in uno stato avanzato, non permettere l'eliminazione
    const nonDeletableStatuses = ['shipped', 'delivered', 'completed'];
    if (nonDeletableStatuses.includes(existingOrder[0].status)) {
      return res.status(400).json({ 
        message: `Non è possibile eliminare un ordine in stato "${existingOrder[0].status}". Impostare lo stato su "cancelled" invece.` 
      });
    }
    
    // Elimina l'ordine in una transazione (insieme a tutte le voci e i pagamenti associati)
    await db.transaction(async (tx) => {
      // Elimina i pagamenti
      await tx.delete(payments).where(eq(payments.orderId, orderId));
      
      // Elimina le voci dell'ordine
      await tx.delete(orderItems).where(eq(orderItems.orderId, orderId));
      
      // Elimina l'ordine
      await tx.delete(orders).where(eq(orders.id, orderId));
    });
    
    res.json({ message: 'Ordine eliminato con successo', order: existingOrder[0] });
  } catch (error) {
    console.error('Errore nell\'eliminazione dell\'ordine:', error);
    res.status(500).json({ message: 'Errore nell\'eliminazione dell\'ordine', error: error.message });
  }
}

// Ottiene statistiche sugli ordini
export async function getOrderStats(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;
    
    // Costruisci le condizioni per il filtro temporale
    const whereConditions = [];
    
    if (startDate) {
      whereConditions.push(gte(orders.orderDate, startDate as string));
    }
    
    if (endDate) {
      whereConditions.push(lte(orders.orderDate, endDate as string));
    }
    
    let query = db.select().from(orders);
    if (whereConditions.length > 0) {
      query = query.where(and(...whereConditions));
    }
    
    const allOrders = await query;
    
    // Numero totale di ordini
    const totalOrders = allOrders.length;
    
    // Calcola l'importo totale
    const totalAmount = allOrders.reduce(
      (sum, order) => sum + parseFloat(order.totalAmount as string), 
      0
    ).toFixed(2);
    
    // Conteggio per stato
    const ordersByStatus = allOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Conteggio per stato di pagamento
    const ordersByPaymentStatus = allOrders.reduce((acc, order) => {
      acc[order.paymentStatus] = (acc[order.paymentStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Calcola la media dell'importo degli ordini
    const avgOrderAmount = totalOrders > 0 
      ? (parseFloat(totalAmount) / totalOrders).toFixed(2)
      : '0.00';
    
    // Risultato finale
    const stats = {
      totalOrders,
      totalAmount,
      avgOrderAmount,
      ordersByStatus,
      ordersByPaymentStatus
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Errore nel recupero delle statistiche degli ordini:', error);
    res.status(500).json({ message: 'Errore nel recupero delle statistiche degli ordini', error: error.message });
  }
}