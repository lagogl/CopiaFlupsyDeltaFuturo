import { Express } from 'express';
import * as AnalyticsController from '../../controllers/analytics-controller';

/**
 * Registra tutte le route del modulo ANALYTICS
 * Pattern: Riutilizzo controller esistente per rapidità
 */
export function registerAnalyticsRoutes(app: Express) {
  // ===== LOTS ANALYTICS =====
  // Analisi completa di tutti i lotti
  app.get('/api/analytics/lots', AnalyticsController.getLotsAnalytics);
  
  // Analisi dettagliata di un singolo lotto
  app.get('/api/analytics/lots/:id', AnalyticsController.getSingleLotAnalytics);

  // ===== SUPPLIERS ANALYTICS =====
  // Lista fornitori con statistiche
  app.get('/api/analytics/suppliers', AnalyticsController.getSuppliers);

  // ===== INVENTORY ANALYTICS =====
  // Inventario live con statistiche real-time
  app.get('/api/analytics/inventory-live', AnalyticsController.getLiveInventory);

  // ===== MORTALITY ANALYTICS =====
  // Trend mortalità nel tempo
  app.get('/api/analytics/mortality-trends', AnalyticsController.getMortalityTrends);

  // ===== SIZE ANALYTICS =====
  // Distribuzione taglie nell'inventario
  app.get('/api/analytics/sizes-distribution', AnalyticsController.getSizesDistribution);

  // ===== MIXED LOTS ANALYTICS =====
  // Composizione lotti misti
  app.get('/api/analytics/mixed-lots-composition', AnalyticsController.getMixedLotsComposition);

  // ===== TRACEABILITY =====
  // Tracciabilità completa di un lotto
  app.get('/api/analytics/lot-traceability/:lotId', AnalyticsController.getLotTraceability);

  console.log('✅ Modulo ANALYTICS registrato su /api/analytics');
}
