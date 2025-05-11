// Esporta tutti i controller per facilitare l'importazione

import { getMonthData, exportCalendarCsv, getMonthDataForExport } from './diario-controller.ts';

export const diarioController = {
  getMonthData,
  exportCalendarCsv,
  getMonthDataForExport
};