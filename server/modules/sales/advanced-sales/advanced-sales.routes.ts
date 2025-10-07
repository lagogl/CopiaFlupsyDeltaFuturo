import { Router } from 'express';
import * as AdvancedSalesController from '../../../controllers/advanced-sales-controller';

const router = Router();

// Operazioni vendita disponibili
router.get('/operations', AdvancedSalesController.getAvailableSaleOperations);

// Ordini disponibili per vendite
router.get('/orders', AdvancedSalesController.getAvailableOrders);

// Clienti per vendite
router.get('/customers', AdvancedSalesController.getCustomers);

// CRUD vendite avanzate
router.get('/', AdvancedSalesController.getAdvancedSales);
router.get('/:id', AdvancedSalesController.getAdvancedSale);
router.post('/', AdvancedSalesController.createAdvancedSale);
router.patch('/:id/status', AdvancedSalesController.updateSaleStatus);
router.delete('/:id', AdvancedSalesController.deleteSale);

// Configurazione sacchi
router.post('/:saleId/bags', AdvancedSalesController.configureBags);

// Generazione e download PDF
router.get('/:id/generate-pdf', AdvancedSalesController.generateSalePDF);
router.get('/:id/download-pdf', AdvancedSalesController.downloadSalePDF);

// Generazione DDT e report PDF
router.post('/:id/generate-ddt', AdvancedSalesController.generateDDT);
router.get('/:id/report.pdf', AdvancedSalesController.generatePDFReport);

// Note: DDT routes are handled separately in routes.ts due to different base path

export default router;
