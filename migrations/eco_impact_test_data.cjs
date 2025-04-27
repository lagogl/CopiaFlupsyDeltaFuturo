// Script per inserire dati di prova nelle tabelle Eco-impact
const { Pool } = require('pg');

// Creiamo una connessione al database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createTestData() {
  console.log("Iniziando l'inserimento dei dati di prova per Eco-impact...");
  const client = await pool.connect();

  try {
    // 1. Otteniamo l'ID delle categorie di impatto
    const categoriesResult = await client.query(`
      SELECT id, name FROM impact_categories;
    `);
    const categories = categoriesResult.rows;
    console.log(`Trovate ${categories.length} categorie di impatto`);
    
    if (categories.length === 0) {
      throw new Error("Nessuna categoria di impatto trovata. Eseguire prima eco_impact_tables.cjs");
    }
    
    // Mappa degli ID categoria per nome
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name] = cat.id;
    });
    
    // 2. Otteniamo alcuni FLUPSY per associare i dati
    const flupsysResult = await client.query(`
      SELECT id, name FROM flupsys LIMIT 5;
    `);
    const flupsys = flupsysResult.rows;
    console.log(`Trovati ${flupsys.length} FLUPSY per associare i dati`);
    
    if (flupsys.length === 0) {
      throw new Error("Nessun FLUPSY trovato nel database");
    }
    
    // 3. Inseriamo alcuni fattori di impatto
    await client.query(`
      INSERT INTO impact_factors (category_id, operation_type, factor_value, unit, description)
      VALUES 
        ($1, 'pulizia', 1.5, 'm³', 'Consumo acqua per operazione di pulizia'),
        ($2, 'pulizia', 0.8, 'kg', 'Emissioni CO2 per operazione di pulizia'),
        ($3, 'pulizia', 1.2, 'kWh', 'Consumo energetico per pulizia'),
        ($1, 'vagliatura', 2.3, 'm³', 'Consumo acqua per operazione di vagliatura'),
        ($2, 'vagliatura', 1.2, 'kg', 'Emissioni CO2 per operazione di vagliatura'),
        ($3, 'vagliatura', 2.5, 'kWh', 'Consumo energetico per vagliatura')
      ON CONFLICT DO NOTHING;
    `, [categoryMap.water, categoryMap.carbon, categoryMap.energy]);
    console.log("Fattori di impatto inseriti");
    
    // 4. Inseriamo alcuni impatti per i FLUPSY
    for (const flupsy of flupsys) {
      // Impatto acqua
      await client.query(`
        INSERT INTO flupsy_impacts (flupsy_id, category_id, impact_value, time_period, start_date, end_date)
        VALUES ($1, $2, $3, 'monthly', NOW() - INTERVAL '3 MONTHS', NOW())
        ON CONFLICT DO NOTHING;
      `, [flupsy.id, categoryMap.water, (Math.random() * 100 + 50).toFixed(2)]);
      
      // Impatto CO2
      await client.query(`
        INSERT INTO flupsy_impacts (flupsy_id, category_id, impact_value, time_period, start_date, end_date)
        VALUES ($1, $2, $3, 'monthly', NOW() - INTERVAL '3 MONTHS', NOW())
        ON CONFLICT DO NOTHING;
      `, [flupsy.id, categoryMap.carbon, (Math.random() * 50 + 20).toFixed(2)]);
      
      // Impatto energetico
      await client.query(`
        INSERT INTO flupsy_impacts (flupsy_id, category_id, impact_value, time_period, start_date, end_date)
        VALUES ($1, $2, $3, 'monthly', NOW() - INTERVAL '3 MONTHS', NOW())
        ON CONFLICT DO NOTHING;
      `, [flupsy.id, categoryMap.energy, (Math.random() * 200 + 100).toFixed(2)]);
    }
    console.log("Impatti dei FLUPSY inseriti");
    
    // 5. Inseriamo alcuni obiettivi di sostenibilità
    const goalStatuses = ['planned', 'in-progress', 'completed'];
    
    for (const flupsy of flupsys) {
      const randomStatus = goalStatuses[Math.floor(Math.random() * goalStatuses.length)];
      const currentValue = Math.floor(Math.random() * 80);
      const targetValue = currentValue + Math.floor(Math.random() * 50) + 20;
      
      await client.query(`
        INSERT INTO sustainability_goals (
          title, description, flupsy_id, category_id, 
          target_value, current_value, unit, status, target_date
        )
        VALUES (
          $1, $2, $3, $4, 
          $5, $6, $7, $8, $9
        )
        ON CONFLICT DO NOTHING;
      `, [
        `Riduzione consumo acqua ${flupsy.name}`,
        `Obiettivo di riduzione del consumo di acqua per il FLUPSY ${flupsy.name} attraverso l'ottimizzazione dei processi di pulizia`,
        flupsy.id,
        categoryMap.water,
        targetValue,
        currentValue,
        'm³',
        randomStatus,
        new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 giorni da oggi
      ]);
      
      await client.query(`
        INSERT INTO sustainability_goals (
          title, description, flupsy_id, category_id, 
          target_value, current_value, unit, status, target_date
        )
        VALUES (
          $1, $2, $3, $4, 
          $5, $6, $7, $8, $9
        )
        ON CONFLICT DO NOTHING;
      `, [
        `Riduzione emissioni CO2 ${flupsy.name}`,
        `Obiettivo di riduzione delle emissioni di CO2 per il FLUPSY ${flupsy.name} attraverso l'uso di energie rinnovabili`,
        flupsy.id,
        categoryMap.carbon,
        Math.floor(Math.random() * 50) + 100,
        Math.floor(Math.random() * 50),
        'kg',
        goalStatuses[Math.floor(Math.random() * goalStatuses.length)],
        new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) // 180 giorni da oggi
      ]);
    }
    console.log("Obiettivi di sostenibilità inseriti");
    
    // 6. Inseriamo alcuni report di sostenibilità
    await client.query(`
      INSERT INTO sustainability_reports (
        title, report_period, start_date, end_date, 
        summary, highlights, metrics, flupsy_ids
      )
      VALUES (
        'Report Trimestrale Q1 2025', 'Q1 2025', 
        '2025-01-01', '2025-03-31',
        'Analisi dell\'impatto ambientale per il primo trimestre del 2025. Osservato un miglioramento del 12% rispetto al trimestre precedente.',
        '{"points": ["Riduzione del 15% nel consumo di acqua", "Aumento dell\'efficienza energetica del 8%", "Implementazione di nuovi protocolli di sostenibilità"]}',
        '{"water": 245.3, "carbon": 132.8, "energy": 456.2}',
        ARRAY[${flupsys.map(f => f.id).join(', ')}]
      ),
      (
        'Report Annuale 2024', 'Anno 2024', 
        '2024-01-01', '2024-12-31',
        'Report annuale completo sull\'impatto ambientale per l\'anno 2024. Analisi dettagliata di tutte le metriche di sostenibilità con confronto rispetto agli anni precedenti.',
        '{"points": ["Riduzione complessiva del 22% nelle emissioni di CO2", "Implementazione completa del sistema di monitoraggio in tempo reale", "Certificazione ambientale ottenuta per 3 siti produttivi"]}',
        '{"water": 1245.3, "carbon": 832.8, "energy": 2456.2, "waste": 345.6, "biodiversity": 78.3}',
        ARRAY[${flupsys.map(f => f.id).join(', ')}]
      )
      ON CONFLICT DO NOTHING;
    `);
    console.log("Report di sostenibilità inseriti");
    
    console.log("Inserimento dei dati di prova completato con successo");
  } catch (error) {
    console.error("Errore durante l'inserimento dei dati:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Eseguiamo la funzione
createTestData()
  .then(() => {
    console.log("Dati di prova Eco-impact creati con successo!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Errore nella creazione dei dati di prova:", error);
    process.exit(1);
  });