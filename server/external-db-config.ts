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
  deliveries: {
    enabled: true,
    tableName: 'reports_consegna',
    query: `
      SELECT 
        r.id as external_id,
        CAST(r.id as TEXT) as delivery_number,
        r.data_consegna as delivery_date,
        r.cliente_id as customer_id,
        c.denominazione as customer_name,
        r.indirizzo_consegna as delivery_address,
        r.note_consegna as delivery_notes,
        r.stato_consegna as delivery_status,
        r.totale_ordine as total_amount,
        r.metodo_pagamento as payment_method,
        r.conducente as driver_name,
        r.veicolo as vehicle_info,
        r.ora_partenza as departure_time,
        r.ora_arrivo as arrival_time,
        CURRENT_TIMESTAMP as last_modified_external
      FROM reports_consegna r
      LEFT JOIN clienti c ON r.cliente_id = c.id
      ORDER BY r.data_consegna DESC
    `,
    mapping: {
      externalId: 'external_id',
      deliveryNumber: 'delivery_number',
      deliveryDate: 'delivery_date',
      customerId: 'customer_id',
      customerName: 'customer_name',
      deliveryAddress: 'delivery_address',
      deliveryNotes: 'delivery_notes',
      deliveryStatus: 'delivery_status',
      totalAmount: 'total_amount',
      paymentMethod: 'payment_method',
      driverName: 'driver_name',
      vehicleInfo: 'vehicle_info',
      departureTime: 'departure_time',
      arrivalTime: 'arrival_time',
      lastModifiedExternal: 'last_modified_external'
    }
  },
  deliveryDetails: {
    enabled: true,
    tableName: 'reports_consegna_dettagli',
    query: `
      SELECT 
        d.id as external_id,
        d.reports_consegna_id as report_id,
        d.prodotto_codice as product_code,
        d.prodotto_nome as product_name,
        d.quantita as quantity,
        d.unita_misura as unit_of_measure,
        d.prezzo_unitario as unit_price,
        d.totale_riga as line_total,
        d.note_prodotto as product_notes,
        d.lotto_origine as source_lot,
        d.data_scadenza as expiry_date,
        CURRENT_TIMESTAMP as last_modified_external
      FROM reports_consegna_dettagli d
      ORDER BY d.reports_consegna_id, d.id
    `,
    mapping: {
      externalId: 'external_id',
      reportId: 'report_id',
      productCode: 'product_code',
      productName: 'product_name',
      quantity: 'quantity',
      unitOfMeasure: 'unit_of_measure',
      unitPrice: 'unit_price',
      lineTotal: 'line_total',
      productNotes: 'product_notes',
      sourceLot: 'source_lot',
      expiryDate: 'expiry_date',
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