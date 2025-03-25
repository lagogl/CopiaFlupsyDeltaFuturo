// Script di correzione per i calcoli SGR
// Questo file contiene le formule e il metodo di conversione da SGR mensile a giornaliero

/**
 * Converti percentuale SGR mensile in percentuale giornaliera
 * Formula: dailyRate = ((1 + monthlyRate/100)^(1/30) - 1) * 100
 * 
 * Esempi:
 * SGR mensile 3%   -> SGR giornaliero ~0.0989%
 * SGR mensile 4%   -> SGR giornaliero ~0.1314% 
 * SGR mensile 0.5% -> SGR giornaliero ~0.0166%
 */

function monthlyToDaily(monthlyPercentage) {
  return ((Math.pow(1 + monthlyPercentage/100, 1/30) - 1) * 100);
}

// Esempio di output dei valori convertiti
console.log("Tabella di conversione SGR mensile -> giornaliero:");
console.log("--------------------------------------------------");
console.log("Mese      | % Mensile | % Giornaliero");
console.log("--------------------------------------------------");
console.log(`Gennaio   | 0.5%      | ${monthlyToDaily(0.5).toFixed(4)}%`);
console.log(`Febbraio  | 1.0%      | ${monthlyToDaily(1.0).toFixed(4)}%`);
console.log(`Marzo     | 1.5%      | ${monthlyToDaily(1.5).toFixed(4)}%`);
console.log(`Aprile    | 2.0%      | ${monthlyToDaily(2.0).toFixed(4)}%`);
console.log(`Maggio    | 2.5%      | ${monthlyToDaily(2.5).toFixed(4)}%`);
console.log(`Giugno    | 3.0%      | ${monthlyToDaily(3.0).toFixed(4)}%`);
console.log(`Luglio    | 3.5%      | ${monthlyToDaily(3.5).toFixed(4)}%`);
console.log(`Agosto    | 4.0%      | ${monthlyToDaily(4.0).toFixed(4)}%`);
console.log(`Settembre | 3.0%      | ${monthlyToDaily(3.0).toFixed(4)}%`);
console.log(`Ottobre   | 2.0%      | ${monthlyToDaily(2.0).toFixed(4)}%`);
console.log(`Novembre  | 1.0%      | ${monthlyToDaily(1.0).toFixed(4)}%`);
console.log(`Dicembre  | 0.5%      | ${monthlyToDaily(0.5).toFixed(4)}%`);
console.log("--------------------------------------------------");

// Simulazione di crescita con SGR mensile del 3% per 30 giorni
// Confronto tra applicazione diretta e corretta
console.log("\nSimulazione di crescita per un mese (30 giorni):");
console.log("Peso iniziale: 100 mg");

// Modo errato (applicare direttamente la percentuale mensile ogni giorno)
let wrongWeight = 100;
for (let i = 0; i < 30; i++) {
  wrongWeight = wrongWeight * (1 + 3/100); // usa 3% ogni giorno
}
console.log(`Peso finale (applicazione errata): ${wrongWeight.toFixed(2)} mg`);
console.log(`Crescita: ${((wrongWeight/100-1)*100).toFixed(2)}%`);

// Modo corretto (convertire la percentuale mensile in giornaliera)
let correctWeight = 100;
const dailyRate = monthlyToDaily(3);
for (let i = 0; i < 30; i++) {
  correctWeight = correctWeight * (1 + dailyRate/100);
}
console.log(`Peso finale (applicazione corretta): ${correctWeight.toFixed(2)} mg`);
console.log(`Crescita: ${((correctWeight/100-1)*100).toFixed(2)}%`);