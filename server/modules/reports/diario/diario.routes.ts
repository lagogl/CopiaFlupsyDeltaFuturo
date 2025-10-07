import { Router } from 'express';
import { diarioController } from './diario.controller';

const router = Router();

router.get('/giacenza', (req, res) => diarioController.getGiacenza(req, res));
router.get('/operations-by-date', (req, res) => diarioController.getOperationsByDate(req, res));
router.get('/size-stats', (req, res) => diarioController.getSizeStats(req, res));
router.get('/daily-totals', (req, res) => diarioController.getDailyTotals(req, res));
router.get('/month-data-old', (req, res) => diarioController.getMonthDataOld(req, res));
router.get('/month-data', (req, res) => diarioController.getMonthData(req, res));
router.get('/calendar-csv', (req, res) => diarioController.getCalendarCsv(req, res));

export default router;
