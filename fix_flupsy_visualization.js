/**
 * Fix per il problema di visualizzazione nella mappa FLUPSY
 * 
 * Problema: Dopo l'ottimizzazione del database con viste materializzate, 
 * alcune visualizzazioni FLUPSY mostrano rettangoli bianchi invece dei dati 
 * sui cicli attivi e nella tabella dei FLUPSY vengono mostrati valori a zero.
 */

// =============================================
// SOLUZIONE 1: SERVER-SIDE (file server/routes.ts)
// =============================================

// Aggiorna l'endpoint /api/flupsys per utilizzare le viste materializzate
// Cerca il codice seguente intorno alla linea 800-850:

/*
app.get("/api/flupsys", async (req, res) => {
  try {
    // Ottenere i FLUPSY base
    const flupsys = await storage.getFlupsys();
    
    // Aggiungere statistiche per ciascun FLUPSY se richiesto
    const includeStats = req.query.includeStats === 'true';
    
    if (includeStats) {
      // Per ogni FLUPSY, aggiungi informazioni sui cestelli e cicli attivi
      const enhancedFlupsys = await Promise.all(flupsys.map(async (flupsy) => {
        // ... [codice esistente]
*/

// Sostituire con:

/*
app.get("/api/flupsys", async (req, res) => {
  try {
    // Ottenere i FLUPSY base
    const flupsys = await storage.getFlupsys();
    
    // Aggiungere statistiche per ciascun FLUPSY se richiesto
    const includeStats = req.query.includeStats === 'true';
    
    if (includeStats) {
      // Per ogni FLUPSY, aggiungi informazioni sui cestelli e cicli attivi
      const enhancedFlupsys = await Promise.all(flupsys.map(async (flupsy) => {
        // Ottieni tutti i cestelli associati a questo FLUPSY
        const baskets = await storage.getBasketsByFlupsy(flupsy.id);
        
        // Array per memorizzare gli ID dei cestelli
        const basketIds = baskets.map(b => b.id);
        
        // Utilizzare vista materializzata mv_active_cycles_stats per ottenere i conteggi dei cicli attivi
        let activeBaskets = 0;
        let totalAnimals = 0;
        const sizeDistribution = {};
        
        try {
          // Ottieni statistiche dalla vista materializzata
          const statsResult = await db.execute(
            sql`SELECT COUNT(*) as activeCount, COALESCE(SUM(animal_count), 0) as totalAnimals 
                FROM mv_active_baskets 
                WHERE flupsy_id = ${flupsy.id}`
          );
          
          if (statsResult && statsResult.length > 0) {
            activeBaskets = Number(statsResult[0].activecount || 0);
            totalAnimals = Number(statsResult[0].totalanimals || 0);
          }
          
          // Ottieni la distribuzione delle taglie
          const sizeResult = await db.execute(
            sql`SELECT s.code, COALESCE(SUM(b.animal_count), 0) as count
                FROM mv_active_baskets b
                LEFT JOIN sizes s ON b.size_id = s.id
                WHERE b.flupsy_id = ${flupsy.id}
                GROUP BY s.code`
          );
          
          if (sizeResult && sizeResult.length > 0) {
            sizeResult.forEach(row => {
              if (row.code) {
                sizeDistribution[row.code] = Number(row.count || 0);
              }
            });
          }
        } catch (e) {
          console.error('Errore nel recupero statistiche da vista materializzata:', e);
          // Fallback al metodo originale in caso di errore
          // [Inserire qui il codice originale di calcolo come fallback]
        }
        
        // Calcola il numero di cestelli disponibili
        const totalBaskets = baskets.length;
        const availableBaskets = totalBaskets - activeBaskets;
        
        // Calcola le posizioni occupate e posizioni libere
        const maxPositions = flupsy.maxPositions || 10;
        const freePositions = Math.max(0, maxPositions - totalBaskets);
        
        // Calcola statistiche aggiuntive
        const basketsWithAnimals = activeBaskets;
        const avgAnimalDensity = basketsWithAnimals > 0 ? Math.round(totalAnimals / basketsWithAnimals) : 0;
        const activeBasketPercentage = maxPositions > 0 ? Math.round((activeBaskets / maxPositions) * 100) : 0;
        
        // Aggiungi le statistiche al FLUPSY
        return {
          ...flupsy,
          totalBaskets,
          activeBaskets,
          availableBaskets,
          freePositions,
          totalAnimals,
          sizeDistribution,
          avgAnimalDensity,
          activeBasketPercentage
        };
      }));
      
      return res.json(enhancedFlupsys);
    }
    
    // Altrimenti, restituisci i FLUPSY senza statistiche aggiuntive
    res.json(flupsys);
  } catch (error) {
    console.error("Error fetching FLUPSY units:", error);
    res.status(500).json({ message: "Failed to fetch FLUPSY units" });
  }
});
*/

// =============================================
// SOLUZIONE 2: CLIENT-SIDE (file client/src/components/flupsy/FlupsyTableView.tsx)
// =============================================

// Nel componente che gestisce la visualizzazione della tabella FLUPSY,
// assicurarsi che i dati a zero vengano gestiti correttamente:

/*
// Gestire i valori zero nei dati
const displayValue = (value) => {
  // Se è un numero, mostralo anche se è 0
  if (typeof value === 'number') {
    return value;
  }
  // Altrimenti mostra 0 per valori null/undefined
  return value || 0;
};

// Esempio di utilizzo nella tabella
<TableCell>
  {displayValue(flupsy.activeBaskets)}
</TableCell>
<TableCell>
  {displayValue(flupsy.totalAnimals).toLocaleString('it-IT')}
</TableCell>
*/

// =============================================
// SOLUZIONE 3: CLIENT-SIDE (file client/src/pages/FlupsyComparison.tsx)
// =============================================

// Nel componente che gestisce la visualizzazione della mappa FLUPSY,
// assicurarsi che i rettangoli vengano visualizzati anche con dati mancanti:

/*
// Aggiornare il renderizzatore del cestello
const renderCurrentBasket = (basket) => {
  const cardSize = getBasketCardSize();
  const width = cardSize.width;
  const height = cardSize.height;
  
  if (!basket) return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`basket-card p-2 rounded border-2 border-dashed border-gray-300 ${height} ${width} flex items-center justify-center text-gray-400 text-xs cursor-pointer`}>
            Vuoto
          </div>
        </TooltipTrigger>
        <HighContrastTooltip>
          <div className="p-2 max-w-xs">
            <div className="font-medium text-gray-700 mb-1">Posizione non assegnata</div>
            <div className="text-sm text-gray-600">
              Nessun cestello presente in questa posizione.
            </div>
          </div>
        </HighContrastTooltip>
      </Tooltip>
    </TooltipProvider>
  );
  
  // Ottieni le informazioni di ciclo e operazioni
  const latestOperation = getLatestOperationForBasket(basket.id);
  const cycle = getCycleForBasket(basket.id);
  
  // Gestisci caso in cui non ci sono operazioni (importante!)
  if (!latestOperation && cycle) {
    // Cestello con ciclo attivo ma senza operazioni (o con operazioni non caricate correttamente)
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`basket-card p-2 rounded border-2 border-solid border-blue-300 bg-blue-50 ${height} ${width} flex flex-col items-center justify-center cursor-pointer`}>
              <div className="font-medium text-sm">Cesta #{basket.physicalNumber}</div>
              <div className="text-xs text-blue-700">Ciclo attivo</div>
            </div>
          </TooltipTrigger>
          <HighContrastTooltip>
            <div className="p-2 max-w-xs">
              <div className="font-bold mb-1">Cestello #{basket.physicalNumber}</div>
              <div className="text-sm text-gray-600">
                Ciclo attivo dal {cycle ? format(new Date(cycle.startDate), 'dd/MM/yyyy') : 'N/A'}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Dati animali non disponibili
              </div>
            </div>
          </HighContrastTooltip>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  // [resto del codice di renderizzazione...]
*/