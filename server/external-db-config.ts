/**
 * Configurazione database esterno
 * Estrae le credenziali dall'URL PostgreSQL fornito dall'utente
 */

import { ExternalDatabaseConfig, SyncConfig } from './external-sync-service';

// URL del database esterno fornito dall'utente
const EXTERNAL_DB_URL = 'postgresql://neondb_owner:npg_Kh6xVrekoFn7@ep-snowy-firefly-a4pq2urr.us-east-1.aws.neon.tech/neondb?sslmode=require';

/**
 * Estrae le credenziali dall'URL PostgreSQL
 */
function parsePostgresUrl(url: string): ExternalDatabaseConfig {
  const parsed = new URL(url);
  
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port) || 5432,
    database: parsed.pathname.slice(1), // rimuove il '/' iniziale
    username: parsed.username,
    password: parsed.password,
    ssl: parsed.searchParams.get('sslmode') === 'require'
  };
}

/**
 * Configurazione del database esterno
 */
export const externalDbConfig: ExternalDatabaseConfig = parsePostgresUrl(EXTERNAL_DB_URL);

/**
 * Configurazione di sincronizzazione predefinita
 * Sarà personalizzata in base alla struttura del database esterno
 */
export const defaultSyncConfig: SyncConfig = {
  customers: {
    enabled: true,
    tableName: 'clienti',
    query: `
      SELECT 
        id as external_id,
        denominazione as customer_name,
        'azienda' as customer_type,
        piva as vat_number,
        codice_fiscale as tax_code,
        indirizzo as address,
        comune as city,
        provincia as province,
        cap as postal_code,
        paese as country,
        telefono as phone,
        email,
        true as is_active,
        note as notes,
        CURRENT_TIMESTAMP as last_modified_external
      FROM clienti 
      ORDER BY denominazione
    `,
    mapping: {
      externalId: 'external_id',
      customerCode: 'customer_code',
      customerName: 'customer_name',
      customerType: 'customer_type',
      vatNumber: 'vat_number',
      taxCode: 'tax_code',
      address: 'address',
      city: 'city',
      province: 'province',
      postalCode: 'postal_code',
      country: 'country',
      phone: 'phone',
      email: 'email',
      isActive: 'is_active',
      notes: 'notes',
      lastModifiedExternal: 'last_modified_external'
    }
  },
  sales: {
    enabled: true,
    tableName: 'ordini',
    query: `
      SELECT 
        o.id as external_id,
        CAST(o.id as TEXT) as sale_number,
        o.data as sale_date,
        o.cliente_id as customer_id,
        c.denominazione as customer_name,
        o.taglia_richiesta as product_code,
        ('Vongole ' || o.taglia_richiesta) as product_name,
        'Molluschi' as product_category,
        o.quantita as quantity,
        'pz' as unit_of_measure,
        0.02 as unit_price,
        (o.quantita * 0.02) as total_amount,
        0 as discount_percent,
        0 as discount_amount,
        (o.quantita * 0.02) as net_amount,
        22 as vat_percent,
        (o.quantita * 0.02 * 0.22) as vat_amount,
        (o.quantita * 0.02 * 1.22) as total_with_vat,
        'contanti' as payment_method,
        o.data_consegna as delivery_date,
        'interno' as origin,
        NULL as lot_reference,
        'sistema' as sales_person,
        CONCAT('Stato: ', o.stato, CASE WHEN o.stato_consegna IS NOT NULL THEN ' - Consegna: ' || o.stato_consegna ELSE '' END) as notes,
        o.stato as status,
        CURRENT_TIMESTAMP as last_modified_external
      FROM ordini o
      LEFT JOIN clienti c ON o.cliente_id = c.id
      ORDER BY o.data DESC
    `,
    mapping: {
      externalId: 'external_id',
      saleNumber: 'sale_number',
      saleDate: 'sale_date',
      customerId: 'customer_id',
      customerName: 'customer_name',
      productCode: 'product_code',
      productName: 'product_name',
      productCategory: 'product_category',
      quantity: 'quantity',
      unitOfMeasure: 'unit_of_measure',
      unitPrice: 'unit_price',
      totalAmount: 'total_amount',
      discountPercent: 'discount_percent',
      discountAmount: 'discount_amount',
      netAmount: 'net_amount',
      vatPercent: 'vat_percent',
      vatAmount: 'vat_amount',
      totalWithVat: 'total_with_vat',
      paymentMethod: 'payment_method',
      deliveryDate: 'delivery_date',
      origin: 'origin',
      lotReference: 'lot_reference',
      salesPerson: 'sales_person',
      notes: 'notes',
      status: 'status',
      lastModifiedExternal: 'last_modified_external'
    }
  },
  syncIntervalMinutes: 60, // Sincronizzazione ogni ora
  batchSize: 1000 // Massimo 1000 record per batch
};

console.log('🔧 Configurazione database esterno caricata:', {
  host: externalDbConfig.host,
  port: externalDbConfig.port,
  database: externalDbConfig.database,
  username: externalDbConfig.username,
  ssl: externalDbConfig.ssl
});