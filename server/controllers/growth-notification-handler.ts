import { db } from "../db";
import { sql } from "drizzle-orm";
import { isNotificationTypeEnabled, getConfiguredTargetSizes } from "./notification-settings-controller";
import { NotificationsCache } from "./notification-controller";

/**
 * Converte un tasso di crescita mensile in tasso giornaliero equivalente
 * @param monthlyPercentage Percentuale di crescita mensile
 * @returns Percentuale di crescita giornaliera
 */
function monthlyToDaily(monthlyPercentage: number): number {
  // Formula: (1 + r_m)^(1/30) - 1
  return Math.pow(1 + monthlyPercentage / 100, 1 / 30) - 1;
}

/**
 * Simula la crescita di un peso usando il tasso di crescita giornaliero
 * @param initialWeight Peso iniziale in mg
 * @param dailyRate Tasso di crescita giornaliero in percentuale
 * @param days Numero di giorni per cui simulare la crescita
 * @returns Peso finale dopo il periodo di crescita
 */
function simulateGrowthWithDailySGR(initialWeight: number, dailyRate: number, days: number): number {
  // Simula crescita giorno per giorno
  return initialWeight * Math.pow(1 + dailyRate, days);
}

/**
 * Verifica se un valore di animali per kg rientra in una specifica taglia
 * @param animalsPerKg Valore di animali per kg da verificare
 * @param sizeId ID della taglia da verificare
 * @returns Oggetto con info sulla taglia se rientra, null altrimenti
 */
async function checkSizeMatch(animalsPerKg: number, sizeId: number): Promise<{ id: number; name: string; code: string } | null> {
  try {
    const sizeData = await db.execute(sql`
      SELECT id, name, code, min_animals_per_kg, max_animals_per_kg FROM sizes
      WHERE id = ${sizeId}
    `);

    if (!sizeData.rows || sizeData.rows.length === 0) {
      return null;
    }

    const size = sizeData.rows[0] as any;
    const min_animals_per_kg = Number(size.min_animals_per_kg);
    const max_animals_per_kg = Number(size.max_animals_per_kg);
    
    // Verifica se animalsPerKg rientra nell'intervallo
    if (animalsPerKg >= min_animals_per_kg && animalsPerKg <= max_animals_per_kg) {
      return {
        id: Number(size.id),
        name: String(size.name),
        code: String(size.code)
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Errore nella verifica della taglia ID ${sizeId}:`, error);
    return null;
  }
}

/**
 * Mappa il numero del mese (1-12) al nome italiano
 */
const MONTH_NAMES_IT = [
  'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
];

/**
 * Ottiene il nome del mese in italiano da una data
 * @param date Data da cui estrarre il mese
 * @returns Nome del mese in italiano
 */
function getMonthNameFromDate(date: Date): string {
  return MONTH_NAMES_IT[date.getMonth()]; // getMonth() restituisce 0-11
}

/**
 * Ottiene il tasso di crescita giornaliero dal database per il mese specificato
 * @param monthName Nome del mese in italiano (es. "gennaio", "ottobre")
 * @returns Promise con il tasso di crescita giornaliero percentuale o null se non trovato
 */
async function getDailyGrowthRate(monthName: string): Promise<number | null> {
  try {
    const sgrData = await db.execute(sql`
      SELECT percentage FROM sgr
      WHERE month = ${monthName}
    `);

    if (!sgrData.rows || sgrData.rows.length === 0) {
      return null;
    }

    return Number(sgrData.rows[0].percentage);
  } catch (error) {
    console.error(`Errore nel recupero del tasso SGR per il mese ${monthName}:`, error);
    return null;
  }
}

/**
 * Calcola il fattore di incremento del peso considerando i tassi di crescita
 * giornalieri specifici per ogni mese attraversato dal periodo
 * @param startDate Data di partenza (ultima operazione)
 * @param endDate Data di fine (controllo corrente)
 * @returns Promise con il fattore di incremento totale (es. 1.15 = +15% di peso)
 */
async function calculateGrowthFactorAcrossMonths(startDate: Date, endDate: Date): Promise<number> {
  let currentDate = new Date(startDate);
  currentDate.setDate(currentDate.getDate() + 1); // Inizia dal giorno dopo l'operazione
  
  let totalGrowthFactor = 1.0; // Fattore di crescita cumulativo
  
  while (currentDate <= endDate) {
    const monthName = getMonthNameFromDate(currentDate);
    const dailyRate = await getDailyGrowthRate(monthName);
    
    if (dailyRate !== null) {
      // Applica l'incremento percentuale giornaliero: peso * (1 + rate/100)
      totalGrowthFactor *= (1 + dailyRate / 100);
    }
    
    // Passa al giorno successivo
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return totalGrowthFactor;
}

/**
 * Crea una notifica per un ciclo che ha raggiunto una taglia target
 * @param cycleId ID del ciclo
 * @param basketId ID del cestello
 * @param basketNumber Numero fisico del cestello
 * @param projectedAnimalsPerKg Valore proiettato di animali per kg
 * @param targetSize Taglia raggiunta
 * @returns Promise con l'ID della notifica creata o null se c'è un errore
 */
async function createTargetSizeNotification(
  cycleId: number,
  basketId: number,
  basketNumber: string | number,
  projectedAnimalsPerKg: number,
  targetSize: { id: number; name: string; code: string }
): Promise<number | null> {
  try {
    // Verifica se esiste già una notifica per questo cestello/taglia
    const existingNotifications = await db.execute(sql`
      SELECT id FROM target_size_annotations
      WHERE basket_id = ${basketId} AND target_size_id = ${targetSize.id}
    `);

    if (existingNotifications.rows && existingNotifications.rows.length > 0) {
      // Aggiorna la notifica esistente
      await db.execute(sql`
        UPDATE target_size_annotations
        SET status = 'pending', updated_at = NOW()
        WHERE basket_id = ${basketId} AND target_size_id = ${targetSize.id}
      `);
      return Number(existingNotifications.rows[0].id);
    }

    // Crea una nuova notifica nella tabella target_size_annotations
    const result = await db.execute(sql`
      INSERT INTO target_size_annotations
      (basket_id, target_size_id, predicted_date, status, created_at)
      VALUES (${basketId}, ${targetSize.id}, CURRENT_DATE, 'pending', NOW())
      RETURNING id
    `);

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    // Crea anche una notifica generale nel sistema di notifiche
    await db.execute(sql`
      INSERT INTO notifications
      (type, title, message, is_read, created_at, related_entity_type, related_entity_id, data)
      VALUES (
        'accrescimento',
        'Taglia raggiunta',
        ${`Il cestello #${basketNumber} (ciclo #${cycleId}) ha raggiunto la taglia ${targetSize.name} (${Math.round(projectedAnimalsPerKg)} esemplari/kg)`},
        false,
        NOW(),
        'basket',
        ${basketId},
        ${JSON.stringify({ cycleId, basketId, targetSizeId: targetSize.id, targetSizeName: targetSize.name, projectedAnimalsPerKg })}
      )
    `);

    // Invalida la cache delle notifiche per mostrare immediatamente la nuova notifica
    NotificationsCache.clear();

    return Number(result.rows[0].id);
  } catch (error) {
    console.error(`Errore nella creazione della notifica per taglia ${targetSize.name}:`, error);
    return null;
  }
}

/**
 * Controlla i cicli attivi per identificare quelli che hanno raggiunto una taglia target
 * secondo le proiezioni di crescita
 * @returns Promise che risolve con il numero di notifiche create
 */
export async function checkCyclesForTargetSizes(): Promise<number> {
  try {
    // Verifica prima se il tipo di notifica "accrescimento" è abilitato
    const isEnabled = await isNotificationTypeEnabled('accrescimento');
    if (!isEnabled) {
      console.log("Notifiche di accrescimento disabilitate nelle impostazioni");
      return 0;
    }

    // Recupera le taglie configurate
    const configuredSizeIds = await getConfiguredTargetSizes();
    
    // Se non ci sono taglie configurate, usa TP-3000 come default
    let targetSizeIds: number[];
    if (!configuredSizeIds || configuredSizeIds.length === 0) {
      // Recupera ID di TP-3000 come default
      const defaultSize = await db.execute(sql`
        SELECT id FROM sizes WHERE name = 'TP-3000'
      `);
      
      if (!defaultSize.rows || defaultSize.rows.length === 0) {
        console.log("Nessuna taglia configurata e TP-3000 non trovata");
        return 0;
      }
      
      targetSizeIds = [Number(defaultSize.rows[0].id)];
      console.log("Usando TP-3000 come taglia default per le notifiche");
    } else {
      targetSizeIds = configuredSizeIds;
      console.log(`Taglie configurate per le notifiche: ${targetSizeIds.join(', ')}`);
    }

    const currentDate = new Date();
    
    // Ottieni tutti i cicli attivi con l'ultima operazione di peso o prima-attivazione
    const activeCyclesWithLastWeightOp = await db.execute(sql`
      WITH last_weight_operations AS (
        SELECT 
          o.cycle_id,
          o.basket_id,
          o.total_weight,
          o.animal_count,
          o.date,
          o.size_id,
          o.id as operation_id,
          ROW_NUMBER() OVER (PARTITION BY o.cycle_id ORDER BY o.date DESC, o.id DESC) as rn
        FROM operations o
        JOIN cycles c ON o.cycle_id = c.id
        WHERE o.type IN ('peso', 'prima-attivazione') AND c.state = 'active' AND o.total_weight IS NOT NULL AND o.animal_count IS NOT NULL
      )
      SELECT 
        lwo.cycle_id,
        lwo.basket_id,
        b.physical_number as basket_number,
        lwo.total_weight,
        lwo.animal_count,
        lwo.date,
        lwo.operation_id,
        CAST(lwo.animal_count::float / lwo.total_weight AS numeric) as animals_per_kg,
        c.start_date,
        s.name as size_name
      FROM last_weight_operations lwo
      JOIN cycles c ON lwo.cycle_id = c.id
      JOIN baskets b ON lwo.basket_id = b.id
      LEFT JOIN sizes s ON lwo.size_id = s.id
      WHERE lwo.rn = 1
    `);

    if (!activeCyclesWithLastWeightOp.rows || activeCyclesWithLastWeightOp.rows.length === 0) {
      console.log("Nessun ciclo attivo trovato");
      return 0;
    }

    let notificationsCreated = 0;

    for (const cycle of activeCyclesWithLastWeightOp.rows) {
      const cycleData = cycle as any;
      
      // Calcola il valore attuale di animali per kg
      const currentAnimalsPerKg = Number(cycleData.animals_per_kg);
      
      // Calcola la crescita dall'ultima operazione considerando i tassi specifici per mese
      const lastWeightDate = new Date(cycleData.date);
      const daysSinceLastWeight = Math.floor((currentDate.getTime() - lastWeightDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let valueToCheck = currentAnimalsPerKg;
      
      if (daysSinceLastWeight > 0) {
        // Calcola il fattore di crescita considerando i tassi giornalieri di ogni mese
        const growthFactor = await calculateGrowthFactorAcrossMonths(lastWeightDate, currentDate);
        
        // All'aumentare del peso, diminuisce il numero di animali per kg
        valueToCheck = currentAnimalsPerKg / growthFactor;
        
        console.log(`Cestello #${cycleData.basket_number}: ${currentAnimalsPerKg} → ${Math.round(valueToCheck)} animali/kg (crescita ${daysSinceLastWeight} giorni, fattore ${growthFactor.toFixed(3)})`);
      } else {
        console.log(`Cestello #${cycleData.basket_number}: ${currentAnimalsPerKg} animali/kg (nessuna crescita, operazione oggi)`);
      }
      
      // Verifica per ogni taglia configurata
      for (const sizeId of targetSizeIds) {
        const matchedSize = await checkSizeMatch(valueToCheck, sizeId);
        
        if (matchedSize) {
          // Crea una notifica
          const notificationId = await createTargetSizeNotification(
            cycleData.cycle_id,
            cycleData.basket_id,
            cycleData.basket_number,
            valueToCheck,
            matchedSize
          );
          
          if (notificationId !== null) {
            notificationsCreated++;
            console.log(`✅ Notifica creata: Cestello #${cycleData.basket_number} ha raggiunto ${matchedSize.name}`);
          }
        }
      }
    }

    return notificationsCreated;
  } catch (error) {
    console.error("Errore durante il controllo dei cicli per taglie target:", error);
    return 0;
  }
}

/**
 * Controlla in tempo reale se un'operazione ha portato il cestello a raggiungere una taglia target
 * @param operationId ID dell'operazione appena creata
 * @returns Promise che risolve con true se è stata creata una notifica, false altrimenti
 */
export async function checkOperationForTargetSize(operationId: number): Promise<boolean> {
  try {
    // Verifica se il tipo di notifica "accrescimento" è abilitato
    const isEnabled = await isNotificationTypeEnabled('accrescimento');
    if (!isEnabled) {
      return false;
    }

    // Recupera l'operazione appena creata
    const operationData = await db.execute(sql`
      SELECT 
        o.id,
        o.cycle_id,
        o.basket_id,
        o.total_weight,
        o.animal_count,
        o.date,
        o.size_id,
        o.type,
        b.physical_number as basket_number,
        c.state as cycle_state
      FROM operations o
      JOIN baskets b ON o.basket_id = b.id
      JOIN cycles c ON o.cycle_id = c.id
      WHERE o.id = ${operationId}
    `);

    if (!operationData.rows || operationData.rows.length === 0) {
      return false;
    }

    const operation = operationData.rows[0] as any;

    // Verifica che sia un'operazione di peso o prima-attivazione e che il ciclo sia attivo
    if (!['peso', 'prima-attivazione'].includes(operation.type) || operation.cycle_state !== 'active') {
      return false;
    }

    // Verifica che ci siano dati sufficienti
    if (!operation.total_weight || !operation.animal_count) {
      return false;
    }

    // Recupera le taglie configurate
    const configuredSizeIds = await getConfiguredTargetSizes();
    let targetSizeIds: number[];
    
    if (!configuredSizeIds || configuredSizeIds.length === 0) {
      // Usa TP-3000 come default
      const defaultSize = await db.execute(sql`
        SELECT id FROM sizes WHERE name = 'TP-3000'
      `);
      
      if (!defaultSize.rows || defaultSize.rows.length === 0) {
        return false;
      }
      
      targetSizeIds = [Number(defaultSize.rows[0].id)];
    } else {
      targetSizeIds = configuredSizeIds;
    }

    // Calcola animali per kg dall'operazione appena creata
    const currentAnimalsPerKg = operation.animal_count / operation.total_weight;
    
    // CASISTICA 1 (Real-time): usa il valore REALE misurato dall'operazione
    // NON applicare proiezione SGR - quella è solo per il controllo batch a mezzanotte
    const valueToCheck = currentAnimalsPerKg;
    
    console.log(`🔍 Controllo tempo reale cestello #${operation.basket_number}: ${Math.round(currentAnimalsPerKg)} animali/kg (valore misurato reale)`);

    // Verifica per ogni taglia configurata
    for (const sizeId of targetSizeIds) {
      const matchedSize = await checkSizeMatch(valueToCheck, sizeId);
      
      if (matchedSize) {
        const notificationId = await createTargetSizeNotification(
          operation.cycle_id,
          operation.basket_id,
          operation.basket_number,
          valueToCheck,
          matchedSize
        );
        
        if (notificationId !== null) {
          console.log(`✅ Notifica accrescimento creata in tempo reale: Cestello #${operation.basket_number} ha raggiunto ${matchedSize.name}`);
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error(`Errore durante il controllo in tempo reale per operazione ${operationId}:`, error);
    return false;
  }
}

// Mantieni la compatibilità con il vecchio nome
export const checkCyclesForTP3000 = checkCyclesForTargetSizes;
