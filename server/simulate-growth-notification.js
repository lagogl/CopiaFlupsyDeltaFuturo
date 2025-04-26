// Script per simulare una notifica di accrescimento TP-3000
import { db } from "./db";
import { sql } from "drizzle-orm";

async function createSimulatedGrowthNotification() {
  try {
    // 1. Crea una target_size_annotation
    const result = await db.execute(sql`
      INSERT INTO target_size_annotations
      (cycle_id, basket_id, target_size, projected_value, status, created_at)
      VALUES (4, 5, 'TP-3000', 3042, 'unread', NOW())
      RETURNING id
    `);
    
    console.log("Creata target_size_annotation:", result);
    
    if (result.length === 0) {
      console.error("Errore nella creazione dell'annotazione");
      return;
    }
    
    const annotationId = result[0].id;
    
    // 2. Crea la notifica generale
    const notification = await db.execute(sql`
      INSERT INTO notifications
      (type, title, message, is_read, created_at, related_entity_type, related_entity_id, data)
      VALUES (
        'accrescimento',
        'Taglia TP-3000 raggiunta',
        'Il cestello #5 (ciclo #4) ha raggiunto la taglia TP-3000 (3042 esemplari/kg)',
        false,
        NOW(),
        'target_size',
        ${annotationId},
        ${JSON.stringify({
          cycleId: 4,
          basketId: 5,
          basketNumber: 5,
          targetSize: 'TP-3000',
          projectedValue: 3042
        })}
      )
      RETURNING id
    `);
    
    console.log("Notifica creata:", notification);
    console.log("Simulazione completata con successo!");
    
  } catch (error) {
    console.error("Errore durante la simulazione:", error);
  }
}

// Esegui la funzione
createSimulatedGrowthNotification()
  .then(() => {
    console.log("Operazione completata");
    process.exit(0);
  })
  .catch(err => {
    console.error("Errore:", err);
    process.exit(1);
  });