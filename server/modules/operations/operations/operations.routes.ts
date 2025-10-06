/**
 * Route per il modulo operazioni
 */

import { Router } from 'express';
import { operationsController } from './operations.controller';

const router = Router();

// Route di query specifiche (prima delle route parametriche)
router.get('/date-range', (req, res) => operationsController.getOperationsByDateRange(req, res));
router.get('/basket/:basketId', (req, res) => operationsController.getOperationsByBasket(req, res));
router.get('/cycle/:cycleId', (req, res) => operationsController.getOperationsByCycle(req, res));

// Route ottimizzate
router.get('-optimized', (req, res) => operationsController.getOperationsOptimized(req, res));

// Route CRUD principali
router.get('/', (req, res) => operationsController.getOperations(req, res));
router.get('/:id', (req, res) => operationsController.getOperation(req, res));
router.post('/', (req, res) => operationsController.createOperation(req, res));
router.patch('/:id', (req, res) => operationsController.updateOperation(req, res));
router.delete('/:id', (req, res) => operationsController.deleteOperation(req, res));

export default router;
