import { Request, Response } from 'express';
import { db } from '../db';
import { 
  orders, 
  orderItems, 
  clients, 
  payments, 
  insertOrderSchema, 
  insertOrderItemSchema,
  insertPaymentSchema
} from '../../shared/schema';
import { eq, like, desc, count, sql, or, and, not, inArray, asc, isNull, isNotNull } from 'drizzle-orm';
import { fromZodError } from 'zod-validation-error';

/**
 * Controller per la gestione degli ordini
 */
export class OrderController {
  /**
   * Genera un nuovo numero d'ordine univoco
   */
  private static async generateOrderNumber() {
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, '0') +
      today.getDate().toString().padStart(2, '0');
    
    // Trova l'ultimo numero d'ordine con il prefisso della data odierna
    const prefix = `ORD-${dateStr}-`;
    const [lastOrder] = await db.select({ orderNumber: orders.orderNumber })
      .from(orders)
      .where(like(orders.orderNumber, `${prefix}%`))
      .orderBy(desc(orders.orderNumber))
      .limit(1);
    
    let counter = 1;
    if (lastOrder) {
      const lastCounter = parseInt(lastOrder.orderNumber.split('-')[2], 10);
      counter = isNaN(lastCounter) ? 1 : lastCounter + 1;
    }
    
    return `${prefix}${counter.toString().padStart(3, '0')}`;
  }

  /**
   * Ottiene l'elenco di tutti gli ordini
   */
  static async getOrders(req: Request, res: Response) {
    try {
      const { 
        search, 
        status, 
        clientId, 
        fromDate, 
        toDate, 
        paymentStatus 
      } = req.query;
      
      // Query di base con join su clients per ottenere il nome del cliente
      const query = db.select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        clientId: orders.clientId,
        clientName: clients.name,
        orderDate: orders.orderDate,
        status: orders.status,
        totalAmount: orders.totalAmount,
        paymentStatus: orders.paymentStatus,
        requestedDeliveryDate: orders.requestedDeliveryDate,
        actualDeliveryDate: orders.actualDeliveryDate
      })
      .from(orders)
      .leftJoin(clients, eq(orders.clientId, clients.id))
      .orderBy(desc(orders.orderDate), desc(orders.id));
      
      // Applicazione dei filtri
      const filters = [];
      
      // Filtro per stato
      if (status && typeof status === 'string') {
        filters.push(eq(orders.status, status));
      }
      
      // Filtro per cliente
      if (clientId && typeof clientId === 'string') {
        const clientIdInt = parseInt(clientId, 10);
        if (!isNaN(clientIdInt)) {
          filters.push(eq(orders.clientId, clientIdInt));
        }
      }
      
      // Filtro per data (da)
      if (fromDate && typeof fromDate === 'string') {
        filters.push(sql`${orders.orderDate} >= ${fromDate}`);
      }
      
      // Filtro per data (a)
      if (toDate && typeof toDate === 'string') {
        filters.push(sql`${orders.orderDate} <= ${toDate}`);
      }
      
      // Filtro per stato pagamento
      if (paymentStatus && typeof paymentStatus === 'string') {
        filters.push(eq(orders.paymentStatus, paymentStatus));
      }
      
      // Filtro per testo di ricerca
      if (search && typeof search === 'string') {
        const searchTerm = `%${search}%`;
        filters.push(
          or(
            like(orders.orderNumber, searchTerm),
            like(clients.name, searchTerm),
            like(orders.notes, searchTerm)
          )
        );
      }
      
      // Applica tutti i filtri se presenti
      const finalQuery = filters.length > 0 
        ? query.where(and(...filters))
        : query;
      
      const result = await finalQuery;
      res.json(result);
    } catch (error) {
      console.error('Errore nel recupero degli ordini:', error);
      res.status(500).json({ message: 'Errore nel recupero degli ordini' });
    }
  }

  /**
   * Ottiene un ordine specifico con tutti i dettagli (inclusi articoli e pagamenti)
   */
  static async getOrderById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const orderId = parseInt(id, 10);

      if (isNaN(orderId)) {
        return res.status(400).json({ message: 'ID ordine non valido' });
      }

      // Recupera i dati dell'ordine
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

      // Recupera gli articoli dell'ordine
      const orderItemsData = await db.select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      // Recupera i pagamenti dell'ordine
      const paymentsData = await db.select()
        .from(payments)
        .where(eq(payments.orderId, orderId));

      // Componi la risposta completa
      const response = {
        ...orderData,
        items: orderItemsData,
        payments: paymentsData
      };

      res.json(response);
    } catch (error) {
      console.error('Errore nel recupero dell\'ordine:', error);
      res.status(500).json({ message: 'Errore nel recupero dell\'ordine' });
    }
  }

  /**
   * Crea un nuovo ordine con articoli
   */
  static async createOrder(req: Request, res: Response) {
    try {
      const { order, items } = req.body;
      
      // Genera numero d'ordine se non fornito
      if (!order.orderNumber) {
        order.orderNumber = await OrderController.generateOrderNumber();
      }
      
      // Validazione dell'ordine
      const validatedOrder = insertOrderSchema.safeParse(order);
      if (!validatedOrder.success) {
        const validationError = fromZodError(validatedOrder.error);
        return res.status(400).json({ message: validationError.message });
      }

      // Inizia una transazione per inserire sia l'ordine che gli elementi
      // Nota: sqlite non supporta le transazioni, ma il codice è pronto per poterle usare con PostgreSQL
      const [newOrder] = await db.insert(orders)
        .values({
          ...validatedOrder.data,
          updatedAt: new Date()
        })
        .returning();
      
      // Inserisci gli articoli dell'ordine, se presenti
      const orderItemsResult = [];
      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          const validatedItem = insertOrderItemSchema.safeParse({
            ...item,
            orderId: newOrder.id
          });
          
          if (validatedItem.success) {
            const [newItem] = await db.insert(orderItems)
              .values({
                ...validatedItem.data,
                updatedAt: new Date()
              })
              .returning();
            
            orderItemsResult.push(newItem);
          } else {
            // Log dell'errore di validazione dell'elemento dell'ordine
            console.error('Errore di validazione elemento ordine:', fromZodError(validatedItem.error).message);
          }
        }
      }
      
      // Restituisci l'ordine creato con i relativi elementi
      res.status(201).json({
        ...newOrder,
        items: orderItemsResult
      });
    } catch (error) {
      console.error('Errore nella creazione dell\'ordine:', error);
      res.status(500).json({ message: 'Errore nella creazione dell\'ordine' });
    }
  }

  /**
   * Aggiorna un ordine esistente
   */
  static async updateOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const orderId = parseInt(id, 10);
      const { order } = req.body;

      if (isNaN(orderId)) {
        return res.status(400).json({ message: 'ID ordine non valido' });
      }

      // Verifica che l'ordine esista
      const [existingOrder] = await db.select()
        .from(orders)
        .where(eq(orders.id, orderId));

      if (!existingOrder) {
        return res.status(404).json({ message: 'Ordine non trovato' });
      }

      // Validazione dei dati dell'ordine
      const validatedOrder = insertOrderSchema.partial().safeParse(order);
      if (!validatedOrder.success) {
        const validationError = fromZodError(validatedOrder.error);
        return res.status(400).json({ message: validationError.message });
      }

      // Aggiorna l'ordine
      const [updatedOrder] = await db.update(orders)
        .set({
          ...validatedOrder.data,
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId))
        .returning();

      res.json(updatedOrder);
    } catch (error) {
      console.error('Errore nell\'aggiornamento dell\'ordine:', error);
      res.status(500).json({ message: 'Errore nell\'aggiornamento dell\'ordine' });
    }
  }

  /**
   * Aggiunge o aggiorna articoli di un ordine
   */
  static async updateOrderItems(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const orderId = parseInt(id, 10);
      const { items } = req.body;

      if (isNaN(orderId)) {
        return res.status(400).json({ message: 'ID ordine non valido' });
      }

      // Verifica che l'ordine esista
      const [existingOrder] = await db.select()
        .from(orders)
        .where(eq(orders.id, orderId));

      if (!existingOrder) {
        return res.status(404).json({ message: 'Ordine non trovato' });
      }

      if (!Array.isArray(items)) {
        return res.status(400).json({ message: 'Il formato degli articoli non è valido' });
      }

      const results = [];
      
      // Per ogni articolo, aggiornalo se ha un ID, altrimenti creane uno nuovo
      for (const item of items) {
        if (item.id) {
          // Articolo esistente, aggiornalo
          const itemId = parseInt(String(item.id), 10);
          if (isNaN(itemId)) continue;
          
          // Verifica che l'articolo appartenga all'ordine
          const [existingItem] = await db.select()
            .from(orderItems)
            .where(and(
              eq(orderItems.id, itemId),
              eq(orderItems.orderId, orderId)
            ));
            
          if (!existingItem) continue;
          
          // Validazione dei dati dell'articolo
          const validatedItem = insertOrderItemSchema.partial().safeParse({
            ...item,
            orderId
          });
          
          if (validatedItem.success) {
            const [updatedItem] = await db.update(orderItems)
              .set({
                ...validatedItem.data,
                updatedAt: new Date()
              })
              .where(eq(orderItems.id, itemId))
              .returning();
              
            results.push(updatedItem);
          }
        } else {
          // Nuovo articolo, crealo
          const validatedItem = insertOrderItemSchema.safeParse({
            ...item,
            orderId
          });
          
          if (validatedItem.success) {
            const [newItem] = await db.insert(orderItems)
              .values({
                ...validatedItem.data,
                updatedAt: new Date()
              })
              .returning();
              
            results.push(newItem);
          }
        }
      }
      
      // Ricalcola e aggiorna l'importo totale dell'ordine
      await OrderController.recalculateOrderTotal(orderId);
      
      res.json(results);
    } catch (error) {
      console.error('Errore nell\'aggiornamento degli articoli dell\'ordine:', error);
      res.status(500).json({ message: 'Errore nell\'aggiornamento degli articoli dell\'ordine' });
    }
  }

  /**
   * Elimina un articolo da un ordine
   */
  static async deleteOrderItem(req: Request, res: Response) {
    try {
      const { orderId, itemId } = req.params;
      const orderIdInt = parseInt(orderId, 10);
      const itemIdInt = parseInt(itemId, 10);

      if (isNaN(orderIdInt) || isNaN(itemIdInt)) {
        return res.status(400).json({ message: 'ID non validi' });
      }

      // Verifica che l'articolo appartenga all'ordine specificato
      const [existingItem] = await db.select()
        .from(orderItems)
        .where(and(
          eq(orderItems.id, itemIdInt),
          eq(orderItems.orderId, orderIdInt)
        ));

      if (!existingItem) {
        return res.status(404).json({ message: 'Articolo non trovato nell\'ordine specificato' });
      }

      // Elimina l'articolo
      const [deletedItem] = await db.delete(orderItems)
        .where(eq(orderItems.id, itemIdInt))
        .returning();

      // Ricalcola e aggiorna l'importo totale dell'ordine
      await OrderController.recalculateOrderTotal(orderIdInt);

      res.json(deletedItem);
    } catch (error) {
      console.error('Errore nell\'eliminazione dell\'articolo dell\'ordine:', error);
      res.status(500).json({ message: 'Errore nell\'eliminazione dell\'articolo dell\'ordine' });
    }
  }

  /**
   * Registra un pagamento per un ordine
   */
  static async addPayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const orderId = parseInt(id, 10);
      const payment = req.body;

      if (isNaN(orderId)) {
        return res.status(400).json({ message: 'ID ordine non valido' });
      }

      // Verifica che l'ordine esista
      const [existingOrder] = await db.select()
        .from(orders)
        .where(eq(orders.id, orderId));

      if (!existingOrder) {
        return res.status(404).json({ message: 'Ordine non trovato' });
      }

      // Validazione dei dati del pagamento
      const validatedPayment = insertPaymentSchema.safeParse({
        ...payment,
        orderId
      });
      
      if (!validatedPayment.success) {
        const validationError = fromZodError(validatedPayment.error);
        return res.status(400).json({ message: validationError.message });
      }

      // Inserimento del pagamento
      const [newPayment] = await db.insert(payments)
        .values({
          ...validatedPayment.data,
          updatedAt: new Date()
        })
        .returning();

      // Aggiorna lo stato del pagamento dell'ordine
      await OrderController.updateOrderPaymentStatus(orderId);

      res.status(201).json(newPayment);
    } catch (error) {
      console.error('Errore nella registrazione del pagamento:', error);
      res.status(500).json({ message: 'Errore nella registrazione del pagamento' });
    }
  }

  /**
   * Elimina un pagamento
   */
  static async deletePayment(req: Request, res: Response) {
    try {
      const { id, paymentId } = req.params;
      const orderId = parseInt(id, 10);
      const paymentIdInt = parseInt(paymentId, 10);

      if (isNaN(orderId) || isNaN(paymentIdInt)) {
        return res.status(400).json({ message: 'ID non validi' });
      }

      // Verifica che il pagamento appartenga all'ordine specificato
      const [existingPayment] = await db.select()
        .from(payments)
        .where(and(
          eq(payments.id, paymentIdInt),
          eq(payments.orderId, orderId)
        ));

      if (!existingPayment) {
        return res.status(404).json({ message: 'Pagamento non trovato per l\'ordine specificato' });
      }

      // Elimina il pagamento
      const [deletedPayment] = await db.delete(payments)
        .where(eq(payments.id, paymentIdInt))
        .returning();

      // Aggiorna lo stato del pagamento dell'ordine
      await OrderController.updateOrderPaymentStatus(orderId);

      res.json(deletedPayment);
    } catch (error) {
      console.error('Errore nell\'eliminazione del pagamento:', error);
      res.status(500).json({ message: 'Errore nell\'eliminazione del pagamento' });
    }
  }

  /**
   * Elimina un ordine
   */
  static async deleteOrder(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const orderId = parseInt(id, 10);

      if (isNaN(orderId)) {
        return res.status(400).json({ message: 'ID ordine non valido' });
      }

      // Verifica che l'ordine esista
      const [existingOrder] = await db.select()
        .from(orders)
        .where(eq(orders.id, orderId));

      if (!existingOrder) {
        return res.status(404).json({ message: 'Ordine non trovato' });
      }

      // Elimina tutti gli articoli dell'ordine
      await db.delete(orderItems)
        .where(eq(orderItems.orderId, orderId));

      // Elimina tutti i pagamenti dell'ordine
      await db.delete(payments)
        .where(eq(payments.orderId, orderId));

      // Elimina l'ordine
      const [deletedOrder] = await db.delete(orders)
        .where(eq(orders.id, orderId))
        .returning();

      res.json(deletedOrder);
    } catch (error) {
      console.error('Errore nell\'eliminazione dell\'ordine:', error);
      res.status(500).json({ message: 'Errore nell\'eliminazione dell\'ordine' });
    }
  }

  /**
   * Aggiorna lo stato di un ordine
   */
  static async updateOrderStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const orderId = parseInt(id, 10);
      const { status } = req.body;

      if (isNaN(orderId)) {
        return res.status(400).json({ message: 'ID ordine non valido' });
      }

      if (!status || typeof status !== 'string') {
        return res.status(400).json({ message: 'Stato non valido' });
      }

      // Verifica che l'ordine esista
      const [existingOrder] = await db.select()
        .from(orders)
        .where(eq(orders.id, orderId));

      if (!existingOrder) {
        return res.status(404).json({ message: 'Ordine non trovato' });
      }

      // Aggiorna lo stato dell'ordine
      const [updatedOrder] = await db.update(orders)
        .set({
          status,
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId))
        .returning();

      res.json(updatedOrder);
    } catch (error) {
      console.error('Errore nell\'aggiornamento dello stato dell\'ordine:', error);
      res.status(500).json({ message: 'Errore nell\'aggiornamento dello stato dell\'ordine' });
    }
  }

  /**
   * Ricalcola e aggiorna l'importo totale di un ordine
   */
  private static async recalculateOrderTotal(orderId: number) {
    try {
      // Calcola la somma degli importi degli articoli
      const [totalResult] = await db
        .select({
          total: sql`SUM(${orderItems.totalPrice})`
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));

      if (totalResult) {
        // Recupera l'ordine per ottenere le percentuali di sconto, IVA, ecc.
        const [orderData] = await db.select()
          .from(orders)
          .where(eq(orders.id, orderId));

        if (orderData) {
          // Calcola l'importo totale considerando sconti e spedizione
          let subtotal = Number(totalResult.total) || 0;
          const discountAmount = orderData.discountAmount ? Number(orderData.discountAmount) : 0;
          const shippingAmount = orderData.shippingAmount ? Number(orderData.shippingAmount) : 0;
          
          const totalAmount = subtotal - discountAmount + shippingAmount;
          
          // Calcola l'importo IVA
          const vatRate = orderData.vatRate ? Number(orderData.vatRate) : 22;
          const vatAmount = (totalAmount * vatRate) / 100;

          // Aggiorna l'ordine con i nuovi importi
          await db.update(orders)
            .set({
              totalAmount: totalAmount.toFixed(2),
              vatAmount: vatAmount.toFixed(2),
              updatedAt: new Date()
            })
            .where(eq(orders.id, orderId));
        }
      }
    } catch (error) {
      console.error('Errore nel ricalcolo dell\'importo totale dell\'ordine:', error);
    }
  }

  /**
   * Aggiorna lo stato del pagamento di un ordine in base ai pagamenti registrati
   */
  private static async updateOrderPaymentStatus(orderId: number) {
    try {
      // Ottieni l'importo totale dell'ordine
      const [orderData] = await db.select({
        totalAmount: orders.totalAmount
      })
      .from(orders)
      .where(eq(orders.id, orderId));

      if (!orderData) return;

      const totalAmount = Number(orderData.totalAmount);

      // Somma tutti i pagamenti registrati per l'ordine
      const [paymentsSum] = await db
        .select({
          sum: sql`SUM(${payments.amount})`
        })
        .from(payments)
        .where(eq(payments.orderId, orderId));

      const paidAmount = Number(paymentsSum.sum) || 0;
      
      // Determina lo stato del pagamento
      let paymentStatus = 'pending';
      if (paidAmount >= totalAmount) {
        paymentStatus = 'paid';
      } else if (paidAmount > 0) {
        paymentStatus = 'partial';
      }

      // Aggiorna lo stato del pagamento dell'ordine
      await db.update(orders)
        .set({
          paymentStatus,
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId));
    } catch (error) {
      console.error('Errore nell\'aggiornamento dello stato del pagamento dell\'ordine:', error);
    }
  }

  /**
   * Ottiene statistiche sugli ordini
   */
  static async getOrderStats(req: Request, res: Response) {
    try {
      // Parametri di filtro per periodo
      const { period } = req.query;
      let startDate: Date | null = null;
      
      // Determina la data di inizio in base al periodo richiesto
      if (period === 'week') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === 'month') {
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (period === 'year') {
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
      }
      
      let dateFilter = {};
      if (startDate) {
        dateFilter = sql`${orders.orderDate} >= ${startDate.toISOString().split('T')[0]}`;
      }
      
      // Conteggio totale ordini
      const [totalCount] = await db
        .select({ count: count() })
        .from(orders)
        .where(startDate ? dateFilter : sql`1=1`);
      
      // Conteggio per stato
      const statusCounts = await db
        .select({
          status: orders.status,
          count: count()
        })
        .from(orders)
        .where(startDate ? dateFilter : sql`1=1`)
        .groupBy(orders.status);
      
      // Importo totale vendite
      const [totalSales] = await db
        .select({
          sum: sql`SUM(${orders.totalAmount})`
        })
        .from(orders)
        .where(startDate ? dateFilter : sql`1=1`);
      
      // Conteggio per stato pagamento
      const paymentStatusCounts = await db
        .select({
          paymentStatus: orders.paymentStatus,
          count: count()
        })
        .from(orders)
        .where(startDate ? dateFilter : sql`1=1`)
        .groupBy(orders.paymentStatus);
      
      // Statistiche ordini
      const stats = {
        totalOrders: totalCount.count,
        statusBreakdown: statusCounts.reduce((acc, curr) => {
          acc[curr.status as string] = curr.count;
          return acc;
        }, {} as Record<string, number>),
        totalSales: totalSales.sum || 0,
        paymentStatusBreakdown: paymentStatusCounts.reduce((acc, curr) => {
          acc[curr.paymentStatus as string] = curr.count;
          return acc;
        }, {} as Record<string, number>)
      };
      
      res.json(stats);
    } catch (error) {
      console.error('Errore nel recupero delle statistiche ordini:', error);
      res.status(500).json({ message: 'Errore nel recupero delle statistiche ordini' });
    }
  }
}