/**
 * Servizio di sincronizzazione per dati esterni
 * 
 * Gestisce la sincronizzazione periodica di clienti e vendite da database esterni
 * per generare report di vendita locali con performance ottimali.
 */

import { Pool } from 'pg';
import { IStorage } from './storage';
import { 
  InsertExternalCustomerSync, 
  InsertExternalSaleSync, 
  InsertExternalDeliverySync,
  InsertExternalDeliveryDetailSync,
  InsertSyncStatus 
} from '@shared/schema';

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
  private syncTimer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(storage: IStorage, config: SyncConfig) {
    this.storage = storage;
    this.config = config;
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
   * Avvia la sincronizzazione periodica
   */
  startSync(): void {
    if (this.isRunning) {
      console.log('⚠️ Sincronizzazione già in corso');
      return;
    }

    this.isRunning = true;
    console.log(`🔄 Avvio sincronizzazione periodica (ogni ${this.config.syncIntervalMinutes} minuti)`);

    // Esegui la prima sincronizzazione immediatamente
    this.runSyncCycle().catch(console.error);

    // Programma le sincronizzazioni successive
    this.syncTimer = setInterval(() => {
      this.runSyncCycle().catch(console.error);
    }, this.config.syncIntervalMinutes * 60 * 1000);
  }

  /**
   * Ferma la sincronizzazione periodica
   */
  stopSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    this.isRunning = false;
    console.log('🛑 Sincronizzazione fermata');
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
   * Esegue un ciclo completo di sincronizzazione
   */
  async runSyncCycle(): Promise<void> {
    if (!this.externalPool) {
      console.error('❌ Database esterno non configurato');
      return;
    }

    console.log('🔄 Inizio ciclo di sincronizzazione');

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
      if (this.config.deliveries.enabled) {
        await this.syncDeliveries();
      }

      // Sincronizza dettagli consegne
      if (this.config.deliveryDetails.enabled) {
        await this.syncDeliveryDetails();
      }

      console.log('✅ Ciclo di sincronizzazione completato');
    } catch (error) {
      console.error('❌ Errore durante sincronizzazione:', error);
      
      // Aggiorna stato di errore per tutte le tabelle
      await this.updateSyncStatus('external_customers_sync', false, String(error));
      await this.updateSyncStatus('external_sales_sync', false, String(error));
    }
  }

  /**
   * Pulisce le tabelle di sincronizzazione per garantire dati sempre aggiornati
   */
  private async clearSyncTables(): Promise<void> {
    try {
      console.log('🧹 Pulizia tabelle di sincronizzazione...');
      
      // Pulisci la tabella delle vendite sincronizzate
      await this.storage.clearExternalSalesSync();
      
      // Pulisci la tabella dei clienti sincronizzati
      await this.storage.clearExternalCustomersSync();
      
      // Pulisci la tabella delle consegne sincronizzate
      if (this.storage.clearExternalDeliveriesSync) {
        await this.storage.clearExternalDeliveriesSync();
      }
      
      // Pulisci la tabella dei dettagli consegne sincronizzati
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
    const tableName = 'external_customers_sync';
    
    try {
      await this.updateSyncStatus(tableName, true, null, true);

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

      await this.updateSyncStatus(tableName, true, null, false, customers.length);
      
    } catch (error) {
      await this.updateSyncStatus(tableName, false, String(error), false);
      throw error;
    }
  }

  /**
   * Sincronizza le vendite dal database esterno
   */
  private async syncSales(): Promise<void> {
    const tableName = 'external_sales_sync';
    
    try {
      await this.updateSyncStatus(tableName, true, null, true);

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

      await this.updateSyncStatus(tableName, true, null, false, sales.length);
      
    } catch (error) {
      await this.updateSyncStatus(tableName, false, String(error), false);
      throw error;
    }
  }

  /**
   * Sincronizza le consegne dal database esterno
   */
  private async syncDeliveries(): Promise<void> {
    const tableName = 'external_deliveries_sync';
    
    try {
      await this.updateSyncStatus(tableName, true, null, true);

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

      await this.updateSyncStatus(tableName, true, null, false, deliveries.length);
      
    } catch (error) {
      await this.updateSyncStatus(tableName, false, String(error), false);
      throw error;
    }
  }

  /**
   * Sincronizza i dettagli consegne dal database esterno
   */
  private async syncDeliveryDetails(): Promise<void> {
    const tableName = 'external_delivery_details_sync';
    
    try {
      await this.updateSyncStatus(tableName, true, null, true);

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

      await this.updateSyncStatus(tableName, true, null, false, deliveryDetails.length);
      
    } catch (error) {
      await this.updateSyncStatus(tableName, false, String(error), false);
      throw error;
    }
  }

  /**
   * Mappa i dati di un cliente dal formato esterno
   */
  private mapCustomerData(row: any, mapping: Record<string, string>): InsertExternalCustomerSync {
    const mapped: any = {};
    
    for (const [localField, externalField] of Object.entries(mapping)) {
      mapped[localField] = row[externalField];
    }

    return {
      externalId: mapped.externalId || row.id,
      customerCode: mapped.customerCode || row.code || '',
      customerName: mapped.customerName || row.name || '',
      customerType: mapped.customerType || row.type,
      vatNumber: mapped.vatNumber || row.vat_number,
      taxCode: mapped.taxCode || row.tax_code,
      address: mapped.address || row.address,
      city: mapped.city || row.city,
      province: mapped.province || row.province,
      postalCode: mapped.postalCode || row.postal_code,
      country: mapped.country || row.country || 'IT',
      phone: mapped.phone || row.phone,
      email: mapped.email || row.email,
      isActive: mapped.isActive !== undefined ? mapped.isActive : true,
      notes: mapped.notes || row.notes,
      lastModifiedExternal: mapped.lastModifiedExternal ? new Date(mapped.lastModifiedExternal) : new Date()
    };
  }

  /**
   * Mappa i dati di una vendita dal formato esterno
   */
  private mapSaleData(row: any, mapping: Record<string, string>): InsertExternalSaleSync {
    const mapped: any = {};
    
    for (const [localField, externalField] of Object.entries(mapping)) {
      mapped[localField] = row[externalField];
    }

    return {
      externalId: Number(mapped.externalId || row.id),
      saleNumber: String(mapped.saleNumber || row.sale_number || ''),
      saleDate: mapped.saleDate ? new Date(mapped.saleDate).toISOString().split('T')[0] : (row.sale_date ? new Date(row.sale_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
      customerId: Number(mapped.customerId || row.customer_id || 0),
      customerName: String(mapped.customerName || row.customer_name || ''),
      productCode: String(mapped.productCode || row.product_code || ''),
      productName: String(mapped.productName || row.product_name || ''),
      productCategory: String(mapped.productCategory || row.product_category || ''),
      quantity: String(mapped.quantity || row.quantity || '0'),
      unitOfMeasure: String(mapped.unitOfMeasure || row.unit_of_measure || 'kg'),
      unitPrice: String(mapped.unitPrice || row.unit_price || '0'),
      totalAmount: String(mapped.totalAmount || row.total_amount || '0'),
      discountPercent: String(mapped.discountPercent || row.discount_percent || '0'),
      discountAmount: String(mapped.discountAmount || row.discount_amount || '0'),
      netAmount: String(mapped.netAmount || row.net_amount || '0'),
      vatPercent: String(mapped.vatPercent || row.vat_percent || '22'),
      vatAmount: String(mapped.vatAmount || row.vat_amount || '0'),
      totalWithVat: String(mapped.totalWithVat || row.total_with_vat || '0'),
      paymentMethod: String(mapped.paymentMethod || row.payment_method || ''),
      deliveryDate: mapped.deliveryDate ? new Date(mapped.deliveryDate).toISOString().split('T')[0] : (row.delivery_date ? new Date(row.delivery_date).toISOString().split('T')[0] : null),
      origin: mapped.origin || row.origin,
      lotReference: mapped.lotReference || row.lot_reference,
      salesPerson: mapped.salesPerson || row.sales_person,
      notes: mapped.notes || row.notes,
      status: mapped.status || row.status || 'completed',
      lastModifiedExternal: mapped.lastModifiedExternal ? new Date(mapped.lastModifiedExternal) : new Date()
    };
  }

  /**
   * Mappa i dati di una consegna dal formato esterno
   */
  private mapDeliveryData(row: any, mapping: Record<string, string>): InsertExternalDeliverySync {
    const mapped: any = {};
    
    for (const [localField, externalField] of Object.entries(mapping)) {
      mapped[localField] = row[externalField];
    }

    return {
      externalId: Number(mapped.externalId || row.id),
      dataCreazione: mapped.dataCreazione ? new Date(mapped.dataCreazione) : new Date(row.data_creazione),
      clienteId: mapped.clienteId ? Number(mapped.clienteId) : (row.cliente_id ? Number(row.cliente_id) : null),
      ordineId: mapped.ordineId ? Number(mapped.ordineId) : (row.ordine_id ? Number(row.ordine_id) : null),
      dataConsegna: mapped.dataConsegna ? new Date(mapped.dataConsegna).toISOString().split('T')[0] : new Date(row.data_consegna).toISOString().split('T')[0],
      stato: mapped.stato || row.stato,
      numeroTotaleCeste: Number(mapped.numeroTotaleCeste || row.numero_totale_ceste),
      pesoTotaleKg: String(mapped.pesoTotaleKg || row.peso_totale_kg),
      totaleAnimali: Number(mapped.totaleAnimali || row.totale_animali),
      tagliaMedia: mapped.tagliaMedia || row.taglia_media,
      qrcodeUrl: mapped.qrcodeUrl || row.qrcode_url,
      note: mapped.note || row.note,
      numeroProgressivo: mapped.numeroProgressivo ? Number(mapped.numeroProgressivo) : (row.numero_progressivo ? Number(row.numero_progressivo) : null),
      lastModifiedExternal: mapped.lastModifiedExternal ? new Date(mapped.lastModifiedExternal) : new Date()
    };
  }

  /**
   * Mappa i dati di un dettaglio consegna dal formato esterno
   */
  private mapDeliveryDetailData(row: any, mapping: Record<string, string>): InsertExternalDeliveryDetailSync {
    const mapped: any = {};
    
    for (const [localField, externalField] of Object.entries(mapping)) {
      mapped[localField] = row[externalField];
    }

    return {
      externalId: Number(mapped.externalId || row.id),
      reportId: Number(mapped.reportId || row.report_id),
      misurazioneId: mapped.misurazioneId ? Number(mapped.misurazioneId) : (row.misurazione_id ? Number(row.misurazione_id) : null),
      vascaId: Number(mapped.vascaId || row.vasca_id),
      codiceSezione: String(mapped.codiceSezione || row.codice_sezione),
      numeroCeste: Number(mapped.numeroCeste || row.numero_ceste),
      pesoCesteKg: String(mapped.pesoCesteKg || row.peso_ceste_kg),
      taglia: mapped.taglia || row.taglia,
      animaliPerKg: mapped.animaliPerKg ? String(mapped.animaliPerKg) : (row.animali_per_kg ? String(row.animali_per_kg) : null),
      percentualeGuscio: mapped.percentualeGuscio ? String(mapped.percentualeGuscio) : (row.percentuale_guscio ? String(row.percentuale_guscio) : null),
      percentualeMortalita: mapped.percentualeMortalita ? String(mapped.percentualeMortalita) : (row.percentuale_mortalita ? String(row.percentuale_mortalita) : null),
      numeroAnimali: Number(mapped.numeroAnimali || row.numero_animali),
      note: mapped.note || row.note,
      lastModifiedExternal: mapped.lastModifiedExternal ? new Date(mapped.lastModifiedExternal) : new Date()
    };
  }

  /**
   * Aggiorna lo stato di sincronizzazione
   */
  private async updateSyncStatus(
    tableName: string, 
    success: boolean, 
    errorMessage: string | null, 
    inProgress: boolean = false,
    recordCount: number = 0
  ): Promise<void> {
    try {
      const existing = await this.storage.getSyncStatusByTable(tableName);
      
      if (existing) {
        await this.storage.updateSyncStatus(tableName, {
          lastSyncAt: success ? new Date() : existing.lastSyncAt,
          lastSyncSuccess: success,
          syncInProgress: inProgress,
          recordCount: success ? recordCount : existing.recordCount,
          errorMessage,
          updatedAt: new Date()
        });
      } else {
        await this.storage.upsertSyncStatus(tableName, {
          lastSyncAt: success ? new Date() : null,
          lastSyncSuccess: success,
          syncInProgress: inProgress,
          recordCount,
          errorMessage
        });
      }
    } catch (error) {
      console.error('Errore aggiornamento stato sync:', error);
    }
  }

  /**
   * Esegue una sincronizzazione manuale
   */
  async manualSync(): Promise<{ success: boolean; message: string }> {
    try {
      await this.runSyncCycle();
      return { success: true, message: 'Sincronizzazione completata con successo' };
    } catch (error) {
      return { success: false, message: `Errore durante sincronizzazione: ${error}` };
    }
  }

  /**
   * Ottiene lo stato della sincronizzazione
   */
  async getSyncStatus(): Promise<any> {
    const status = await this.storage.getSyncStatus();
    return {
      isRunning: this.isRunning,
      hasExternalConnection: this.externalPool !== null,
      syncIntervalMinutes: this.config.syncIntervalMinutes,
      tables: status
    };
  }

  /**
   * Pulisce le risorse
   */
  async cleanup(): Promise<void> {
    this.stopSync();
    
    if (this.externalPool) {
      await this.externalPool.end();
      this.externalPool = null;
    }
  }
}

/**
 * Configurazione di default per la sincronizzazione
 */
export const defaultSyncConfig: SyncConfig = {
  customers: {
    enabled: true,
    tableName: 'customers',
    query: 'SELECT * FROM customers WHERE updated_at > $1 OR $1 IS NULL',
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
      isActive: 'is_active',
      notes: 'notes',
      lastModifiedExternal: 'updated_at'
    }
  },
  sales: {
    enabled: true,
    tableName: 'ordini',
    query: 'SELECT * FROM ordini ORDER BY id',
    mapping: {
      externalId: 'id',
      saleNumber: 'numero_ordine',
      saleDate: 'data_ordine',
      customerId: 'cliente_id',
      customerName: 'cliente_nome',
      productCode: 'codice_prodotto',
      productName: 'nome_prodotto',
      productCategory: 'categoria_prodotto',
      quantity: 'quantita',
      unitOfMeasure: 'unita_misura',
      unitPrice: 'prezzo_unitario',
      totalAmount: 'totale',
      discountPercent: 'sconto_percentuale',
      discountAmount: 'sconto_importo',
      netAmount: 'netto',
      vatPercent: 'iva_percentuale',
      vatAmount: 'iva_importo',
      totalWithVat: 'totale_con_iva',
      paymentMethod: 'metodo_pagamento',
      deliveryDate: 'data_consegna',
      origin: 'origine',
      lotReference: 'riferimento_lotto',
      salesPerson: 'venditore',
      notes: 'note',
      status: 'stato',
      lastModifiedExternal: 'updated_at'
    }
  },
  deliveries: {
    enabled: true,
    tableName: 'reports_consegna',
    query: 'SELECT * FROM reports_consegna ORDER BY id',
    mapping: {
      externalId: 'id',
      dataCreazione: 'data_creazione',
      clienteId: 'cliente_id',
      ordineId: 'ordine_id',
      dataConsegna: 'data_consegna',
      stato: 'stato',
      numeroTotaleCeste: 'numero_totale_ceste',
      pesoTotaleKg: 'peso_totale_kg',
      totaleAnimali: 'totale_animali',
      tagliaMedia: 'taglia_media',
      qrcodeUrl: 'qrcode_url',
      note: 'note',
      numeroProgressivo: 'numero_progressivo',
      lastModifiedExternal: 'data_creazione'
    }
  },
  deliveryDetails: {
    enabled: true,
    tableName: 'reports_consegna_dettagli',
    query: 'SELECT * FROM reports_consegna_dettagli ORDER BY id',
    mapping: {
      externalId: 'id',
      reportId: 'report_id',
      misurazioneId: 'misurazione_id',
      vascaId: 'vasca_id',
      codiceSezione: 'codice_sezione',
      numeroCeste: 'numero_ceste',
      pesoCesteKg: 'peso_ceste_kg',
      taglia: 'taglia',
      animaliPerKg: 'animali_per_kg',
      percentualeGuscio: 'percentuale_guscio',
      percentualeMortalita: 'percentuale_mortalita',
      numeroAnimali: 'numero_animali',
      note: 'note',
      lastModifiedExternal: 'id'
    }
  },
  syncIntervalMinutes: 60, // Sincronizzazione ogni ora
  batchSize: 1000
};