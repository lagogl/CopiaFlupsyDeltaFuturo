/**
 * Ottimizzazione dell'endpoint della dashboard
 * 
 * Questo script aggiunge un nuovo endpoint ottimizzato per la dashboard
 * che carica tutti i dati necessari in un'unica chiamata, riducendo drasticamente i tempi di caricamento.
 */

const optimizedDashboardEndpoint = `
// Nuovo endpoint ottimizzato per le statistiche della dashboard
app.get("/api/dashboard/stats", async (req, res) => {
  console.time('dashboard-stats');
  
  try {
    // Leggi i parametri di filtro
    const center = req.query.center as string;
    const flupsyIdsParam = req.query.flupsyIds as string;
    
    // Converte i flupsyIds in array di numeri se presente
    const flupsyIds = flupsyIdsParam ? flupsyIdsParam.split(',').map(id => parseInt(id, 10)) : [];
    
    // Query per recuperare SOLO i cestelli attivi (o filtrati)
    let basketsQuery = db.select().from(storage.baskets).where(eq(storage.baskets.state, 'active'));
    
    // Applica filtri aggiuntivi se specificati
    if (flupsyIds.length > 0) {
      basketsQuery = basketsQuery.where(inArray(storage.baskets.flupsyId, flupsyIds));
    }
    
    // Esegue le query in parallelo per massimizzare la velocità
    const [
      baskets,
      activeCycles,
      activeLots
    ] = await Promise.all([
      // Query cestelli già definita sopra
      basketsQuery,
      
      // Query per recuperare solo i cicli attivi
      db.select().from(storage.cycles).where(eq(storage.cycles.state, 'active')),
      
      // Query per recuperare solo i lotti attivi
      db.select().from(storage.lots).where(eq(storage.lots.state, 'active'))
    ]);
    
    // Recupera gli ID dei cestelli per filtrare le operazioni
    const basketIds = baskets.map(b => b.id);
    
    // Query per recuperare le operazioni di oggi
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayOperations = basketIds.length > 0 ? 
      await db.select()
        .from(storage.operations)
        .where(eq(storage.operations.date, today))
        .where(inArray(storage.operations.basketId, basketIds)) : [];
    
    // Query per recuperare solo le operazioni più recenti per ogni cestello
    const recentOperations = basketIds.length > 0 ? 
      await db.select()
        .from(storage.operations)
        .where(inArray(storage.operations.basketId, basketIds))
        .orderBy(sql\`\${storage.operations.date} DESC, \${storage.operations.id} DESC\`) : [];
    
    // Trova l'operazione più recente per ogni cestello
    const lastOperationByBasket = new Map();
    recentOperations.forEach(op => {
      if (!lastOperationByBasket.has(op.basketId)) {
        lastOperationByBasket.set(op.basketId, op);
      }
    });
    
    // Converti la mappa in array
    const latestOperations = Array.from(lastOperationByBasket.values());
    
    console.timeEnd('dashboard-stats');
    
    // Restituisci tutti i dati necessari in un'unica risposta
    res.status(200).json({
      baskets,
      cycles: activeCycles,
      operations: latestOperations,
      todayOperations,
      lots: activeLots,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Errore nel recupero delle statistiche dashboard:", error);
    res.status(500).json({ error: "Errore nel recupero delle statistiche dashboard" });
  }
});
`;

console.log("Endpoint ottimizzato per la dashboard pronto per l'implementazione");
console.log("Per implementarlo, aggiungilo in server/routes.ts, subito dopo una route esistente, ad esempio dopo l'endpoint GET /api/flupsys");