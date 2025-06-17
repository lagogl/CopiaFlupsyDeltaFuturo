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
    tableName: 'customers', // Nome tabella da verificare
    query: `
      SELECT 
        id as external_id,
        code as customer_code,
        name as customer_name,
        type as customer_type,
        vat_number,
        tax_code,
        address,
        city,
        province,
        postal_code,
        country,
        phone,
        email,
        active as is_active,
        notes,
        updated_at as last_modified_external
      FROM customers 
      WHERE active = true
      ORDER BY updated_at DESC
    `,
    mapping: {
      externalId: 'id',
      customerCode: 'code',
      customerName: 'name',
      customerType: 'type',
      vatNumber: 'vat_number',
      taxCode: 'tax_code',
      address: 'address',
      city: 'city',
      province: 'province',
      postalCode: 'postal_code',
      country: 'country',
      phone: 'phone',
      email: 'email',
      isActive: 'active',
      notes: 'notes',
      lastModifiedExternal: 'updated_at'
    }
  },
  sales: {
    enabled: true,
    tableName: 'orders', // Nome tabella da verificare
    query: `
      SELECT 
        o.id as external_id,
        o.order_number as sale_number,
        o.order_date as sale_date,
        o.customer_id,
        c.name as customer_name,
        oi.product_code,
        oi.product_name,
        oi.category as product_category,
        oi.quantity,
        oi.unit_measure as unit_of_measure,
        oi.unit_price,
        oi.total_amount,
        oi.discount_percent,
        oi.discount_amount,
        oi.net_amount,
        oi.vat_percent,
        oi.vat_amount,
        oi.total_with_vat,
        o.payment_method,
        o.delivery_date,
        oi.origin,
        oi.lot_reference,
        o.sales_person,
        o.notes,
        o.status,
        o.updated_at as last_modified_external
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.status IN ('completed', 'delivered')
      ORDER BY o.order_date DESC
    `,
    mapping: {
      externalId: 'id',
      saleNumber: 'order_number',
      saleDate: 'order_date',
      customerId: 'customer_id',
      customerName: 'customer_name',
      productCode: 'product_code',
      productName: 'product_name',
      productCategory: 'category',
      quantity: 'quantity',
      unitOfMeasure: 'unit_measure',
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
      lastModifiedExternal: 'updated_at'
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