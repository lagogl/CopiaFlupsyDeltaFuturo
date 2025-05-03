/**
 * Controller per le API di vendita esterne
 * 
 * Questo controller gestisce richieste da app esterne per:
 * 1. Consultare il database della tua app
 * 2. Creare operazioni di tipo "Vendita" che modifichino il database attuale
 */

import { Request, Response } from "express";
import { db } from "../db";
import { eq, and, isNull, desc, not, inArray } from "drizzle-orm";
import { operations, baskets, cycles, sizes, lots, operationTypes } from "@shared/schema";
import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';

// Schema di validazione per la creazione di operazioni di vendita
const externalSaleSchema = z.object({
  apiKey: z.string().min(1, "API Key è richiesta"),
  basketIds: z.array(z.number()).min(1, "Almeno un cestello deve essere specificato"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato data non valido (YYYY-MM-DD)"),
  notes: z.string().optional(),
  client: z.string().optional(),
  invoiceNumber: z.string().optional(),
  totalWeight: z.number().optional(),
  totalPrice: z.number().optional(),
  transportType: z.string().optional(),
  destination: z.string().optional(),
});

// Tipo di operazione di vendita
export type ExternalSaleOperation = z.infer<typeof externalSaleSchema>;

// Configurazione API Key (in un'implementazione reale dovresti usare una soluzione più sicura)
const API_KEYS = {
  'app-esterna': process.env.EXTERNAL_APP_API_KEY || 'chiave-test-per-sviluppo',
};

// Chiave di test da utilizzare durante lo sviluppo 
const TEST_API_KEY = 'chiave-test-per-sviluppo';

/**
 * Middleware per verificare l'API key
 */
export function verifyApiKey(req: Request, res: Response, next: Function) {
  const apiKey = req.headers['x-api-key'] || req.body.apiKey;

  // Accetta sia le chiavi configurate che la chiave di test
  if (!apiKey || 
      !(Object.values(API_KEYS).includes(apiKey as string) || apiKey === TEST_API_KEY)) {
    console.error(`Tentativo di accesso con API key non valida: ${apiKey}`);
    return res.status(401).json({
      success: false,
      message: "API Key non valida o mancante"
    });
  }

  next();
}

/**
 * Ottiene l'elenco dei cestelli disponibili per la vendita
 */
export async function getAvailableBasketsForSale(req: Request, res: Response) {
  try {
    console.log("Cercando cestelli disponibili per vendita...");

    // Semplifichiamo la query per debug
    const availableBaskets = await db
      .select({
        id: baskets.id,
        physicalNumber: baskets.physicalNumber,
        flupsyId: baskets.flupsyId,
        cycleId: baskets.currentCycleId,
        state: baskets.state,
      })
      .from(baskets)
      .where(eq(baskets.state, 'active'));
    
    console.log(`Trovati ${availableBaskets.length} cestelli attivi`);
    
    // Filtriamo solo quelli con ciclo attivo
    const basketsWithCycles = availableBaskets.filter(b => b.cycleId !== null);
    console.log(`Di cui ${basketsWithCycles.length} hanno un ciclo attivo`);

    // Arricchisci con dati aggiuntivi
    const enrichedBaskets = await Promise.all(
      basketsWithCycles.map(async (basket) => {
        try {
          // Ottieni il ciclo
          const cycle = await db
            .select()
            .from(cycles)
            .where(eq(cycles.id, basket.cycleId as number))
            .then((res) => res[0] || null);
  
          if (!cycle) {
            console.log(`Ciclo non trovato per basket ${basket.id} con cycleId ${basket.cycleId}`);
            return null;
          }

          // Ottieni l'ultima operazione con misurazioni
          const lastMeasurement = await db
            .select()
            .from(operations)
            .where(and(
              eq(operations.basketId, basket.id),
              eq(operations.cycleId, basket.cycleId as number),
            ))
            .orderBy(desc(operations.date))
            .limit(1)
            .then((res) => res[0] || null);
  
          // Ottieni il lotto associato
          let lot = null;
          if (lastMeasurement && lastMeasurement.lotId) {
            lot = await db
              .select()
              .from(lots)
              .where(eq(lots.id, lastMeasurement.lotId))
              .then((res) => res[0] || null);
          }
  
          // Ottieni la taglia attuale
          let size = null;
          if (lastMeasurement && lastMeasurement.sizeId) {
            size = await db
              .select()
              .from(sizes)
              .where(eq(sizes.id, lastMeasurement.sizeId))
              .then((res) => res[0] || null);
          }
  
          return {
            ...basket,
            cycle,
            lot,
            size,
            lastMeasurement,
          };
        } catch (err) {
          console.error(`Errore nell'arricchimento del cestello ${basket.id}:`, err);
          return null;
        }
      })
    );
    
    // Filtra eventuali null
    const validEnrichedBaskets = enrichedBaskets.filter(b => b !== null);
    console.log(`Ritornati ${validEnrichedBaskets.length} cestelli arricchiti validi`);

    res.json({
      success: true,
      baskets: enrichedBaskets,
    });
  } catch (error) {
    console.error("Errore nel recupero dei cestelli disponibili:", error);
    res.status(500).json({
      success: false,
      message: "Errore nel recupero dei cestelli disponibili",
    });
  }
}

/**
 * Crea un'operazione di vendita da app esterna
 */
export async function createExternalSaleOperation(req: Request, res: Response) {
  try {
    // Validazione dei dati
    const validationResult = externalSaleSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: "Dati non validi",
        errors: validationResult.error.errors,
      });
    }

    const saleData = validationResult.data;
    const { basketIds, date, notes, client, invoiceNumber, totalWeight, totalPrice, transportType, destination } = saleData;

    // Identificativo unico per questo gruppo di operazioni di vendita
    const transactionId = uuidv4();
    const operationDate = new Date(date);

    // Verifica che tutti i cestelli siano validi e attivi
    const basketsData = await db
      .select()
      .from(baskets)
      .where(and(
        inArray(baskets.id, basketIds),
        eq(baskets.state, 'active'),
        not(isNull(baskets.currentCycleId))
      ));

    // Verifica che tutti i cestelli richiesti siano stati trovati
    if (basketsData.length !== basketIds.length) {
      const foundIds = basketsData.map(b => b.id);
      const missingIds = basketIds.filter(id => !foundIds.includes(id));
      
      return res.status(400).json({
        success: false,
        message: "Alcuni cestelli richiesti non sono disponibili o non esistono",
        missingBaskets: missingIds,
      });
    }

    // Array per tenere traccia delle operazioni create
    const createdOperations = [];

    // Crea un'operazione di vendita per ogni cestello
    for (const basket of basketsData) {
      // Ottieni l'ultima operazione per questo cestello
      const lastOperation = await db
        .select()
        .from(operations)
        .where(and(
          eq(operations.basketId, basket.id),
          eq(operations.cycleId, basket.currentCycleId as number)
        ))
        .orderBy(desc(operations.date))
        .limit(1)
        .then(res => res[0] || null);

      // Crea la nuova operazione di vendita
      const newOperation = await db.insert(operations).values({
        type: "vendita",
        date: operationDate.toISOString().split('T')[0],
        basketId: basket.id,
        cycleId: basket.currentCycleId as number,
        lotId: lastOperation?.lotId || null,
        notes: `${notes || 'Vendita tramite API esterna'} ${client ? `- Cliente: ${client}` : ''} ${invoiceNumber ? `- Fattura: ${invoiceNumber}` : ''}`,
        totalWeight: totalWeight,
        // Aggiungi metadati extra in un campo JSON
        metadata: JSON.stringify({
          client,
          invoiceNumber,
          totalPrice,
          transportType,
          destination,
          externalTransactionId: transactionId,
        }),
      }).returning();

      if (newOperation && newOperation.length > 0) {
        createdOperations.push(newOperation[0]);

        // Aggiorna lo stato del cestello a 'venduto'
        await db.update(baskets)
          .set({
            state: 'sold',
          })
          .where(eq(baskets.id, basket.id));

        // Aggiorna lo stato del ciclo a 'completed'
        if (basket.currentCycleId) {
          await db.update(cycles)
            .set({
              state: 'completed',
              endDate: operationDate.toISOString().split('T')[0],
            })
            .where(eq(cycles.id, basket.currentCycleId));
        }
      }
    }

    res.status(201).json({
      success: true,
      message: `Operazioni di vendita create con successo per ${createdOperations.length} cestelli`,
      operations: createdOperations,
      transactionId,
    });
  } catch (error) {
    console.error("Errore nella creazione dell'operazione di vendita:", error);
    res.status(500).json({
      success: false,
      message: "Errore nella creazione dell'operazione di vendita",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Ottiene lo storico delle operazioni di vendita esterne
 */
export async function getExternalSaleHistory(req: Request, res: Response) {
  try {
    // Ottieni le operazioni di vendita che hanno metadata (create dall'app esterna)
    const salesHistory = await db
      .select()
      .from(operations)
      .where(and(
        eq(operations.type, "vendita"),
        not(isNull(operations.metadata))
      ))
      .orderBy(desc(operations.date));

    // Raggruppa per transactionId se presente nei metadata
    const groupedSales: Record<string, any[]> = {};
    
    for (const sale of salesHistory) {
      let metadata = {};
      try {
        if (sale.metadata) {
          metadata = JSON.parse(sale.metadata as string);
        }
      } catch (e) {
        console.error(`Errore nel parsing dei metadata per l'operazione ${sale.id}:`, e);
      }
      
      const transactionId = (metadata as any)?.externalTransactionId || 'unknown';
      
      if (!groupedSales[transactionId]) {
        groupedSales[transactionId] = [];
      }
      
      groupedSales[transactionId].push({
        ...sale,
        metadata: metadata,
      });
    }

    res.json({
      success: true,
      salesHistory: Object.values(groupedSales),
    });
  } catch (error) {
    console.error("Errore nel recupero dello storico vendite:", error);
    res.status(500).json({
      success: false,
      message: "Errore nel recupero dello storico vendite",
    });
  }
}

/**
 * Ottiene i dettagli di un lotto specifico
 */
export async function getLotDetail(req: Request, res: Response) {
  try {
    const lotId = parseInt(req.params.id);
    
    if (isNaN(lotId)) {
      return res.status(400).json({
        success: false,
        message: "ID lotto non valido",
      });
    }
    
    // Ottieni il lotto
    const lot = await db
      .select()
      .from(lots)
      .where(eq(lots.id, lotId))
      .then(res => res[0] || null);
    
    if (!lot) {
      return res.status(404).json({
        success: false,
        message: "Lotto non trovato",
      });
    }
    
    // Ottieni tutti i cestelli con cicli attivi per questo lotto
    const activeCycles = await db
      .select({
        cycle: cycles,
        basket: baskets,
      })
      .from(cycles)
      .innerJoin(baskets, eq(cycles.basketId, baskets.id))
      .innerJoin(operations, and(
        eq(operations.cycleId, cycles.id),
        eq(operations.lotId, lotId)
      ))
      .where(eq(cycles.state, 'active'));
    
    // Conta i cestelli unici
    const uniqueBasketIds = new Set(activeCycles.map(c => c.basket.id));
    
    res.json({
      success: true,
      lot,
      activeBasketCount: uniqueBasketIds.size,
      activeCycles,
    });
  } catch (error) {
    console.error("Errore nel recupero dei dettagli del lotto:", error);
    res.status(500).json({
      success: false,
      message: "Errore nel recupero dei dettagli del lotto",
    });
  }
}