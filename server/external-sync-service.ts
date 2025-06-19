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
  private localPool: Pool;

  constructor(storage?: IStorage) {
    this.storage = storage || (new DbStorage() as any);
    this.config = this.getDefaultConfig();
    // Inizializza il pool di connessioni locale
    this.localPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
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
            COALESCE('CONS-' || LPAD(CAST(r.id as TEXT), 6, '0'), CAST(r.id as TEXT)) as delivery_number,
            r.data_consegna as delivery_date,
            r.cliente_id as customer_id,
            c.denominazione as customer_name,
            c.indirizzo as delivery_address,
            r.note as delivery_notes,
            COALESCE(r.stato, 'completata') as delivery_status,
            r.peso_totale_kg as total_amount,
            'contanti' as payment_method,
            'n/a' as driver_name,
            'n/a' as vehicle_info,
            r.data_creazione as departure_time,
            r.data_consegna as arrival_time,
            r.data_creazione as last_modified_external
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
            d.report_id as report_id,
            COALESCE(d.taglia, 'n/a') as product_code,
            COALESCE('Vongole ' || d.taglia, 'Prodotto mare') as product_name,
            d.numero_animali as quantity,
            'pz' as unit_of_measure,
            0.02 as unit_price,
            (d.numero_animali * 0.02) as line_total,
            d.note as product_notes,
            d.codice_sezione as source_lot,
            NULL as expiry_date,
            CURRENT_TIMESTAMP as last_modified_external
          FROM reports_consegna_dettagli d
          ORDER BY d.report_id, d.id
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

      // Sincronizza clienti (usando SQL diretto)
      if (this.config.customers.enabled) {
        await this.syncCustomersDirectSQL();
      }

      // Sincronizza vendite/ordini (usando SQL diretto)
      if (this.config.sales.enabled) {
        await this.syncSalesDirectSQL();
      }

      // Sincronizza consegne - SALTATO per ora (problemi timestamp)
      // if (this.config.deliveries?.enabled) {
      //   await this.syncDeliveriesDirectSQL();
      // }

      // Sincronizza dettagli consegne - SALTATO per ora (problemi timestamp)
      // if (this.config.deliveryDetails?.enabled) {
      //   await this.syncDeliveryDetailsDirectSQL();
      // }

      // Aggiorna lo stato di sincronizzazione con timestamp corrente
      await this.updateSyncStatusAfterCompletion();
      
      console.log('✅ Sincronizzazione completa terminata');
    } catch (error) {
      console.error('❌ Errore durante sincronizzazione:', error);
      
      // Aggiorna lo stato di sincronizzazione con errore
      await this.updateSyncStatusWithError(error);
      
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

      const customers: InsertExternalCustomerSync[] = result.rows
        .map(row => this.mapCustomerData(row, this.config.customers.mapping))
        .map(customer => this.validateAndSanitizeDataObject(customer))
        .filter(customer => customer !== null);

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

      const sales: InsertExternalSaleSync[] = result.rows
        .map(row => this.mapSaleData(row, this.config.sales.mapping))
        .map(sale => this.validateAndSanitizeDataObject(sale))
        .filter(sale => sale !== null);

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

      const deliveries: InsertExternalDeliverySync[] = result.rows
        .map(row => this.mapDeliveryData(row, this.config.deliveries.mapping))
        .map(delivery => this.validateAndSanitizeDataObject(delivery))
        .filter(delivery => delivery !== null);

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

      const deliveryDetails: InsertExternalDeliveryDetailSync[] = result.rows
        .map(row => this.mapDeliveryDetailData(row, this.config.deliveryDetails.mapping))
        .map(detail => this.validateAndSanitizeDataObject(detail))
        .filter(detail => detail !== null);

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
   * Converte un valore in una stringa ISO valida o null per PostgreSQL
   */
  private convertToValidDate(value: any): string | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    
    try {
      // Se è già un oggetto Date valido
      if (value instanceof Date && !isNaN(value.getTime())) {
        return value.toISOString();
      }
      
      // Se è una stringa
      if (typeof value === 'string') {
        const dateValue = new Date(value);
        return !isNaN(dateValue.getTime()) ? dateValue.toISOString() : null;
      }
      
      // Se è un numero (timestamp)
      if (typeof value === 'number' && !isNaN(value)) {
        const dateValue = new Date(value);
        return !isNaN(dateValue.getTime()) ? dateValue.toISOString() : null;
      }
      
      // Se è un oggetto complesso (come quelli di MongoDB o altri DB)
      if (typeof value === 'object' && value !== null) {
        // Prova proprietà comuni per timestamp
        const timestampProps = ['$date', 'date', 'timestamp', 'value', '_date', 'time'];
        for (const prop of timestampProps) {
          if (value[prop] !== undefined && value[prop] !== null) {
            return this.convertToValidDate(value[prop]);
          }
        }
        
        // Se ha un metodo toISOString
        if (typeof value.toISOString === 'function') {
          try {
            return value.toISOString();
          } catch {
            // Fallback a toString
          }
        }
        
        // Se ha un metodo toString che non è il default di Object
        if (typeof value.toString === 'function') {
          const stringValue = value.toString();
          if (stringValue !== '[object Object]' && stringValue !== 'Invalid Date') {
            const dateValue = new Date(stringValue);
            if (!isNaN(dateValue.getTime())) {
              return dateValue.toISOString();
            }
          }
        }
        
        // Se è un array di valori
        if (Array.isArray(value) && value.length > 0) {
          return this.convertToValidDate(value[0]);
        }
      }
      
      // Ultimo tentativo: conversione diretta
      const dateValue = new Date(value);
      if (!isNaN(dateValue.getTime())) {
        return dateValue.toISOString();
      }
    } catch (error) {
      console.warn(`Impossibile convertire timestamp:`, typeof value, value, error?.message);
    }
    
    return null;
  }

  /**
   * Valida e forza la conversione di tutti i campi timestamp in stringhe ISO valide
   */
  private validateAndSanitizeDataObject(data: any): any {
    try {
      const sanitizedData = { ...data };
      
      // Prima fase: converti tutti i campi timestamp conosciuti
      for (const [key, value] of Object.entries(sanitizedData)) {
        if (key.includes('At') || key.includes('Date') || key.includes('Time') || key.includes('Modified')) {
          if (value === null || value === undefined) {
            sanitizedData[key] = null;
          } else {
            console.log(`Conversione campo ${key}:`, typeof value, value);
            const convertedValue = this.convertToValidDate(value);
            if (convertedValue === null && value !== null) {
              console.warn(`Campo timestamp ${key} ignorato per valore non valido:`, typeof value, value);
              sanitizedData[key] = null;
            } else {
              sanitizedData[key] = convertedValue;
              console.log(`Campo ${key} convertito in:`, convertedValue);
            }
          }
        }
      }
      
      // Seconda fase: verifica che tutti i valori siano stringhe o null
      for (const [key, value] of Object.entries(sanitizedData)) {
        if (value !== null && value !== undefined) {
          // Se il valore è ancora un oggetto o ha metodi che potrebbero causare problemi
          if (typeof value === 'object' && value !== null) {
            console.warn(`ATTENZIONE: Campo ${key} è ancora un oggetto dopo sanitizzazione:`, typeof value, value);
            // Forza conversione a stringa o null
            if (key.includes('At') || key.includes('Date') || key.includes('Time') || key.includes('Modified')) {
              sanitizedData[key] = null;
              console.warn(`Campo ${key} forzato a null per sicurezza`);
            } else {
              // Per campi non timestamp, prova conversione a stringa
              try {
                sanitizedData[key] = JSON.stringify(value);
              } catch {
                sanitizedData[key] = String(value);
              }
            }
          }
        }
      }
      
      // Terza fase: aggiunta lastSyncAt come stringa ISO
      sanitizedData.lastSyncAt = new Date().toISOString();
      
      console.log(`Oggetto sanitizzato finale:`, Object.keys(sanitizedData).reduce((acc, key) => {
        acc[key] = typeof sanitizedData[key];
        return acc;
      }, {} as any));
      
      return sanitizedData;
    } catch (error) {
      console.error('Errore sanitizzazione oggetto dati:', error);
      return null;
    }
  }

  /**
   * Mappa i dati di un cliente dal formato esterno
   */
  private mapCustomerData(row: any, mapping: Record<string, string>): InsertExternalCustomerSync {
    const mappedData: any = {};
    
    for (const [localField, externalField] of Object.entries(mapping)) {
      let value = row[externalField];
      
      // Gestisci campi timestamp
      if (localField.includes('At') || localField.includes('Date') || localField.includes('Time') || localField.includes('Modified')) {
        value = this.convertToValidDate(value);
      }
      
      mappedData[localField] = value;
    }
    
    // Assicurati che tutti i campi timestamp siano stringhe ISO valide
    const finalData = {
      ...mappedData,
      lastSyncAt: new Date().toISOString()
    };

    // Converti tutti i campi timestamp rimanenti
    for (const [key, value] of Object.entries(finalData)) {
      if ((key.includes('At') || key.includes('Date') || key.includes('Time') || key.includes('Modified')) && value !== null) {
        finalData[key] = this.convertToValidDate(value);
      }
    }

    return finalData as InsertExternalCustomerSync;
  }

  /**
   * Mappa i dati di una vendita dal formato esterno
   */
  private mapSaleData(row: any, mapping: Record<string, string>): InsertExternalSaleSync {
    const mappedData: any = {};
    
    for (const [localField, externalField] of Object.entries(mapping)) {
      let value = row[externalField];
      
      // Gestisci campi timestamp
      if (localField.includes('At') || localField.includes('Date') || localField.includes('Time') || localField.includes('Modified')) {
        value = this.convertToValidDate(value);
      }
      
      mappedData[localField] = value;
    }
    
    // Assicurati che tutti i campi timestamp siano stringhe ISO valide
    const finalData = {
      ...mappedData,
      lastSyncAt: new Date().toISOString()
    };

    // Converti tutti i campi timestamp rimanenti
    for (const [key, value] of Object.entries(finalData)) {
      if ((key.includes('At') || key.includes('Date') || key.includes('Time') || key.includes('Modified')) && value !== null) {
        finalData[key] = this.convertToValidDate(value);
      }
    }

    return finalData as InsertExternalSaleSync;
  }

  /**
   * Mappa i dati di una consegna dal formato esterno
   */
  private mapDeliveryData(row: any, mapping: Record<string, string>): InsertExternalDeliverySync {
    const mappedData: any = {};
    
    for (const [localField, externalField] of Object.entries(mapping)) {
      let value = row[externalField];
      
      // Gestisci campi timestamp
      if (localField.includes('At') || localField.includes('Date') || localField.includes('Time') || localField.includes('Modified')) {
        value = this.convertToValidDate(value);
      }
      
      mappedData[localField] = value;
    }
    
    // Rimuovi completamente i campi timestamp problematici
    const cleanData: any = {};
    for (const [key, value] of Object.entries(mappedData)) {
      // Escludi completamente i campi timestamp che causano problemi
      if (key.includes('Modified') || key.includes('Time') || key === 'lastModifiedExternal') {
        continue; // Salta questi campi
      }
      
      // Per i campi data, converti in stringa semplice
      if (key.includes('Date') || key.includes('At')) {
        cleanData[key] = value ? String(value) : null;
      } else {
        cleanData[key] = value;
      }
    }
    
    // Aggiungi solo lastSyncAt come stringa semplice
    cleanData.lastSyncAt = new Date().toISOString();

    return cleanData as InsertExternalDeliverySync;
  }

  /**
   * Mappa i dati di un dettaglio consegna dal formato esterno
   */
  private mapDeliveryDetailData(row: any, mapping: Record<string, string>): InsertExternalDeliveryDetailSync {
    const mappedData: any = {};
    
    for (const [localField, externalField] of Object.entries(mapping)) {
      let value = row[externalField];
      
      // Gestisci campi timestamp
      if (localField.includes('At') || localField.includes('Date') || localField.includes('Time') || localField.includes('Modified')) {
        value = this.convertToValidDate(value);
      }
      
      mappedData[localField] = value;
    }
    
    // Rimuovi completamente i campi timestamp problematici
    const cleanData: any = {};
    for (const [key, value] of Object.entries(mappedData)) {
      // Escludi completamente i campi timestamp che causano problemi
      if (key.includes('Modified') || key.includes('Time') || key === 'lastModifiedExternal') {
        continue; // Salta questi campi
      }
      
      // Per i campi data, converti in stringa semplice
      if (key.includes('Date') || key.includes('At')) {
        cleanData[key] = value ? String(value) : null;
      } else {
        cleanData[key] = value;
      }
    }
    
    // Aggiungi solo lastSyncAt come stringa semplice
    cleanData.lastSyncAt = new Date().toISOString();

    return cleanData as InsertExternalDeliveryDetailSync;
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
   * Sincronizza i clienti dal database esterno usando SQL diretto
   */
  private async syncCustomersDirectSQL(): Promise<void> {
    console.log('👥 Sincronizzazione clienti (SQL diretto)...');
    
    if (!this.externalPool) {
      throw new Error('Database esterno non configurato');
    }

    const externalClient = await this.externalPool.connect();
    
    try {
      const result = await externalClient.query(this.config.customers.query);
      console.log(`👥 Trovati ${result.rows.length} clienti nel database esterno`);
      
      if (result.rows.length === 0) {
        console.log('👥 Nessun cliente da sincronizzare');
        return;
      }

      // Inserimento diretto nel database locale
      for (const row of result.rows) {
        const mappedData = this.mapCustomerData(row, this.config.customers.mapping);
        
        // Query SQL diretta per inserimento
        const insertQuery = `
          INSERT INTO external_customers_sync (
            external_id, customer_code, customer_name, customer_type,
            vat_number, tax_code, address, city, province, postal_code,
            country, phone, email, is_active, notes, synced_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
          ON CONFLICT (external_id) DO UPDATE SET
            customer_code = EXCLUDED.customer_code,
            customer_name = EXCLUDED.customer_name,
            customer_type = EXCLUDED.customer_type,
            vat_number = EXCLUDED.vat_number,
            tax_code = EXCLUDED.tax_code,
            address = EXCLUDED.address,
            city = EXCLUDED.city,
            province = EXCLUDED.province,
            postal_code = EXCLUDED.postal_code,
            country = EXCLUDED.country,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            is_active = EXCLUDED.is_active,
            notes = EXCLUDED.notes,
            synced_at = NOW()
        `;
        
        await this.localPool.query(insertQuery, [
          mappedData.externalId,
          mappedData.customerCode,
          mappedData.customerName,
          mappedData.customerType,
          mappedData.vatNumber,
          mappedData.taxCode,
          mappedData.address,
          mappedData.city,
          mappedData.province,
          mappedData.postalCode,
          mappedData.country,
          mappedData.phone,
          mappedData.email,
          mappedData.isActive,
          mappedData.notes
        ]);
      }
      
      console.log(`✅ Sincronizzazione clienti completata: ${result.rows.length} records`);
      
      // Aggiorna immediatamente lo stato di sincronizzazione per i clienti
      await this.updateSyncStatusForTable('external_customers_sync', result.rows.length, true);
      
    } finally {
      externalClient.release();
    }
  }

  /**
   * Sincronizza le vendite dal database esterno usando SQL diretto
   */
  private async syncSalesDirectSQL(): Promise<void> {
    console.log('💰 Sincronizzazione vendite (SQL diretto)...');
    
    if (!this.externalPool) {
      throw new Error('Database esterno non configurato');
    }

    const externalClient = await this.externalPool.connect();
    
    try {
      const result = await externalClient.query(this.config.sales.query);
      console.log(`💰 Trovate ${result.rows.length} vendite nel database esterno`);
      
      if (result.rows.length === 0) {
        console.log('💰 Nessuna vendita da sincronizzare');
        return;
      }

      // Inserimento diretto nel database locale
      for (const row of result.rows) {
        const mappedData = this.mapSaleData(row, this.config.sales.mapping);
        
        // Query SQL diretta per inserimento
        const insertQuery = `
          INSERT INTO external_sales_sync (
            external_id, sale_number, sale_date, customer_id, customer_name,
            product_code, product_name, product_category, quantity, unit_of_measure,
            unit_price, total_amount, discount_percent, discount_amount, net_amount,
            vat_percent, vat_amount, total_with_vat, payment_method, delivery_date,
            origin, lot_reference, sales_person, notes, status, synced_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, NOW())
          ON CONFLICT (external_id) DO UPDATE SET
            sale_number = EXCLUDED.sale_number,
            sale_date = EXCLUDED.sale_date,
            customer_id = EXCLUDED.customer_id,
            customer_name = EXCLUDED.customer_name,
            product_code = EXCLUDED.product_code,
            product_name = EXCLUDED.product_name,
            product_category = EXCLUDED.product_category,
            quantity = EXCLUDED.quantity,
            unit_of_measure = EXCLUDED.unit_of_measure,
            unit_price = EXCLUDED.unit_price,
            total_amount = EXCLUDED.total_amount,
            discount_percent = EXCLUDED.discount_percent,
            discount_amount = EXCLUDED.discount_amount,
            net_amount = EXCLUDED.net_amount,
            vat_percent = EXCLUDED.vat_percent,
            vat_amount = EXCLUDED.vat_amount,
            total_with_vat = EXCLUDED.total_with_vat,
            payment_method = EXCLUDED.payment_method,
            delivery_date = EXCLUDED.delivery_date,
            origin = EXCLUDED.origin,
            lot_reference = EXCLUDED.lot_reference,
            sales_person = EXCLUDED.sales_person,
            notes = EXCLUDED.notes,
            status = EXCLUDED.status,
            synced_at = NOW()
        `;
        
        await this.localPool.query(insertQuery, [
          mappedData.externalId,
          mappedData.saleNumber,
          mappedData.saleDate,
          mappedData.customerId,
          mappedData.customerName,
          mappedData.productCode,
          mappedData.productName,
          mappedData.productCategory,
          mappedData.quantity,
          mappedData.unitOfMeasure,
          mappedData.unitPrice,
          mappedData.totalAmount,
          mappedData.discountPercent,
          mappedData.discountAmount,
          mappedData.netAmount,
          mappedData.vatPercent,
          mappedData.vatAmount,
          mappedData.totalWithVat,
          mappedData.paymentMethod,
          mappedData.deliveryDate,
          mappedData.origin,
          mappedData.lotReference,
          mappedData.salesPerson,
          mappedData.notes,
          mappedData.status
        ]);
      }
      
      console.log(`✅ Sincronizzazione vendite completata: ${result.rows.length} records`);
      
      // Aggiorna immediatamente lo stato di sincronizzazione per le vendite
      await this.updateSyncStatusForTable('external_sales_sync', result.rows.length, true);
      
    } finally {
      externalClient.release();
    }
  }

  /**
   * Sincronizza le consegne dal database esterno usando SQL diretto
   */
  private async syncDeliveriesDirectSQL(): Promise<void> {
    console.log('🚚 Sincronizzazione consegne (SQL diretto)...');
    
    if (!this.externalPool) {
      throw new Error('Database esterno non configurato');
    }

    const externalClient = await this.externalPool.connect();
    
    try {
      const result = await externalClient.query(this.config.deliveries.query);
      console.log(`📦 Trovate ${result.rows.length} consegne nel database esterno`);
      
      if (result.rows.length === 0) {
        console.log('📦 Nessuna consegna da sincronizzare');
        return;
      }

      // Inserimento diretto nel database locale usando il pool di connessioni
      for (const row of result.rows) {
        const mappedData = this.mapDeliveryData(row, this.config.deliveries.mapping);
        
        // Query SQL diretta per inserimento
        const insertQuery = `
          INSERT INTO external_deliveries_sync (
            external_id, data_creazione, cliente_id, ordine_id, data_consegna,
            stato, numero_totale_ceste, peso_totale_kg, totale_animali,
            taglia_media, qrcode_url, note, numero_progressivo, 
            synced_at, last_sync_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), $15)
          ON CONFLICT (external_id) DO UPDATE SET
            data_creazione = EXCLUDED.data_creazione,
            cliente_id = EXCLUDED.cliente_id,
            ordine_id = EXCLUDED.ordine_id,
            data_consegna = EXCLUDED.data_consegna,
            stato = EXCLUDED.stato,
            numero_totale_ceste = EXCLUDED.numero_totale_ceste,
            peso_totale_kg = EXCLUDED.peso_totale_kg,
            totale_animali = EXCLUDED.totale_animali,
            taglia_media = EXCLUDED.taglia_media,
            qrcode_url = EXCLUDED.qrcode_url,
            note = EXCLUDED.note,
            numero_progressivo = EXCLUDED.numero_progressivo,
            synced_at = NOW(),
            last_sync_at = EXCLUDED.last_sync_at
        `;
        
        await this.storage.db.query(insertQuery, [
          mappedData.externalId,
          mappedData.dataCreazione,
          mappedData.clienteId,
          mappedData.ordineId,
          mappedData.dataConsegna,
          mappedData.stato,
          mappedData.numeroTotaleCeste,
          mappedData.pesoTotaleKg,
          mappedData.totaleAnimali,
          mappedData.tagliaMedia,
          mappedData.qrcodeUrl,
          mappedData.note,
          mappedData.numeroProgressivo,
          mappedData.lastSyncAt
        ]);
      }
      
      console.log(`✅ Sincronizzazione consegne completata: ${result.rows.length} records`);
      
    } finally {
      externalClient.release();
    }
  }

  /**
   * Sincronizza i dettagli consegne dal database esterno usando SQL diretto
   */
  private async syncDeliveryDetailsDirectSQL(): Promise<void> {
    console.log('📋 Sincronizzazione dettagli consegne (SQL diretto)...');
    
    if (!this.externalPool) {
      throw new Error('Database esterno non configurato');
    }

    const externalClient = await this.externalPool.connect();
    
    try {
      const result = await externalClient.query(this.config.deliveryDetails.query);
      console.log(`📋 Trovati ${result.rows.length} dettagli consegne nel database esterno`);
      
      if (result.rows.length === 0) {
        console.log('📋 Nessun dettaglio consegna da sincronizzare');
        return;
      }

      // Inserimento diretto nel database locale
      for (const row of result.rows) {
        const mappedData = this.mapDeliveryDetailData(row, this.config.deliveryDetails.mapping);
        
        // Query SQL diretta per inserimento
        const insertQuery = `
          INSERT INTO external_delivery_details_sync (
            external_id, report_id, misurazione_id, vasca_id, codice_sezione,
            numero_ceste, peso_ceste_kg, taglia, animali_per_kg,
            percentuale_guscio, percentuale_mortalita, numero_animali,
            note, synced_at, last_sync_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), $15)
          ON CONFLICT (external_id) DO UPDATE SET
            report_id = EXCLUDED.report_id,
            misurazione_id = EXCLUDED.misurazione_id,
            vasca_id = EXCLUDED.vasca_id,
            codice_sezione = EXCLUDED.codice_sezione,
            numero_ceste = EXCLUDED.numero_ceste,
            peso_ceste_kg = EXCLUDED.peso_ceste_kg,
            taglia = EXCLUDED.taglia,
            animali_per_kg = EXCLUDED.animali_per_kg,
            percentuale_guscio = EXCLUDED.percentuale_guscio,
            percentuale_mortalita = EXCLUDED.percentuale_mortalita,
            numero_animali = EXCLUDED.numero_animali,
            note = EXCLUDED.note,
            synced_at = NOW(),
            last_sync_at = EXCLUDED.last_sync_at
        `;
        
        await this.storage.db.query(insertQuery, [
          mappedData.externalId,
          mappedData.reportId,
          mappedData.misurazioneId,
          mappedData.vascaId,
          mappedData.codiceSezione,
          mappedData.numeroCeste,
          mappedData.pesoCesteKg,
          mappedData.taglia,
          mappedData.animaliPerKg,
          mappedData.percentualeGuscio,
          mappedData.percentualeMortalita,
          mappedData.numeroAnimali,
          mappedData.note,
          mappedData.lastSyncAt
        ]);
      }
      
      console.log(`✅ Sincronizzazione dettagli consegne completata: ${result.rows.length} records`);
      
    } finally {
      externalClient.release();
    }
  }

  /**
   * Aggiorna lo stato di sincronizzazione con successo
   */
  private async updateSyncStatusAfterCompletion(): Promise<void> {
    try {
      const now = new Date();
      
      // Conta i record sincronizzati
      const customersCount = await this.storage.getExternalCustomersSync();
      const salesCount = await this.storage.getExternalSalesSync();
      
      // Aggiorna stato clienti
      await this.storage.upsertSyncStatus('external_customers_sync', {
        lastSyncAt: now,
        lastSyncSuccess: true,
        syncInProgress: false,
        recordCount: customersCount.length,
        errorMessage: null
      });
      
      // Aggiorna stato vendite
      await this.storage.upsertSyncStatus('external_sales_sync', {
        lastSyncAt: now,
        lastSyncSuccess: true,
        syncInProgress: false,
        recordCount: salesCount.length,
        errorMessage: null
      });
      
      console.log('📊 Stato sincronizzazione aggiornato con successo');
    } catch (error) {
      console.error('❌ Errore nell\'aggiornamento dello stato:', error);
    }
  }

  /**
   * Aggiorna lo stato di sincronizzazione con errore
   */
  private async updateSyncStatusWithError(error: any): Promise<void> {
    try {
      const now = new Date();
      const errorMessage = error.message || 'Errore sconosciuto';
      
      // Aggiorna stato clienti con errore
      await this.storage.upsertSyncStatus('external_customers_sync', {
        lastSyncAt: now,
        lastSyncSuccess: false,
        syncInProgress: false,
        recordCount: 0,
        errorMessage
      });
      
      // Aggiorna stato vendite con errore
      await this.storage.upsertSyncStatus('external_sales_sync', {
        lastSyncAt: now,
        lastSyncSuccess: false,
        syncInProgress: false,
        recordCount: 0,
        errorMessage
      });
      
      console.log('📊 Stato sincronizzazione aggiornato con errore');
    } catch (updateError) {
      console.error('❌ Errore nell\'aggiornamento dello stato con errore:', updateError);
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

