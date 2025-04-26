import { db } from "../db";
import { and, eq, gte, lt, lte } from "drizzle-orm";
import { baskets, cycles, operations, sgr, sizes, targetSizeAnnotations } from "../../shared/schema";
import { isNotificationTypeEnabled } from "./notification-settings-controller";

/**
 * Converte un tasso di crescita mensile in tasso giornaliero equivalente
 * @param monthlyPercentage Percentuale di crescita mensile
 * @returns Percentuale di crescita giornaliera
 */
function monthlyToDaily(monthlyPercentage: number): number {
  // Formula: (1 + r)^(1/n) - 1, dove r è il tasso mensile e n è 30 (giorni)
  return Math.pow(1 + (monthlyPercentage / 100), 1/30) - 1;
}

/**
 * Simula la crescita di un peso usando il tasso di crescita giornaliero
 * @param initialWeight Peso iniziale in mg
 * @param dailyRate Tasso di crescita giornaliero in percentuale
 * @param days Numero di giorni per cui simulare la crescita
 * @returns Peso finale dopo il periodo di crescita
 */
function simulateGrowthWithDailySGR(initialWeight: number, dailyRate: number, days: number): number {
  // Formula per la crescita composta: FV = PV * (1 + r)^n
  // dove FV = valore futuro, PV = valore attuale, r = tasso, n = periodo
  return initialWeight * Math.pow(1 + dailyRate, days);
}

/**
 * Verifica se un valore di animali per kg rientra nella taglia TP-3000
 * @param animalsPerKg Valore di animali per kg da verificare
 * @returns true se il valore rientra nella taglia TP-3000, false altrimenti
 */
async function isTP3000Size(animalsPerKg: number): Promise<boolean> {
  try {
    // Ottieni la taglia TP-3000 dal database
    const [tp3000Size] = await db
      .select()
      .from(sizes)
      .where(eq(sizes.name, 'TP-3000'));
    
    if (!tp3000Size) {
      console.warn("Taglia TP-3000 non trovata nel database");
      return false;
    }
    
    // Verifica se il valore di animali per kg rientra nei limiti della taglia TP-3000
    return animalsPerKg <= tp3000Size.maxAnimalsPerKg && animalsPerKg >= tp3000Size.minAnimalsPerKg;
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
  return date.getMonth() + 1; // getMonth() ritorna 0-11, aggiungiamo 1 per ottenere 1-12
}

/**
 * Ottiene il tasso di crescita mensile dal database per il mese specificato
 * @param month Mese per cui ottenere il tasso (1-12)
 * @returns Promise con il tasso di crescita mensile o null se non trovato
 */
async function getMonthlyGrowthRate(month: number): Promise<number | null> {
  try {
    const [sgrData] = await db
      .select()
      .from(sgr)
      .where(eq(sgr.month, month));
    
    return sgrData ? sgrData.percentage : null;
  } catch (error) {
    console.error(`Errore nel recupero del tasso di crescita per il mese ${month}:`, error);
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
  basketNumber: number,
  projectedAnimalsPerKg: number
): Promise<number | null> {
  try {
    // Verifica se esiste già una notifica per questo ciclo
    const existingNotifications = await db
      .select()
      .from(targetSizeAnnotations)
      .where(and(
        eq(targetSizeAnnotations.cycleId, cycleId),
        eq(targetSizeAnnotations.targetSize, 'TP-3000')
      ));
    
    if (existingNotifications.length > 0) {
      console.log(`Notifica già esistente per il ciclo ${cycleId} taglia TP-3000`);
      return null;
    }
    
    // Crea l'annotazione di taglia target raggiunta
    const [annotation] = await db
      .insert(targetSizeAnnotations)
      .values({
        cycleId,
        basketId,
        targetSize: 'TP-3000',
        createdAt: new Date(),
        projectedValue: projectedAnimalsPerKg,
        status: 'unread'
      })
      .returning();
    
    if (!annotation) {
      console.error("Errore nella creazione dell'annotazione TP-3000");
      return null;
    }
    
    // Crea la notifica
    const [notification] = await db
      .insert(notifications)
      .values({
        title: `Taglia TP-3000 raggiunta!`,
        message: `Il cestello #${basketNumber} ha raggiunto la taglia TP-3000 con un valore di ${Math.round(projectedAnimalsPerKg)} animali/kg.`,
        createdAt: new Date(),
        isRead: false,
        type: 'accrescimento',
        referenceId: cycleId,
        referenceType: 'cycle'
      })
      .returning();
    
    return notification ? notification.id : null;
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
    // Verifica se le notifiche di accrescimento sono abilitate
    const notificationsEnabled = await isNotificationTypeEnabled('accrescimento');
    if (!notificationsEnabled) {
      console.log("Le notifiche di accrescimento sono disabilitate, controllo saltato");
      return 0;
    }
    
    // Ottieni tutti i cicli attivi
    const activeCycles = await db
      .select({
        cycle: cycles,
        basket: baskets
      })
      .from(cycles)
      .leftJoin(baskets, eq(cycles.basketId, baskets.id))
      .where(eq(cycles.state, 'active'));
    
    if (activeCycles.length === 0) {
      console.log("Nessun ciclo attivo trovato");
      return 0;
    }
    
    const today = new Date();
    const currentMonth = getMonthFromDate(today);
    const monthlyGrowthRate = await getMonthlyGrowthRate(currentMonth);
    
    if (monthlyGrowthRate === null) {
      console.error(`Nessun tasso di crescita trovato per il mese ${currentMonth}`);
      return 0;
    }
    
    // Converti il tasso mensile in tasso giornaliero
    const dailyGrowthRate = monthlyToDaily(monthlyGrowthRate);
    console.log(`Tasso di crescita: ${monthlyGrowthRate}% mensile, ${dailyGrowthRate * 100}% giornaliero`);
    
    let notificationsCreated = 0;
    
    // Per ogni ciclo attivo, verifica se ha raggiunto la taglia TP-3000
    for (const { cycle, basket } of activeCycles) {
      // Trova l'ultima operazione di misurazione per questo ciclo
      const [lastMeasurement] = await db
        .select()
        .from(operations)
        .where(and(
          eq(operations.basketId, cycle.basketId),
          gte(operations.date, cycle.startDate),
          eq(operations.type, 'misura')
        ))
        .orderBy(db.sql`${operations.date} DESC, ${operations.id} DESC`)
        .limit(1);
      
      if (!lastMeasurement || !lastMeasurement.animalsPerKg) {
        continue; // Nessuna misurazione trovata o misurazione senza animalsPerKg
      }
      
      // Calcola i giorni trascorsi dall'ultima misurazione
      const daysSinceLastMeasurement = Math.round(
        (today.getTime() - new Date(lastMeasurement.date).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Simula la crescita fino ad oggi
      const projectedAnimalsPerKg = lastMeasurement.animalsPerKg / 
        (simulateGrowthWithDailySGR(1, dailyGrowthRate, daysSinceLastMeasurement));
      
      // Verifica se il valore proiettato rientra nella taglia TP-3000
      const isNowTP3000 = await isTP3000Size(projectedAnimalsPerKg);
      
      if (isNowTP3000) {
        console.log(`Ciclo ${cycle.id} (cestello #${basket.physicalNumber}) ha raggiunto TP-3000 con ${Math.round(projectedAnimalsPerKg)} animali/kg`);
        
        // Crea una notifica
        const notificationId = await createTP3000Notification(
          cycle.id,
          cycle.basketId,
          basket.physicalNumber,
          projectedAnimalsPerKg
        );
        
        if (notificationId) {
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