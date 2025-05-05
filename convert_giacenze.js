/**
 * Script per convertire il formato JSON delle giacenze nel formato corretto per l'importazione
 * Uso: node convert_giacenze.js input.json output.json
 */

import fs from 'fs';
import pg from 'pg';

// Mappa delle taglie standard - usata solo come fallback se non è possibile recuperare i dati dal DB
const TAGLIE_STANDARD = {
  'TP-180': 180,
  'TP-200': 200,
  'TP-315': 315,
  'TP-450': 450,
  'TP-500': 500,
  'TP-600': 600,
  'TP-700': 700,
  'TP-800': 800,
  'TP-1000': 1000,
  'TP-1140': 1140,
  'TP-1260': 1260,
  'TP-1500': 1500,
  'TP-1800': 1800,
  'TP-2000': 2000,
  'TP-2500': 2500,
  'TP-3000': 3000,
  'TP-3500': 3500,
  'TP-4000': 4000,
  'TP-5000': 5000,
  'TP-6000': 6000,
  'TP-7000': 7000,
  'TP-8000': 8000,
  'TP-9000': 9000,
  'TP-10000': 10000
};

// Connessione al database
async function getDbConnection() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('Attenzione: DATABASE_URL non impostata. Impossibile connettersi al database.');
    return null;
  }

  try {
    const client = new pg.Client({ connectionString });
    await client.connect();
    console.log('Connessione al database stabilita con successo.');
    return client;
  } catch (error) {
    console.error('Errore nella connessione al database:', error.message);
    return null;
  }
}

// Recupera i pesi medi dalle operazioni più recenti
async function recuperaPesiMediDaOperazioni() {
  const client = await getDbConnection();
  if (!client) {
    console.warn('Impossibile recuperare i pesi medi dal database. Verranno utilizzati i valori predefiniti.');
    return {};
  }

  try {
    // Query per trovare l'ultimo peso medio registrato per ogni lotto
    const query = `
      WITH latest_operations AS (
        SELECT 
          DISTINCT ON (o.lot_id) o.id, 
          o.basket_id,
          o.lot_id,
          l.supplier,
          o.average_weight
        FROM 
          operations o
        JOIN 
          lots l ON o.lot_id = l.id
        WHERE 
          o.average_weight IS NOT NULL
          AND o.average_weight > 0
        ORDER BY 
          o.lot_id, o.date DESC, o.id DESC
      )
      SELECT 
        l.supplier,
        l.id as lot_id,
        lo.average_weight
      FROM 
        latest_operations lo
      JOIN 
        lots l ON lo.lot_id = l.id
    `;

    const result = await client.query(query);
    
    // Crea una mappa lotto_id -> peso_medio
    const pesiMedi = {};
    result.rows.forEach(row => {
      // Estrai il codice dall'identificativo del fornitore (es. "RACE-L22" -> "L22")
      const codiceMatch = row.supplier.match(/[A-Z]-([A-Z][0-9]+)/);
      const codice = codiceMatch ? codiceMatch[1] : `L${row.lot_id}`;
      
      // Crea chiavi sia per formato "RACE-L22" che per "L22"
      pesiMedi[`RACE-${codice}`] = parseFloat(row.average_weight);
      pesiMedi[`BINS-${codice}`] = parseFloat(row.average_weight);
      pesiMedi[codice] = parseFloat(row.average_weight);
    });

    console.log(`Recuperati ${Object.keys(pesiMedi).length} pesi medi dal database.`);
    await client.end();
    return pesiMedi;
  } catch (error) {
    console.error('Errore nel recupero dei pesi medi:', error.message);
    await client.end();
    return {};
  }
}

// Funzione per estrarre il peso medio dalla taglia (es. "TP-315" → 315) o dal database
async function estraiPesoMedio(identificativo, taglia, pesiMediDB) {
  // Verifica se abbiamo un peso medio nel database per questo identificativo
  if (pesiMediDB && pesiMediDB[identificativo] && pesiMediDB[identificativo] > 0) {
    return pesiMediDB[identificativo];
  }
  
  // Fallback alla taglia se non troviamo un peso medio nel DB
  if (!taglia) return 0.0001; // Valore minimo se non c'è la taglia
  
  // Controlla se è una taglia standard (caso più comune)
  if (TAGLIE_STANDARD[taglia]) {
    return TAGLIE_STANDARD[taglia];
  }
  
  // Altrimenti prova a estrarre il valore numerico dalla taglia
  const parti = taglia.split('-');
  if (parti.length < 2) return 0.0001; // Valore minimo se formato taglia non valido
  
  const valore = parseFloat(parti[1]);
  
  // Garantisce che il valore non sia mai 0, minimo 0.0001
  return isNaN(valore) || valore <= 0 ? 0.0001 : valore;
}

async function convertiGiacenze(datiOriginali) {
  // Recupera i pesi medi dal database
  const pesiMediDB = await recuperaPesiMediDaOperazioni();
  
  // Crea un indice per mappare identificativo+taglia ai pesi medi calcolati
  const mappaPesiMedi = {};
  
  // Prima creiamo un indice per consolidare elementi con stesso identificativo e taglia
  const elementiConsolidati = {};
  
  // Risultato finale nel formato richiesto dal sistema
  const risultatoFinale = {
    data_importazione: datiOriginali.data_importazione,
    fornitore: datiOriginali.fornitore,
    giacenze: []
  };
  
  // Risultato mantenendo il formato originale ma con pesi medi aggiornati
  const risultatoOriginale = {
    data_importazione: datiOriginali.data_importazione,
    fornitore: datiOriginali.fornitore,
    giacenze: []
  };
  
  // Mappa per assegnare sezioni in modo coerente agli stessi identificativi
  const mappaSezioni = {};
  let contatoreSezioni = 0;
  const sezioni = ['A', 'B', 'C', 'D', 'E'];
  
  // Fase 1: Consolidare gli elementi con stesso identificativo e taglia
  datiOriginali.giacenze.forEach(g => {
    const chiave = `${g.identificativo}|${g.taglia}`;
    
    if (!elementiConsolidati[chiave]) {
      elementiConsolidati[chiave] = {
        identificativo: g.identificativo,
        taglia: g.taglia,
        quantita: 0,
        data_iniziale: g.data_iniziale,
        mg_vongola: g.mg_vongola || 0
      };
    }
    
    // Somma le quantità per lo stesso identificativo+taglia
    elementiConsolidati[chiave].quantita += g.quantita;
    
    // Mantieni la data più recente
    if (g.data_iniziale > elementiConsolidati[chiave].data_iniziale) {
      elementiConsolidati[chiave].data_iniziale = g.data_iniziale;
    }
  });
  
  // Fase 2: Determina i pesi medi per ogni combinazione identificativo+taglia
  const promesseCalcoloPesi = Object.values(elementiConsolidati).map(async (g) => {
    const chiave = `${g.identificativo}|${g.taglia}`;
    let pesoMedio;
    
    // 1. Se il valore è fornito nell'input ed è maggiore di zero, usalo
    if (g.mg_vongola > 0) {
      pesoMedio = g.mg_vongola;
      console.log(`Usando peso medio fornito per ${g.identificativo}: ${pesoMedio} mg`);
    }
    // 2. Altrimenti, prova a recuperare dal database
    else if (pesiMediDB[g.identificativo]) {
      pesoMedio = pesiMediDB[g.identificativo];
      console.log(`Usando peso medio dal database per ${g.identificativo}: ${pesoMedio} mg`);
    }
    // 3. Come ultima risorsa, estrai dalla taglia
    else {
      pesoMedio = await estraiPesoMedio(g.identificativo, g.taglia, pesiMediDB);
      console.log(`Peso medio estratto dalla taglia ${g.taglia} per ${g.identificativo}: ${pesoMedio} mg`);
    }
    
    // Garantiamo un valore minimo con 4 decimali di precisione
    if (pesoMedio <= 0) {
      pesoMedio = 0.0001;
    }
    
    // Arrotonda a 4 decimali per mantenere precisione
    pesoMedio = parseFloat(pesoMedio.toFixed(4));
    
    // Salva il peso medio nella mappa
    mappaPesiMedi[chiave] = pesoMedio;
    
    // Assegna una sezione coerente allo stesso identificativo
    if (!mappaSezioni[g.identificativo]) {
      mappaSezioni[g.identificativo] = sezioni[contatoreSezioni % sezioni.length];
      contatoreSezioni++;
    }
    
    // Aggiungi al risultato nel formato richiesto dal sistema
    risultatoFinale.giacenze.push({
      vasca_id: `EXT-${g.identificativo}`,
      codice_sezione: mappaSezioni[g.identificativo],
      taglia: g.taglia,
      numero_animali: g.quantita,
      peso_medio_mg: pesoMedio,
      note: g.data_iniziale ? `Data iniziale: ${g.data_iniziale}` : ""
    });
  });
  
  await Promise.all(promesseCalcoloPesi);
  
  // Fase 3: Crea anche una versione che mantiene il formato originale ma con pesi medi aggiornati
  datiOriginali.giacenze.forEach(g => {
    const chiave = `${g.identificativo}|${g.taglia}`;
    const pesoMedio = mappaPesiMedi[chiave] || 0.0001;
    
    risultatoOriginale.giacenze.push({
      identificativo: g.identificativo,
      taglia: g.taglia,
      quantita: g.quantita,
      data_iniziale: g.data_iniziale,
      mg_vongola: pesoMedio
    });
  });
  
  // Salva il risultato che mantiene il formato originale
  await fs.promises.writeFile(
    'giacenze_output_originale.json', 
    JSON.stringify(risultatoOriginale, null, 2)
  );
  
  console.log("Creato anche file di output in formato originale con pesi medi aggiornati: giacenze_output_originale.json");
  
  return risultatoFinale;
}

// Funzione principale per eseguire la conversione
async function main() {
  // Gestione degli argomenti da linea di comando
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Uso: node convert_giacenze.js input.json output.json');
    process.exit(1);
  }

  const inputFile = args[0];
  const outputFile = args[1];

  try {
    // Leggi il file JSON di input
    const inputData = JSON.parse(await fs.promises.readFile(inputFile, 'utf8'));
    
    console.log('Inizio conversione del formato...');
    console.log('Recupero pesi medi dai dati delle operazioni in database...');
    
    // Converti il formato (attendi la risoluzione della promessa)
    const outputData = await convertiGiacenze(inputData);
    
    // Scrivi il risultato nel file di output
    await fs.promises.writeFile(outputFile, JSON.stringify(outputData, null, 2));
    
    console.log('\nRiepilogo della conversione:');
    console.log(`- Elementi originali: ${inputData.giacenze.length}`);
    console.log(`- Elementi consolidati: ${outputData.giacenze.length}`);
    console.log(`- File output: ${outputFile}`);
    console.log('\nConversione completata con successo!');
  } catch (error) {
    console.error('Errore durante la conversione:', error);
    process.exit(1);
  }
}

// Esegui la funzione principale
main();