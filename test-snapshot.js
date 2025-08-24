#!/usr/bin/env node

/**
 * Script per testare l'endpoint di snapshot del database
 * Uso: node test-snapshot.js [PRIMA|DOPO]
 */

const fs = require('fs');
const path = require('path');

// Configurazione
const API_BASE = process.env.API_URL || 'http://localhost:5000';
const SNAPSHOT_DIR = './snapshots';

// Crea la directory snapshots se non esiste
if (!fs.existsSync(SNAPSHOT_DIR)) {
  fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
}

async function fetchSnapshot(label = '') {
  try {
    console.log(`📊 Generazione snapshot ${label}...`);
    
    const response = await fetch(`${API_BASE}/api/database-snapshot`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Errore sconosciuto');
    }
    
    const snapshot = data.snapshot;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `snapshot-${label.toLowerCase()}-${timestamp}.json`;
    const filepath = path.join(SNAPSHOT_DIR, filename);
    
    // Salva il snapshot su file
    fs.writeFileSync(filepath, JSON.stringify(snapshot, null, 2));
    
    console.log(`✅ Snapshot ${label} salvato: ${filepath}`);
    console.log('\n📈 STATISTICHE:');
    console.log(`  • FLUPSY attivi: ${snapshot.stats.totalFlupsys}`);
    console.log(`  • Cestelli totali: ${snapshot.stats.totalBaskets}`);
    console.log(`  • Cestelli con cicli attivi: ${snapshot.stats.totalActiveBaskets}`);
    console.log(`  • Animali totali: ${snapshot.stats.totalAnimals.toLocaleString()}`);
    console.log(`  • Peso totale: ${(snapshot.stats.totalWeight / 1000).toFixed(1)} kg`);
    console.log(`  • Lotti attivi: ${snapshot.stats.totalActiveLots}`);
    console.log(`  • Operazioni recenti: ${snapshot.stats.totalRecentOperations}`);
    
    return { snapshot, filepath };
    
  } catch (error) {
    console.error(`❌ Errore durante lo snapshot ${label}:`, error.message);
    process.exit(1);
  }
}

async function main() {
  const label = process.argv[2] || 'TEST';
  
  if (!['PRIMA', 'DOPO', 'TEST'].includes(label.toUpperCase())) {
    console.log('Uso: node test-snapshot.js [PRIMA|DOPO|TEST]');
    console.log('');
    console.log('Esempi:');
    console.log('  node test-snapshot.js PRIMA    # Snapshot prima della vagliatura');
    console.log('  node test-snapshot.js DOPO     # Snapshot dopo la vagliatura');
    console.log('  node test-snapshot.js TEST     # Snapshot di test');
    process.exit(1);
  }
  
  await fetchSnapshot(label.toUpperCase());
  
  // Mostra i file di snapshot esistenti
  console.log('\n📁 SNAPSHOT ESISTENTI:');
  const files = fs.readdirSync(SNAPSHOT_DIR)
    .filter(file => file.endsWith('.json'))
    .sort()
    .reverse(); // Più recenti prima
    
  if (files.length === 0) {
    console.log('  (Nessun snapshot trovato)');
  } else {
    files.slice(0, 5).forEach(file => { // Mostra solo i 5 più recenti
      const filepath = path.join(SNAPSHOT_DIR, file);
      const stats = fs.statSync(filepath);
      console.log(`  • ${file} (${stats.size} bytes, ${stats.mtime.toLocaleString()})`);
    });
    
    if (files.length > 5) {
      console.log(`  ... e altri ${files.length - 5} file`);
    }
  }
}

// Esegui solo se chiamato direttamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { fetchSnapshot };