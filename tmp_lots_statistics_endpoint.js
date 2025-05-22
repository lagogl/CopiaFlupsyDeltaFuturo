// Endpoint per ottenere statistiche reali dei lotti
app.get("/api/lots/statistics", async (req, res) => {
  try {
    console.time('fetch-lot-statistics');
    
    // Calcola statistiche direttamente dal database in una singola query
    const statsQuery = await db.execute(sql`
      SELECT
        COUNT(*) as total_count,
        COALESCE(SUM(animal_count), 0) as totale,
        COALESCE(SUM(CASE WHEN quality = 'normali' THEN animal_count ELSE 0 END), 0) as normali,
        COALESCE(SUM(CASE WHEN quality = 'teste' THEN animal_count ELSE 0 END), 0) as teste,
        COALESCE(SUM(CASE WHEN quality = 'code' THEN animal_count ELSE 0 END), 0) as code
      FROM lots
    `);
    
    // Estrai i risultati
    const stats = statsQuery[0] || { 
      total_count: 0,
      totale: 0, 
      normali: 0, 
      teste: 0, 
      code: 0 
    };
    
    // Calcola le percentuali
    const totalCount = Number(stats.total_count) || 0;
    const totale = Number(stats.totale) || 0;
    const normali = Number(stats.normali) || 0;
    const teste = Number(stats.teste) || 0;
    const code = Number(stats.code) || 0;
    
    // Evita divisione per zero
    const percentages = {
      normali: totale > 0 ? Number(((normali / totale) * 100).toFixed(1)) : 0,
      teste: totale > 0 ? Number(((teste / totale) * 100).toFixed(1)) : 0,
      code: totale > 0 ? Number(((code / totale) * 100).toFixed(1)) : 0
    };
    
    console.timeEnd('fetch-lot-statistics');
    console.log('Statistiche lotti recuperate:', { totalCount, counts: { normali, teste, code, totale }, percentages });
    
    return res.json({
      totalCount,
      counts: { normali, teste, code, totale },
      percentages
    });
  } catch (error) {
    console.error("Errore nel recupero delle statistiche dei lotti:", error);
    return res.status(500).json({ message: "Errore interno del server" });
  }
});