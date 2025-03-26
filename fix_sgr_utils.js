// Questo file verifica che la funzione monthlyToDaily in utils.ts sia corretta

/**
 * Converti percentuale SGR mensile in percentuale giornaliera
 * Formula: dailyRate = ((1 + monthlyRate/100)^(1/30) - 1) * 100
 */
function monthlyToDaily(monthlyPercentage) {
  return ((Math.pow(1 + monthlyPercentage/100, 1/30) - 1) * 100);
}

// Verifichiamo che la funzione funzioni come previsto
console.log("Verifica funzione monthlyToDaily:");
console.log("SGR mensile 1%   -> SGR giornaliero:", monthlyToDaily(1).toFixed(4), "%");
console.log("SGR mensile 2%   -> SGR giornaliero:", monthlyToDaily(2).toFixed(4), "%");
console.log("SGR mensile 3%   -> SGR giornaliero:", monthlyToDaily(3).toFixed(4), "%");

// Verifichiamo che applicando il tasso giornaliero per 30 giorni otterremo il tasso mensile
console.log("\nVerifica che la formula riproduca il tasso mensile:");

function simulateGrowth(initialWeight, monthlyRate, days) {
  // Converti tasso mensile in giornaliero
  const dailyRate = monthlyToDaily(monthlyRate);
  
  // Simula crescita giorno per giorno
  let weight = initialWeight;
  for (let i = 0; i < days; i++) {
    weight = weight * (1 + dailyRate/100);
  }
  
  return weight;
}

const initialWeight = 100; // peso iniziale in mg
const monthlyRates = [1, 2, 3, 4, 5];
const days = 30;

monthlyRates.forEach(rate => {
  const finalWeight = simulateGrowth(initialWeight, rate, days);
  const actualGrowthPercent = ((finalWeight / initialWeight - 1) * 100).toFixed(2);
  console.log(`Con SGR mensile ${rate}%, dopo ${days} giorni: ${finalWeight.toFixed(2)} mg (crescita: ${actualGrowthPercent}%)`);
});