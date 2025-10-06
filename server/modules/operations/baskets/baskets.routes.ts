/**
 * Route per il modulo cestelli
 */

import { Router } from 'express';
import { basketsController } from './baskets.controller';

const router = Router();

// Route di ricerca e query
router.get('/find-by-nfc', (req, res) => basketsController.findByNfc(req, res));
router.get('/with-flupsy-details', (req, res) => basketsController.getBasketsWithFlupsyDetails(req, res));
router.get('/details/:id?', (req, res) => basketsController.getBasketDetails(req, res));
router.get('/check-exists', (req, res) => basketsController.checkExists(req, res));
router.get('/check-position', (req, res) => basketsController.checkPosition(req, res));
router.get('/next-number/:flupsyId', (req, res) => basketsController.getNextNumber(req, res));
router.get('/next-position/:flupsyId', (req, res) => basketsController.getNextPosition(req, res));
router.get('/available', (req, res) => basketsController.getAvailable(req, res));

// Route CRUD principali
router.get('/', (req, res) => basketsController.getBaskets(req, res));
router.get('/:id', (req, res) => basketsController.getBasket(req, res));
router.post('/', (req, res) => basketsController.createBasket(req, res));
router.patch('/:id', (req, res) => basketsController.updateBasket(req, res));
router.delete('/:id', (req, res) => basketsController.deleteBasket(req, res));

// Route di azioni specifiche
router.post('/:id/move', (req, res) => basketsController.moveBasket(req, res));
router.post('/switch-positions', (req, res) => basketsController.switchPositions(req, res));
router.post('/fix-null-rows', (req, res) => basketsController.fixNullRows(req, res));

export default router;