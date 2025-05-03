// migrations/create_client_order_tables.js
const { db } = require('../server/db');

/**
 * Script di migrazione per creare le tabelle di clienti e ordini
 * 
 * Questo script crea le tabelle necessarie per il sistema di gestione clienti e ordini:
 * - clients: anagrafica clienti
 * - orders: ordini dei clienti
 * - order_items: voci degli ordini (prodotti ordinati)
 * - payments: pagamenti degli ordini
 * - documents: documenti allegati (fatture, DDT, ecc.)
 */

async function createTables() {
  console.log('Avvio creazione tabelle per gestione clienti e ordini...');
  
  try {
    // Crea la tabella clients
    await db.execute(`
      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        tax_id TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        city TEXT,
        province TEXT,
        zip_code TEXT,
        country TEXT DEFAULT 'Italia',
        contact_person TEXT,
        client_type TEXT NOT NULL DEFAULT 'business',
        notes TEXT,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE
      );
    `);
    console.log('✓ Tabella clients creata');
    
    // Crea la tabella orders
    await db.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_number TEXT NOT NULL UNIQUE,
        client_id INTEGER NOT NULL,
        order_date DATE NOT NULL,
        requested_delivery_date DATE,
        actual_delivery_date DATE,
        status TEXT NOT NULL DEFAULT 'draft',
        total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
        vat_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
        vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 22,
        discount_amount NUMERIC(10, 2) DEFAULT 0,
        discount_rate NUMERIC(5, 2) DEFAULT 0,
        shipping_amount NUMERIC(10, 2) DEFAULT 0,
        payment_type TEXT,
        payment_status TEXT NOT NULL DEFAULT 'pending',
        payment_due_date DATE,
        invoice_number TEXT,
        invoice_date DATE,
        notes TEXT,
        internal_notes TEXT,
        shipping_address TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE
      );
    `);
    console.log('✓ Tabella orders creata');
    
    // Crea la tabella order_items
    await db.execute(`
      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL,
        description TEXT NOT NULL,
        quantity NUMERIC(10, 3) NOT NULL,
        unit TEXT NOT NULL DEFAULT 'kg',
        unit_price NUMERIC(10, 2) NOT NULL,
        total_price NUMERIC(10, 2) NOT NULL,
        vat_rate NUMERIC(5, 2) NOT NULL DEFAULT 22,
        lot_id INTEGER,
        size_id INTEGER,
        selection_id INTEGER,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE
      );
    `);
    console.log('✓ Tabella order_items creata');
    
    // Crea la tabella payments
    await db.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        order_id INTEGER NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        payment_date DATE NOT NULL,
        payment_type TEXT NOT NULL,
        reference TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE
      );
    `);
    console.log('✓ Tabella payments creata');
    
    // Crea la tabella documents
    await db.execute(`
      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        file_name TEXT NOT NULL,
        original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        path TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        document_type TEXT NOT NULL,
        upload_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE
      );
    `);
    console.log('✓ Tabella documents creata');
    
    // Crea indici per le relazioni
    await db.execute(`
      CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
      CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
      CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);
    `);
    console.log('✓ Indici creati');
    
    // Crea vincoli di chiave esterna
    await db.execute(`
      ALTER TABLE orders 
        ADD CONSTRAINT fk_orders_client_id 
        FOREIGN KEY (client_id) 
        REFERENCES clients(id) 
        ON DELETE RESTRICT;
        
      ALTER TABLE order_items 
        ADD CONSTRAINT fk_order_items_order_id 
        FOREIGN KEY (order_id) 
        REFERENCES orders(id) 
        ON DELETE CASCADE;
        
      ALTER TABLE payments 
        ADD CONSTRAINT fk_payments_order_id 
        FOREIGN KEY (order_id) 
        REFERENCES orders(id) 
        ON DELETE CASCADE;
    `);
    console.log('✓ Vincoli di chiave esterna creati');
    
    // Aggiungi vincoli opzionali per order_items
    await db.execute(`
      ALTER TABLE order_items 
        ADD CONSTRAINT fk_order_items_lot_id 
        FOREIGN KEY (lot_id) 
        REFERENCES lots(id) 
        ON DELETE SET NULL;
        
      ALTER TABLE order_items 
        ADD CONSTRAINT fk_order_items_size_id 
        FOREIGN KEY (size_id) 
        REFERENCES sizes(id) 
        ON DELETE SET NULL;
    `);
    console.log('✓ Vincoli opzionali per order_items creati');
    
    console.log('✅ Creazione tabelle per gestione clienti e ordini completata con successo!');
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