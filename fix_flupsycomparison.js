/**
 * Questo file contiene le modifiche che devono essere apportate a FlupsyComparison.tsx
 * per correggere i calcoli di crescita.
 */

// Modifica 1: Linea 222
// Da
//   dailyRate = monthSgr.percentage; // Diretta, è già il valore giornaliero
// A
//   // Converti da percentuale mensile a giornaliera
//   const monthlyRate = monthSgr.percentage;
//   dailyRate = ((Math.pow(1 + monthlyRate/100, 1/30) - 1) * 100);

// Modifica 2: Linea 311
// Da
//   dailyRate = monthSgr.percentage; // Diretta, è già il valore giornaliero
// A
//   // Converti da percentuale mensile a giornaliera
//   const monthlyRate = monthSgr.percentage;
//   dailyRate = ((Math.pow(1 + monthlyRate/100, 1/30) - 1) * 100);

// Modifica 3: Aggiornare il valore di default sgrDailyPercentage
// Da
//   let sgrDailyPercentage = 2.0; // Valore di default (2% al giorno per crescita più realistica)
// A
//   let sgrDailyPercentage = 0.067; // Valore di default (2% mensile = ~0.067% al giorno)

// Modifica 4: Quando calcoliamo la percentuale SGR giornaliera dal mese corrente
// Da
//   if (currentSgr) {
//     sgrDailyPercentage = currentSgr.percentage; // Diretta, già valore giornaliero
//   }
// A
//   if (currentSgr) {
//     // Converti da percentuale mensile a giornaliera
//     const monthlyRate = currentSgr.percentage;
//     sgrDailyPercentage = ((Math.pow(1 + monthlyRate/100, 1/30) - 1) * 100);
//   }

// Nota importante: tutti i valori SGR nel database sono percentuali MENSILI,
// mai giornaliere. La conversione deve essere fatta ogni volta che si utilizzano
// questi valori per calcoli di crescita giornaliera.