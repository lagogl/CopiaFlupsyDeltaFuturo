import fs from 'fs';
import path from 'path';
import { eq, and, sql } from 'drizzle-orm';
import { db } from './db';
import {
  baskets,
  flupsys,
  lots,
  operations,
  sizes
} from '@shared/schema';
import { createDatabaseBackup } from './backup-service';
import { format } from 'date-fns';

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
  sourceName: string;
  importDate: string;
  lotCount: number;
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
export async function analyzeImport(importFilePath: string): Promise<{ success: boolean, message: string, analysis?: ImportPlan }> {
  try {
    const importData: ImportData = JSON.parse(fs.readFileSync(importFilePath, 'utf8'));
    
    // Verifica che ci siano dati
    if (!importData.ceste || importData.ceste.length === 0) {
      return {
        success: false,
        message: 'Il file non contiene cestelli da importare'
      };
    }
    
    // Crea l'analisi dell'importazione
    const newLots = new Set<string>();
    const newFlupsy = new Set<string>();
    const potentialConflicts: { basketNumber: number; reason: string }[] = [];
    
    // Verifica quali lotti sono nuovi
    for (const lot of importData.lotti || []) {
      const existingLot = await db.query.lots.findFirst({
        where: eq(lots.externalId, lot.id)
      });
      
      if (!existingLot) {
        newLots.add(lot.id);
      }
    }
    
    // Verifica quali flupsy sono nuovi
    for (const basket of importData.ceste) {
      const existingFlupsy = await db.query.flupsys.findFirst({
        where: eq(flupsys.name, basket.flupsy)
      });
      
      if (!existingFlupsy) {
        newFlupsy.add(basket.flupsy);
      }
      
      // Verifica conflitti di cestelli
      const existingBasket = await db.query.baskets.findFirst({
        where: and(
          eq(baskets.physicalNumber, basket.numero_cesta),
          eq(baskets.active, true)
        )
      });
      
      if (existingBasket) {
        potentialConflicts.push({
          basketNumber: basket.numero_cesta,
          reason: 'Cestello già esistente nel sistema'
        });
      }
    }
    
    const plan: ImportPlan = {
      totalBaskets: importData.ceste.length,
      sourceName: importData.fonte,
      importDate: importData.data_importazione,
      lotCount: importData.lotti?.length || 0,
      newLots: Array.from(newLots),
      newFlupsy: Array.from(newFlupsy),
      potentialConflicts
    };
    
    return {
      success: true,
      message: 'Analisi completata',
      analysis: plan
    };
    
  } catch (error) {
    console.error('Errore durante l\'analisi dell\'importazione:', error);
    return {
      success: false,
      message: `Errore durante l'analisi: ${(error as Error).message}`
    };
  }
}

/**
 * Esegue l'importazione effettiva dei dati nel database
 */
export async function executeImport(importFilePath: string, confirmImport: boolean = false): Promise<ImportResult> {
  if (!confirmImport) {
    return {
      success: false,
      message: 'Importazione non confermata. Usa confirm=true per confermare l\'importazione.'
    };
  }
  
  try {
    // Crea un backup prima dell'importazione
    console.log('Creazione backup pre-importazione...');
    
    // Dichiariamo backupId fuori dal blocco try per renderlo disponibile globalmente nella funzione
    let backupId: string = '';
    
    try {
      const backupInfo = await createDatabaseBackup();
      console.log('Backup creato, ID:', backupInfo.id);
      
      // Salva l'ID del backup per possibili rollback
      backupId = backupInfo.id;
    } catch (backupError) {
      console.error('Errore durante la creazione del backup:', backupError);
      return {
        success: false,
        message: 'Errore durante la creazione del backup. Importazione annullata.'
      };
    }
    
    const importData: ImportData = JSON.parse(fs.readFileSync(importFilePath, 'utf8'));
    
    // Inizializza contatori per le statistiche
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
        backupId: backupId // Utilizziamo la variabile backupId dichiarata sopra
      }
    };
    
    // Crea o aggiorna i lotti
    const lotMap = new Map<string, number>(); // Mappa externalId -> id del DB
    
    for (const lot of importData.lotti || []) {
      const existingLot = await db.query.lots.findFirst({
        where: eq(lots.externalId, lot.id)
      });
      
      if (existingLot) {
        lotMap.set(lot.id, existingLot.id);
      } else {
        // Crea un nuovo lotto
        const [newLot] = await db.insert(lots).values({
          arrivalDate: lot.data_creazione,
          supplier: lot.fornitore,
          description: lot.descrizione,
          origin: lot.origine,
          externalId: lot.id,
          active: true
        }).returning();
        
        lotMap.set(lot.id, newLot.id);
        result.details!.createdLots++;
      }
    }
    
    // Crea o trova i flupsy
    const flupsyMap = new Map<string, number>(); // Mappa nome -> id del DB
    // Evita i duplicati con un set e lo trasforma in array
    const flupsyNames = [...new Set(importData.ceste.map(b => b.flupsy).filter(Boolean))];
    
    for (const flupsyName of flupsyNames) {
      const existingFlupsy = await db.query.flupsys.findFirst({
        where: eq(flupsys.name, flupsyName)
      });
      
      if (existingFlupsy) {
        flupsyMap.set(flupsyName, existingFlupsy.id);
      } else {
        // Crea un nuovo flupsy
        const [newFlupsy] = await db.insert(flupsys).values({
          name: flupsyName,
          location: 'Importato',
          description: `Flupsy creato da importazione ${importData.fonte}`,
          active: true,
          maxPositions: 48
        }).returning();
        
        flupsyMap.set(flupsyName, newFlupsy.id);
        result.details!.createdFlupsy++;
      }
    }
    
    // Crea o trova le taglie
    const sizeMap = new Map<string, number>(); // Mappa codice -> id del DB
    // Evita i duplicati con un set e lo trasforma in array
    const sizeCodes = [...new Set(importData.ceste.map(b => b.taglia_codice).filter(Boolean))];
    
    for (const sizeCode of sizeCodes) {
      const existingSize = await db.query.sizes.findFirst({
        where: eq(sizes.code, sizeCode)
      });
      
      if (existingSize) {
        sizeMap.set(sizeCode, existingSize.id);
      } else {
        // Estrai il valore numerico dalla taglia (es. TP-500 -> 500)
        const sizeParts = sizeCode.split('-');
        const sizeValue = sizeParts.length > 1 ? parseInt(sizeParts[1], 10) : 0;
        
        // Crea una nuova taglia
        const [newSize] = await db.insert(sizes).values({
          name: `Taglia ${sizeCode}`,
          minWeight: Math.max(0, sizeValue * 0.8),
          maxWeight: sizeValue * 1.2,
          minAnimalsPerKg: Math.max(0, Math.floor(1000000 / (sizeValue * 1.2))),
          maxAnimalsPerKg: Math.floor(1000000 / Math.max(1, sizeValue * 0.8)),
          category: "standard",
          code: sizeCode,
          color: "#" + Math.floor(Math.random()*16777215).toString(16)
        }).returning();
        
        sizeMap.set(sizeCode, newSize.id);
      }
    }
    
    // Processa i cestelli
    for (const basketData of importData.ceste) {
      try {
        const flupsyId = flupsyMap.get(basketData.flupsy);
        const lotId = basketData.lotto_id ? lotMap.get(basketData.lotto_id) : null;
        const sizeId = sizeMap.get(basketData.taglia_codice);
        
        if (!flupsyId) {
          throw new Error(`FLUPSY non trovato: ${basketData.flupsy}`);
        }
        
        if (basketData.lotto_id && !lotId) {
          throw new Error(`Lotto non trovato: ${basketData.lotto_id}`);
        }
        
        if (!sizeId) {
          throw new Error(`Taglia non trovata: ${basketData.taglia_codice}`);
        }
        
        // Verifica se il cestello esiste già
        const existingBasket = await db.query.baskets.findFirst({
          where: and(
            eq(baskets.physicalNumber, basketData.numero_cesta),
            eq(baskets.active, true)
          )
        });
        
        if (existingBasket) {
          result.details!.skippedBaskets++;
          result.details!.skippedDetails.push({
            basketNumber: basketData.numero_cesta,
            reason: 'Cestello già esistente nel sistema'
          });
          continue;
        }
        
        // Crea il cestello
        const [newBasket] = await db.insert(baskets).values({
          physicalNumber: basketData.numero_cesta,
          flupsyId: flupsyId,
          row: basketData.fila,
          position: basketData.posizione,
          state: basketData.stato,
          active: true,
          notes: basketData.note,
          externalId: basketData.id_sistema_esterno
        }).returning();
        
        // Crea l'operazione di prima attivazione
        const [newOperation] = await db.insert(operations).values({
          type: 'prima-attivazione',
          date: basketData.data_attivazione,
          basketId: newBasket.id,
          cycleId: 1, // Ciclo predefinito iniziale
          lotId: lotId,
          flupsyId: flupsyId,
          sizeId: sizeId,
          animalCount: basketData.animali_totali,
          animalsPerKg: basketData.animali_per_kg,
          averageWeight: basketData.peso_medio_mg,
          notes: `Importato da ${importData.fonte}`
        }).returning();
        
        // Nota: La tabella measurements non è presente nello schema attuale
        // Utilizziamo solo le operazioni per registrare i dati
        
        result.details!.processedBaskets++;
        result.details!.createdOperations++;
        
        // Se c'è un'operazione aggiuntiva nell'importazione, la aggiungiamo
        if (basketData.ultima_operazione && basketData.ultima_operazione.tipo && basketData.ultima_operazione.data) {
          const [additionalOperation] = await db.insert(operations).values({
            type: mapOperationType(basketData.ultima_operazione.tipo),
            date: basketData.ultima_operazione.data,
            basketId: newBasket.id,
            lotId: lotId,
            flupsyId: flupsyId,
            sizeId: sizeId,
            totalAnimals: basketData.animali_totali,
            animalsPerKg: basketData.animali_per_kg,
            averageWeight: basketData.peso_medio_mg,
            notes: `Importato da ${importData.fonte} (ultima operazione)`,
            weight: null,
            mortality: null,
            status: 'completata'
          }).returning();
          
          // Nota: La tabella measurements non è presente nello schema attuale
          // Utilizziamo solo le operazioni per registrare i dati aggiuntivi
          
          result.details!.createdOperations++;
        }
        
      } catch (error) {
        console.error(`Errore durante l'importazione del cestello ${basketData.numero_cesta}:`, error);
        result.details!.skippedBaskets++;
        result.details!.skippedDetails.push({
          basketNumber: basketData.numero_cesta,
          reason: (error as Error).message
        });
      }
    }
    
    return result;
    
  } catch (error) {
    console.error('Errore durante l\'importazione:', error);
    return {
      success: false,
      message: `Errore durante l'importazione: ${(error as Error).message}`
    };
  }
}

/**
 * Mappa i tipi di operazione dal formato di importazione ai tipi interni
 */
function mapOperationType(externalType: string): "prima-attivazione" | "pulizia" | "vagliatura" | "trattamento" | "misura" | "vendita" | "selezione-vendita" | "cessazione" | "peso" | "selezione-origine" {
  const typeMap: Record<string, "prima-attivazione" | "pulizia" | "vagliatura" | "trattamento" | "misura" | "vendita" | "selezione-vendita" | "cessazione" | "peso" | "selezione-origine"> = {
    'attivazione': 'prima-attivazione',
    'pulizia': 'pulizia',
    'vagliatura': 'vagliatura',
    'screening': 'vagliatura',
    'trattamento': 'trattamento',
    'misura': 'misura',
    'misurazione': 'misura',
    'vendita': 'vendita',
    'selezione-vendita': 'selezione-vendita',
    'cessazione': 'cessazione',
    'peso': 'peso',
    'pesata': 'peso',
    'selezione-origine': 'selezione-origine'
  };
  
  // Normalizza il tipo (minuscolo, senza spazi)
  const normalizedType = externalType.toLowerCase().trim().replace(/\s+/g, '-');
  
  // Restituisci il tipo mappato o il default
  return typeMap[normalizedType] || 'misura';
}