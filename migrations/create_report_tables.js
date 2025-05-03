// migrations/create_report_tables.js
import { db } from '../server/db.js';

/**
 * Script di migrazione per creare le tabelle di report e rapporti
 * 
 * Questo script crea le tabelle necessarie per il sistema di generazione report:
 * - reports: tabella generale dei report
 * - delivery_reports: report specifici per le consegne
 * - sales_reports: report specifici per le vendite
 * - report_templates: modelli di report
 */

async function createTables() {
  console.log('Avvio creazione tabelle per sistema di report...');
  
  try {
    // Crea la tabella reports
    await db.execute(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        format TEXT NOT NULL DEFAULT 'pdf',
        parameters JSONB,
        file_path TEXT,
        file_size INTEGER,
        generated_by INTEGER,
        start_date DATE,
        end_date DATE,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE,
        error TEXT,
        metadata JSONB
      );
    `);
    console.log('✓ Tabella reports creata');
    
    // Crea la tabella delivery_reports
    await db.execute(`
      CREATE TABLE IF NOT EXISTS delivery_reports (
        id SERIAL PRIMARY KEY,
        report_id INTEGER NOT NULL,
        order_id INTEGER NOT NULL,
        client_id INTEGER NOT NULL,
        delivery_date DATE NOT NULL,
        total_items INTEGER NOT NULL,
        total_weight NUMERIC(10, 3),
        transport_info TEXT,
        notes TEXT,
        signed_by TEXT,
        signature_image_path TEXT,
        gps_coordinates TEXT,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Tabella delivery_reports creata');
    
    // Crea la tabella sales_reports
    await db.execute(`
      CREATE TABLE IF NOT EXISTS sales_reports (
        id SERIAL PRIMARY KEY,
        report_id INTEGER NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        total_sales NUMERIC(12, 2) NOT NULL,
        total_vat NUMERIC(12, 2),
        total_orders INTEGER NOT NULL,
        completed_orders INTEGER NOT NULL,
        cancelled_orders INTEGER NOT NULL,
        top_size_id INTEGER,
        top_lot_id INTEGER,
        top_client_id INTEGER,
        total_weight NUMERIC(12, 3),
        avg_order_value NUMERIC(10, 2),
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Tabella sales_reports creata');
    
    // Crea la tabella report_templates
    await db.execute(`
      CREATE TABLE IF NOT EXISTS report_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        format TEXT NOT NULL DEFAULT 'pdf',
        template TEXT NOT NULL,
        parameters JSONB,
        is_default BOOLEAN DEFAULT FALSE,
        created_by INTEGER,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE,
        active BOOLEAN NOT NULL DEFAULT TRUE
      );
    `);
    console.log('✓ Tabella report_templates creata');
    
    // Crea indici per le relazioni
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
      CREATE INDEX IF NOT EXISTS idx_delivery_reports_report_id ON delivery_reports(report_id);
      CREATE INDEX IF NOT EXISTS idx_delivery_reports_order_id ON delivery_reports(order_id);
      CREATE INDEX IF NOT EXISTS idx_delivery_reports_client_id ON delivery_reports(client_id);
      CREATE INDEX IF NOT EXISTS idx_sales_reports_report_id ON sales_reports(report_id);
      CREATE INDEX IF NOT EXISTS idx_report_templates_type ON report_templates(type);
    `);
    console.log('✓ Indici creati');
    
    // Crea vincoli di chiave esterna
    await db.execute(`
      ALTER TABLE delivery_reports 
        ADD CONSTRAINT fk_delivery_reports_report_id 
        FOREIGN KEY (report_id) 
        REFERENCES reports(id) 
        ON DELETE CASCADE;
        
      ALTER TABLE delivery_reports 
        ADD CONSTRAINT fk_delivery_reports_order_id 
        FOREIGN KEY (order_id) 
        REFERENCES orders(id) 
        ON DELETE CASCADE;
        
      ALTER TABLE delivery_reports 
        ADD CONSTRAINT fk_delivery_reports_client_id 
        FOREIGN KEY (client_id) 
        REFERENCES clients(id) 
        ON DELETE RESTRICT;
        
      ALTER TABLE sales_reports 
        ADD CONSTRAINT fk_sales_reports_report_id 
        FOREIGN KEY (report_id) 
        REFERENCES reports(id) 
        ON DELETE CASCADE;
    `);
    console.log('✓ Vincoli di chiave esterna creati');
    
    // Aggiungi vincoli opzionali
    await db.execute(`
      ALTER TABLE sales_reports 
        ADD CONSTRAINT fk_sales_reports_top_client_id 
        FOREIGN KEY (top_client_id) 
        REFERENCES clients(id) 
        ON DELETE SET NULL;
        
      ALTER TABLE sales_reports 
        ADD CONSTRAINT fk_sales_reports_top_size_id 
        FOREIGN KEY (top_size_id) 
        REFERENCES sizes(id) 
        ON DELETE SET NULL;
        
      ALTER TABLE sales_reports 
        ADD CONSTRAINT fk_sales_reports_top_lot_id 
        FOREIGN KEY (top_lot_id) 
        REFERENCES lots(id) 
        ON DELETE SET NULL;
        
      ALTER TABLE reports 
        ADD CONSTRAINT fk_reports_generated_by 
        FOREIGN KEY (generated_by) 
        REFERENCES users(id) 
        ON DELETE SET NULL;
        
      ALTER TABLE report_templates 
        ADD CONSTRAINT fk_report_templates_created_by 
        FOREIGN KEY (created_by) 
        REFERENCES users(id) 
        ON DELETE SET NULL;
    `);
    console.log('✓ Vincoli opzionali creati');
    
    console.log('✅ Creazione tabelle per sistema di report completata con successo!');
    return true;
  } catch (error) {
    console.error('❌ Errore durante la creazione delle tabelle:', error);
    return false;
  }
}

// Esegui la migrazione
createTables()
  .then(success => {
    if (success) {
      console.log('Migrazione completata con successo.');
      process.exit(0);
    } else {
      console.error('Migrazione fallita.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Errore durante l\'esecuzione della migrazione:', error);
    process.exit(1);
  });