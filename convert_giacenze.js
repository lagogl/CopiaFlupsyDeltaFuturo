/**
 * Script per convertire il formato JSON delle giacenze nel formato corretto per l'importazione
 * Uso: node convert_giacenze.js input.json output.json
 */

import fs from 'fs';

// Funzione per estrarre il peso medio dalla taglia (es. "TP-315" → 315)
function estraiPesoMedio(taglia) {
  if (!taglia) return 0;
  const parti = taglia.split('-');
  if (parti.length < 2) return 0;
  
  const valore = parseInt(parti[1]);
  return isNaN(valore) ? 0 : valore;
}

function convertiGiacenze(datiOriginali) {
  const risultato = {
    data_importazione: datiOriginali.data_importazione,
    fornitore: datiOriginali.fornitore,
    giacenze: []
  };
  
  // Mappa per assegnare sezioni in modo coerente agli stessi identificativi
  const mappaSezioni = {};
  let contatoreSezioni = 0;
  const sezioni = ['A', 'B', 'C', 'D', 'E'];
  
  // Prima creiamo un indice per consolidare elementi con stesso identificativo e taglia
  const elementiConsolidati = {};
  
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
  
  // Converti gli elementi consolidati
  Object.values(elementiConsolidati).forEach(g => {
    // Assegna una sezione coerente allo stesso identificativo
    if (!mappaSezioni[g.identificativo]) {
      mappaSezioni[g.identificativo] = sezioni[contatoreSezioni % sezioni.length];
      contatoreSezioni++;
    }
    
    // Estrai il peso medio dalla taglia o usa quello fornito
    const pesoMedio = g.mg_vongola > 0 ? g.mg_vongola : estraiPesoMedio(g.taglia);
    
    risultato.giacenze.push({
      vasca_id: `EXT-${g.identificativo}`,
      codice_sezione: mappaSezioni[g.identificativo],
      taglia: g.taglia,
      numero_animali: g.quantita,
      peso_medio_mg: pesoMedio,
      note: g.data_iniziale ? `Data iniziale: ${g.data_iniziale}` : ""
    });
  });
  
  return risultato;
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
    
    // Converti il formato
    const outputData = convertiGiacenze(inputData);
    
    // Scrivi il risultato nel file di output
    await fs.promises.writeFile(outputFile, JSON.stringify(outputData, null, 2));
    
    console.log(`Conversione completata! Il file ${outputFile} è stato creato.`);
    console.log(`Elementi originali: ${inputData.giacenze.length}`);
    console.log(`Elementi consolidati: ${outputData.giacenze.length}`);
  } catch (error) {
    console.error('Errore durante la conversione:', error);
  }
}

// Esegui la funzione principale
main();