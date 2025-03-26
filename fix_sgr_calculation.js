// Script per verificare il calcolo della crescita usando tassi SGR giornalieri

/**
 * Calcola la crescita utilizzando il tasso SGR giornaliero
 * @param {number} initialWeight - Peso iniziale in mg
 * @param {number} dailyRate - Tasso SGR giornaliero in percentuale
 * @param {number} days - Numero di giorni
 * @returns {number} - Peso finale dopo i giorni specificati
 */
function simulateGrowthWithDailySGR(initialWeight, dailyRate, days) {
  let weight = initialWeight;
  for (let i = 0; i < days; i++) {
    weight = weight * (1 + dailyRate/100);
  }
  return weight;
}

// Test con diversi tassi di crescita giornalieri
const initialWeight = 100; // mg
const dailyRates = [0.1, 0.2, 0.3, 0.5, 1.0];
const days = 30;

console.log("Crescita usando tassi SGR giornalieri:");
console.log("-".repeat(50));
console.log("Peso iniziale:", initialWeight, "mg");
console.log("-".repeat(50));

dailyRates.forEach(rate => {
  const finalWeight = simulateGrowthWithDailySGR(initialWeight, rate, days);
  const growthPercent = ((finalWeight / initialWeight - 1) * 100).toFixed(2);
  
  console.log(`Con tasso SGR giornaliero ${rate}%:`);
  console.log(`- Peso dopo ${days} giorni: ${finalWeight.toFixed(2)} mg`);
  console.log(`- Crescita percentuale: ${growthPercent}%`);
  console.log("-".repeat(50));
});