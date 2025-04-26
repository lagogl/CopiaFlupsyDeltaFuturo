import { db } from "../db";
import { sql } from "drizzle-orm";
import { isNotificationTypeEnabled } from "./notification-settings-controller";

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
 * Verifica se un valore di animali per kg rientra nella taglia TP-3000
 * @param animalsPerKg Valore di animali per kg da verificare
 * @returns true se il valore rientra nella taglia TP-3000, false altrimenti
 */
async function isTP3000Size(animalsPerKg: number): Promise<boolean> {
  try {
    // Recupera i limiti per la taglia TP-3000
    const sizeData = await db.execute(sql`
      SELECT min_animals_per_kg, max_animals_per_kg FROM sizes
      WHERE name = 'TP-3000'
    `);

    if (sizeData.length === 0) {
      return false;
    }

    const { min_animals_per_kg, max_animals_per_kg } = sizeData[0];
    
    // Verifica se animalsPerKg rientra nell'intervallo
    return animalsPerKg >= min_animals_per_kg && animalsPerKg <= max_animals_per_kg;
  } catch (error) {
    console.error("Errore nella verifica della taglia TP-3000:", error);
    return false;
  }
}

/**
 * Ottiene il mese corrente (1-12) da una data
 * @param date Data da cui estrarre il mese
 * @returns Numero del mese (1-12)
 */
function getMonthFromDate(date: Date): number {
  return date.getMonth() + 1; // getMonth() restituisce 0-11
}

/**
 * Ottiene il tasso di crescita mensile dal database per il mese specificato
 * @param month Mese per cui ottenere il tasso (1-12)
 * @returns Promise con il tasso di crescita mensile o null se non trovato
 */
async function getMonthlyGrowthRate(month: number): Promise<number | null> {
  try {
    const sgrData = await db.execute(sql`
      SELECT percentage_value FROM sgr_monthly
      WHERE month_number = ${month}
    `);

    if (sgrData.length === 0) {
      return null;
    }

    return sgrData[0].percentage_value;
  } catch (error) {
    console.error(`Errore nel recupero del tasso SGR per il mese ${month}:`, error);
    return null;
  }
}

/**
 * Crea una notifica per un ciclo che ha raggiunto la taglia TP-3000
 * @param cycleId ID del ciclo
 * @param basketId ID del cestello
 * @param basketNumber Numero fisico del cestello
 * @param projectedAnimalsPerKg Valore proiettato di animali per kg
 * @returns Promise con l'ID della notifica creata o null se c'è un errore
 */
async function createTP3000Notification(
  cycleId: number,
  basketId: number,
  basketNumber: string | number,
  projectedAnimalsPerKg: number
): Promise<number | null> {
  try {
    // Verifica se esiste già una notifica per questo ciclo/cestello
    const existingNotifications = await db.execute(sql`
      SELECT id FROM target_size_annotations
      WHERE cycle_id = ${cycleId} AND basket_id = ${basketId}
    `);

    if (existingNotifications.length > 0) {
      // Aggiorna la notifica esistente
      await db.execute(sql`
        UPDATE target_size_annotations
        SET projected_value = ${projectedAnimalsPerKg}, status = 'unread', created_at = NOW()
        WHERE cycle_id = ${cycleId} AND basket_id = ${basketId}
      `);
      return existingNotifications[0].id;
    }

    // Crea una nuova notifica
    const result = await db.execute(sql`
      INSERT INTO target_size_annotations
      (cycle_id, basket_id, target_size, projected_value, status, created_at)
      VALUES (${cycleId}, ${basketId}, 'TP-3000', ${projectedAnimalsPerKg}, 'unread', NOW())
      RETURNING id
    `);

    if (result.length === 0) {
      return null;
    }

    // Crea anche una notifica generale nel sistema di notifiche
    await db.execute(sql`
      INSERT INTO notifications
      (type, content, related_id, status, created_at)
      VALUES (
        'accrescimento',
        ${`Il cestello #${basketNumber} (ciclo #${cycleId}) ha raggiunto la taglia TP-3000 (${Math.round(projectedAnimalsPerKg)} esemplari/kg)`},
        ${result[0].id},
        'unread',
        NOW()
      )
    `);

    return result[0].id;
  } catch (error) {
    console.error("Errore nella creazione della notifica TP-3000:", error);
    return null;
  }
}

/**
 * Controlla i cicli attivi per identificare quelli che hanno raggiunto la taglia TP-3000
 * secondo le proiezioni di crescita
 * @returns Promise che risolve con il numero di notifiche create
 */
export async function checkCyclesForTP3000(): Promise<number> {
  try {
    // Verifica prima se il tipo di notifica "accrescimento" è abilitato
    const isEnabled = await isNotificationTypeEnabled('accrescimento');
    if (!isEnabled) {
      console.log("Notifiche di accrescimento disabilitate nelle impostazioni");
      return 0;
    }

    const currentDate = new Date();
    const currentMonth = getMonthFromDate(currentDate);
    
    // Ottieni il tasso di crescita mensile per il mese corrente
    const monthlyGrowthRate = await getMonthlyGrowthRate(currentMonth);
    if (monthlyGrowthRate === null) {
      console.log(`Nessun tasso di crescita trovato per il mese ${currentMonth}`);
      return 0;
    }
    
    // Converti in tasso giornaliero
    const dailyGrowthRate = monthlyToDaily(monthlyGrowthRate);
    
    // Ottieni tutti i cicli attivi con l'ultima operazione di peso
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
        WHERE o.type = 'peso' AND c.state = 'active' AND o.total_weight IS NOT NULL AND o.animal_count IS NOT NULL
      )
      SELECT 
        lwo.cycle_id,
        lwo.basket_id,
        b.physical_number as basket_number,
        lwo.total_weight,
        lwo.animal_count,
        lwo.date,
        lwo.operation_id,
        CAST(lwo.animal_count::float / lwo.total_weight * 1000000 AS numeric) as animals_per_kg,
        c.start_date,
        s.name as size_name
      FROM last_weight_operations lwo
      JOIN cycles c ON lwo.cycle_id = c.id
      JOIN baskets b ON lwo.basket_id = b.id
      LEFT JOIN sizes s ON lwo.size_id = s.id
      WHERE lwo.rn = 1
    `);

    if (activeCyclesWithLastWeightOp.length === 0) {
      console.log("Nessun ciclo attivo trovato");
      return 0;
    }

    let notificationsCreated = 0;

    for (const cycle of activeCyclesWithLastWeightOp) {
      // Calcola i giorni trascorsi dall'ultima operazione di peso
      const lastWeightDate = new Date(cycle.date);
      const daysSinceLastWeight = Math.floor((currentDate.getTime() - lastWeightDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calcola il peso proiettato basato sul tasso di crescita
      const currentAnimalsPerKg = cycle.animals_per_kg;
      
      // Simula la crescita per proiettare il nuovo valore di animali/kg
      // Nota: all'aumentare del peso, diminuisce il numero di animali per kg
      // per cui usiamo la formula inversa
      const weightIncreaseRatio = simulateGrowthWithDailySGR(1, dailyGrowthRate, daysSinceLastWeight);
      const projectedAnimalsPerKg = currentAnimalsPerKg / weightIncreaseRatio;
      
      // Verifica se il valore proiettato rientra nella taglia TP-3000
      if (await isTP3000Size(projectedAnimalsPerKg)) {
        // Crea una notifica
        const notificationId = await createTP3000Notification(
          cycle.cycle_id,
          cycle.basket_id,
          cycle.basket_number,
          projectedAnimalsPerKg
        );
        
        if (notificationId !== null) {
          notificationsCreated++;
        }
      }
    }

    return notificationsCreated;
  } catch (error) {
    console.error("Errore durante il controllo dei cicli per TP-3000:", error);
    return 0;
  }
}