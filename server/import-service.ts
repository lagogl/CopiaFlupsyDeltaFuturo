import { db } from './db';
import fs from 'fs';
import path from 'path';
import { baskets, lots, flupsy, operations, measurements, basketTypes, sizes } from '@shared/schema';
import { createBackup } from './database-service';
import { eq, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

interface ImportBasket {
  numero_cesta: number;
  flupsy: string;
  fila: string;
  posizione: number;
  lotto_id: string | null;
  data_attivazione: string;
  taglia_codice: string;
  animali_totali: number;
  animali_per_kg: number;
  peso_medio_mg: number;
  note: string;
  id_sistema_esterno: string;
  stato: string;
  provenienza?: string;
  ultima_operazione?: {
    tipo: string;
    data: string;
  };
}

interface ImportLot {
  id: string;
  data_creazione: string;
  fornitore: string;
  descrizione: string;
  origine: string;
}

interface ImportData {
  data_importazione: string;
  fonte: string;
  totale_ceste: number;
  ceste: ImportBasket[];
  lotti: ImportLot[];
  istruzioni_importazione: {
    gestione_lotti: string;
    gestione_posizioni: string;
    gestione_flupsy: string;
    gestione_conflitti: string;
  };
  statistiche: {
    distribuzione_taglie: Record<string, number>;
    distribuzione_flupsy: Record<string, number>;
    peso_totale_kg: number;
    animali_totali: number;
  };
}

interface ImportResult {
  success: boolean;
  message: string;
  details?: {
    processedBaskets: number;
    skippedBaskets: number;
    skippedDetails: {
      reason: string;
      basketNumber: number;
    }[];
    createdLots: number;
    createdOperations: number;
    createdFlupsy: number;
    backupId?: string;
  };
}

interface ImportPlan {
  totalBaskets: number;
  newLots: string[];
  newFlupsy: string[];
  potentialConflicts: {
    basketNumber: number;
    reason: string;
  }[];
}

/**
 * Verifica se l'importazione è fattibile e crea un piano di importazione
 */
export async function analyzeImport(importFilePath: string): Promise<ImportPlan> {
  try {
    // Legge il file JSON
    const importData: ImportData = JSON.parse(fs.readFileSync(importFilePath, 'utf8'));
    
    // Piano di importazione
    const plan: ImportPlan = {
      totalBaskets: importData.ceste.length,
      newLots: [],
      newFlupsy: [],
      potentialConflicts: []
    };
    
    // Verifica i lotti esistenti
    const existingLotIds = (await db.select({ id: lots.id }).from(lots)).map(lot => lot.id);
    for (const lot of importData.lotti) {
      if (!existingLotIds.includes(lot.id)) {
        plan.newLots.push(lot.id);
      }
    }
    
    // Verifica i flupsy esistenti
    const existingFlupsyNames = (await db.select({ name: flupsy.name }).from(flupsy)).map(f => f.name);
    const importFlupsyNames = new Set(importData.ceste.map(basket => basket.flupsy));
    for (const flupsyName of importFlupsyNames) {
      if (!existingFlupsyNames.includes(flupsyName)) {
        plan.newFlupsy.push(flupsyName);
      }
    }
    
    // Verifica le potenziali collisioni di cestelli
    const existingBasketNumbers = (await db.select({ number: baskets.number }).from(baskets)).map(b => b.number);
    for (const basket of importData.ceste) {
      if (existingBasketNumbers.includes(basket.numero_cesta)) {
        plan.potentialConflicts.push({
          basketNumber: basket.numero_cesta,
          reason: 'Numero cesta già presente nel database'
        });
      }
    }

    // Restituisce il piano di importazione
    return plan;
  } catch (error) {
    console.error('Errore durante l\'analisi dell\'importazione:', error);
    throw new Error('Impossibile analizzare il file di importazione: ' + error.message);
  }
}

/**
 * Esegue l'importazione effettiva dei dati nel database
 */
export async function executeImport(importFilePath: string, confirmImport: boolean = false): Promise<ImportResult> {
  try {
    // Legge il file JSON
    const importData: ImportData = JSON.parse(fs.readFileSync(importFilePath, 'utf8'));
    
    // Se non è confermato, restituisce solo il risultato dell'analisi
    if (!confirmImport) {
      const plan = await analyzeImport(importFilePath);
      return {
        success: true,
        message: 'Analisi dell\'importazione completata. Confermare per procedere con l\'importazione effettiva.',
        details: {
          processedBaskets: 0,
          skippedBaskets: 0,
          skippedDetails: [],
          createdLots: plan.newLots.length,
          createdOperations: 0,
          createdFlupsy: plan.newFlupsy.length,
        }
      };
    }

    // Crea un backup del database prima dell'importazione
    const backupResult = await createBackup();
    if (!backupResult.success) {
      return {
        success: false,
        message: 'Impossibile creare un backup del database prima dell\'importazione.',
      };
    }

    // Inizializza i risultati dell'importazione
    const result: ImportResult = {
      success: true,
      message: 'Importazione completata con successo',
      details: {
        processedBaskets: 0,
        skippedBaskets: 0,
        skippedDetails: [],
        createdLots: 0,
        createdOperations: 0,
        createdFlupsy: 0,
        backupId: backupResult.backupId,
      }
    };

    // Ottiene i dati esistenti dal database
    const existingLotIds = (await db.select({ id: lots.id }).from(lots)).map(lot => lot.id);
    const existingFlupsyNames = (await db.select({ name: flupsy.name }).from(flupsy)).map(f => f.name);
    const existingBasketNumbers = (await db.select({ number: baskets.number }).from(baskets)).map(b => b.number);
    const existingSizes = (await db.select().from(sizes)).map(s => s.code);

    // 1. Importa i lotti mancanti
    for (const lot of importData.lotti) {
      if (!existingLotIds.includes(lot.id)) {
        await db.insert(lots).values({
          id: lot.id,
          created_at: new Date(lot.data_creazione),
          supplier: lot.fornitore,
          notes: lot.descrizione,
          origin: lot.origine,
          status: 'active'
        });
        result.details!.createdLots++;
      }
    }

    // 2. Importa i flupsy mancanti
    for (const flupsyName of new Set(importData.ceste.map(basket => basket.flupsy))) {
      if (!existingFlupsyNames.includes(flupsyName)) {
        // Genera un ID unico per il nuovo flupsy
        const flupsyId = createId();
        await db.insert(flupsy).values({
          id: flupsyId,
          name: flupsyName,
          description: `Flupsy importato da ${importData.fonte}`,
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
          type: 'standard',
          capacity: 20,
          location: 'Importazione'
        });
        result.details!.createdFlupsy++;
      }
    }

    // 3. Importa le taglie mancanti
    const sizeCodesToAdd = new Set<string>();
    for (const basket of importData.ceste) {
      if (!existingSizes.includes(basket.taglia_codice)) {
        sizeCodesToAdd.add(basket.taglia_codice);
      }
    }

    for (const sizeCode of sizeCodesToAdd) {
      await db.insert(sizes).values({
        code: sizeCode,
        description: `Taglia importata ${sizeCode}`,
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    // 4. Importa i cestelli
    for (const basketData of importData.ceste) {
      // Se il cestello esiste già e la politica è "skip", salta l'importazione
      if (existingBasketNumbers.includes(basketData.numero_cesta) && 
          importData.istruzioni_importazione.gestione_conflitti === 'Saltare le ceste con numero già esistente') {
        result.details!.skippedBaskets++;
        result.details!.skippedDetails.push({
          reason: 'Numero cesta già presente nel database',
          basketNumber: basketData.numero_cesta
        });
        continue;
      }

      // Ottieni il flupsy dal database
      const [flupsyRecord] = await db
        .select()
        .from(flupsy)
        .where(eq(flupsy.name, basketData.flupsy));

      if (!flupsyRecord) {
        result.details!.skippedBaskets++;
        result.details!.skippedDetails.push({
          reason: `Flupsy ${basketData.flupsy} non trovato`,
          basketNumber: basketData.numero_cesta
        });
        continue;
      }

      // Crea il cestello
      const basketId = createId();
      await db.insert(baskets).values({
        id: basketId,
        number: basketData.numero_cesta,
        status: basketData.stato,
        flupsy_id: flupsyRecord.id,
        row: basketData.fila,
        position: basketData.posizione,
        lot_id: basketData.lotto_id,
        created_at: new Date(basketData.data_attivazione),
        updated_at: new Date(),
        notes: basketData.note,
        external_id: basketData.id_sistema_esterno
      });

      // Crea l'operazione di prima attivazione
      const operationId = createId();
      await db.insert(operations).values({
        id: operationId,
        type: 'prima-attivazione',
        date: new Date(basketData.data_attivazione),
        basket_id: basketId,
        lot_id: basketData.lotto_id,
        notes: basketData.note,
        status: 'completed',
        created_at: new Date(),
        updated_at: new Date()
      });

      // Crea la misurazione per l'operazione
      await db.insert(measurements).values({
        id: createId(),
        operation_id: operationId,
        basket_id: basketId,
        lot_id: basketData.lotto_id,
        average_weight: basketData.peso_medio_mg,
        total_animals: basketData.animali_totali,
        created_at: new Date(),
        updated_at: new Date(),
        size_code: basketData.taglia_codice
      });
      
      // Se ha un'ultima operazione, creala
      if (basketData.ultima_operazione) {
        const lastOperationId = createId();
        await db.insert(operations).values({
          id: lastOperationId,
          type: basketData.ultima_operazione.tipo.toLowerCase(),
          date: new Date(basketData.ultima_operazione.data),
          basket_id: basketId,
          lot_id: basketData.lotto_id,
          notes: basketData.note,
          status: 'completed',
          created_at: new Date(),
          updated_at: new Date()
        });
        
        // Se l'operazione è una misurazione o un'operazione che include una misurazione
        // aggiungiamo anche la misurazione più recente
        if (['misura', 'peso', 'vagliatura', 'conta'].includes(basketData.ultima_operazione.tipo.toLowerCase())) {
          await db.insert(measurements).values({
            id: createId(),
            operation_id: lastOperationId,
            basket_id: basketId,
            lot_id: basketData.lotto_id,
            average_weight: basketData.peso_medio_mg,
            total_animals: basketData.animali_totali,
            created_at: new Date(basketData.ultima_operazione.data),
            updated_at: new Date(),
            size_code: basketData.taglia_codice
          });
        }
        
        result.details!.createdOperations++;
      }
      
      result.details!.processedBaskets++;
      result.details!.createdOperations++;
    }

    return result;
  } catch (error) {
    console.error('Errore durante l\'importazione:', error);
    return {
      success: false,
      message: 'Errore durante l\'importazione: ' + error.message,
    };
  }
}