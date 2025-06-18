/**
 * Servizio di sincronizzazione per dati esterni
 * 
 * Gestisce la sincronizzazione periodica di clienti, vendite, consegne e dettagli consegne
 * da database esterni per generare report di vendita locali con performance ottimali.
 */

import { Pool } from 'pg';
import { IStorage } from './storage';
import { DbStorage } from './db-storage';
import { 
  InsertExternalCustomerSync, 
  InsertExternalSaleSync, 
  InsertExternalDeliverySync,
  InsertExternalDeliveryDetailSync,
  InsertSyncStatus 
} from '@shared/schema';
import { externalDbConfig } from './external-db-config';

export interface ExternalDatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

export interface SyncConfig {
  customers: {
    enabled: boolean;
    tableName: string;
    query: string;
    mapping: Record<string, string>;
  };
  sales: {
    enabled: boolean;
    tableName: string;
    query: string;
    mapping: Record<string, string>;
  };
  deliveries: {
    enabled: boolean;
    tableName: string;
    query: string;
    mapping: Record<string, string>;
  };
  deliveryDetails: {
    enabled: boolean;
    tableName: string;
    query: string;
    mapping: Record<string, string>;
  };
  syncIntervalMinutes: number;
  batchSize: number;
}

export class ExternalSyncService {
  private externalPool: Pool | null = null;
  private storage: IStorage;
  private config: SyncConfig;

  constructor(storage?: IStorage) {
    this.storage = storage || (new DbStorage() as any);
    this.config = this.getDefaultConfig();
    this.initializeConnection();
  }

  private getDefaultConfig(): SyncConfig {
    return {
      customers: {
        enabled: true,
        tableName: 'clienti',
        query: `
          SELECT 
            id as external_id,
            COALESCE(CAST(id as TEXT), 'CLI' || LPAD(CAST(id as TEXT), 6, '0')) as customer_code,
            COALESCE(denominazione, 'Cliente ' || id) as customer_name,
            'azienda' as customer_type,
            piva as vat_number,
            codice_fiscale as tax_code,
            indirizzo as address,
            comune as city,
            provincia as province,
            cap as postal_code,
            COALESCE(paese, 'Italia') as country,
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
      syncIntervalMinutes: 30,
      batchSize: 1000
    };
  }

  /**
   * Inizializza la connessione al database esterno usando le variabili d'ambiente
   */
  private async initializeConnection(): Promise<void> {
    try {
      await this.configureExternalDatabase(externalDbConfig);
    } catch (error) {
      console.error('❌ Errore inizializzazione connessione database esterno:', error);
    }
  }

  /**
   * Configura la connessione al database esterno
   */
  async configureExternalDatabase(dbConfig: ExternalDatabaseConfig): Promise<void> {
    if (this.externalPool) {
      await this.externalPool.end();
    }

    this.externalPool = new Pool({
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.username,
      password: dbConfig.password,
      ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Test della connessione
    try {
      const client = await this.externalPool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('✅ Connessione al database esterno stabilita');
    } catch (error) {
      console.error('❌ Errore connessione database esterno:', error);
      throw error;
    }
  }

  /**
   * Esegue una sincronizzazione completa di tutti i dati
   */
  async performFullSync(): Promise<void> {
    if (!this.externalPool) {
      console.error('❌ Database esterno non configurato');
      return;
    }

    console.log('🔄 Inizio sincronizzazione completa');

    try {
      // Prima di sincronizzare, pulisci le tabelle per garantire dati sempre aggiornati
      await this.clearSyncTables();

      // Sincronizza clienti
      if (this.config.customers.enabled) {
        await this.syncCustomers();
      }

      // Sincronizza vendite/ordini
      if (this.config.sales.enabled) {
        await this.syncSales();
      }

      // Sincronizza consegne
      if (this.config.deliveries?.enabled) {
        await this.syncDeliveries();
      }

      // Sincronizza dettagli consegne
      if (this.config.deliveryDetails?.enabled) {
        await this.syncDeliveryDetails();
      }

      console.log('✅ Sincronizzazione completa terminata');
    } catch (error) {
      console.error('❌ Errore durante sincronizzazione:', error);
      throw error;
    }
  }

  /**
   * Pulisce le tabelle di sincronizzazione per garantire dati sempre aggiornati
   */
  private async clearSyncTables(): Promise<void> {
    try {
      console.log('🧹 Pulizia tabelle di sincronizzazione...');
      
      await this.storage.clearExternalCustomersSync();
      await this.storage.clearExternalSalesSync();
      
      if (this.storage.clearExternalDeliveriesSync) {
        await this.storage.clearExternalDeliveriesSync();
      }
      
      if (this.storage.clearExternalDeliveryDetailsSync) {
        await this.storage.clearExternalDeliveryDetailsSync();
      }
      
      console.log('✅ Tabelle di sincronizzazione pulite');
    } catch (error) {
      console.error('❌ Errore durante la pulizia delle tabelle:', error);
      throw error;
    }
  }

  /**
   * Sincronizza i clienti dal database esterno
   */
  private async syncCustomers(): Promise<void> {
    try {
      console.log('📥 Sincronizzazione clienti...');
      
      const client = await this.externalPool!.connect();
      const result = await client.query(this.config.customers.query);
      client.release();

      const customers: InsertExternalCustomerSync[] = result.rows.map(row => 
        this.mapCustomerData(row, this.config.customers.mapping)
      );

      if (customers.length > 0) {
        await this.storage.bulkUpsertExternalCustomersSync(customers);
        console.log(`📥 Sincronizzati ${customers.length} clienti`);
      }
    } catch (error) {
      console.error('❌ Errore sincronizzazione clienti:', error);
      throw error;
    }
  }

  /**
   * Sincronizza le vendite dal database esterno
   */
  private async syncSales(): Promise<void> {
    try {
      console.log('📥 Sincronizzazione vendite...');
      
      const client = await this.externalPool!.connect();
      const result = await client.query(this.config.sales.query);
      client.release();

      const sales: InsertExternalSaleSync[] = result.rows.map(row => 
        this.mapSaleData(row, this.config.sales.mapping)
      );

      if (sales.length > 0) {
        await this.storage.bulkUpsertExternalSalesSync(sales);
        console.log(`📥 Sincronizzate ${sales.length} vendite`);
      }
    } catch (error) {
      console.error('❌ Errore sincronizzazione vendite:', error);
      throw error;
    }
  }

  /**
   * Sincronizza le consegne dal database esterno
   */
  private async syncDeliveries(): Promise<void> {
    try {
      console.log('📥 Sincronizzazione consegne...');
      
      const client = await this.externalPool!.connect();
      const result = await client.query(this.config.deliveries.query);
      client.release();

      const deliveries: InsertExternalDeliverySync[] = result.rows.map(row => 
        this.mapDeliveryData(row, this.config.deliveries.mapping)
      );

      if (deliveries.length > 0) {
        await this.storage.bulkUpsertExternalDeliveriesSync(deliveries);
        console.log(`📥 Sincronizzate ${deliveries.length} consegne`);
      }
    } catch (error) {
      console.error('❌ Errore sincronizzazione consegne:', error);
      throw error;
    }
  }

  /**
   * Sincronizza i dettagli consegne dal database esterno
   */
  private async syncDeliveryDetails(): Promise<void> {
    try {
      console.log('📥 Sincronizzazione dettagli consegne...');
      
      const client = await this.externalPool!.connect();
      const result = await client.query(this.config.deliveryDetails.query);
      client.release();

      const deliveryDetails: InsertExternalDeliveryDetailSync[] = result.rows.map(row => 
        this.mapDeliveryDetailData(row, this.config.deliveryDetails.mapping)
      );

      if (deliveryDetails.length > 0) {
        await this.storage.bulkUpsertExternalDeliveryDetailsSync(deliveryDetails);
        console.log(`📥 Sincronizzati ${deliveryDetails.length} dettagli consegne`);
      }
    } catch (error) {
      console.error('❌ Errore sincronizzazione dettagli consegne:', error);
      throw error;
    }
  }

  /**
   * Mappa i dati di un cliente dal formato esterno
   */
  private mapCustomerData(row: any, mapping: Record<string, string>): InsertExternalCustomerSync {
    const mappedData: any = {};
    
    for (const [localField, externalField] of Object.entries(mapping)) {
      mappedData[localField] = row[externalField];
    }
    
    return {
      ...mappedData,
      lastSyncAt: new Date()
    } as InsertExternalCustomerSync;
  }

  /**
   * Mappa i dati di una vendita dal formato esterno
   */
  private mapSaleData(row: any, mapping: Record<string, string>): InsertExternalSaleSync {
    const mappedData: any = {};
    
    for (const [localField, externalField] of Object.entries(mapping)) {
      mappedData[localField] = row[externalField];
    }
    
    return {
      ...mappedData,
      lastSyncAt: new Date()
    } as InsertExternalSaleSync;
  }

  /**
   * Mappa i dati di una consegna dal formato esterno
   */
  private mapDeliveryData(row: any, mapping: Record<string, string>): InsertExternalDeliverySync {
    const mappedData: any = {};
    
    for (const [localField, externalField] of Object.entries(mapping)) {
      mappedData[localField] = row[externalField];
    }
    
    return {
      ...mappedData,
      lastSyncAt: new Date()
    } as InsertExternalDeliverySync;
  }

  /**
   * Mappa i dati di un dettaglio consegna dal formato esterno
   */
  private mapDeliveryDetailData(row: any, mapping: Record<string, string>): InsertExternalDeliveryDetailSync {
    const mappedData: any = {};
    
    for (const [localField, externalField] of Object.entries(mapping)) {
      mappedData[localField] = row[externalField];
    }
    
    return {
      ...mappedData,
      lastSyncAt: new Date()
    } as InsertExternalDeliveryDetailSync;
  }

  /**
   * Testa la connessione al database esterno
   */
  async testConnection(): Promise<boolean> {
    if (!this.externalPool) {
      return false;
    }

    try {
      const client = await this.externalPool.connect();
      await client.query('SELECT 1');
      client.release();
      return true;
    } catch (error) {
      console.error('Errore test connessione:', error);
      return false;
    }
  }

  /**
   * Chiude la connessione al database esterno
   */
  async close(): Promise<void> {
    if (this.externalPool) {
      await this.externalPool.end();
      this.externalPool = null;
    }
  }
}

