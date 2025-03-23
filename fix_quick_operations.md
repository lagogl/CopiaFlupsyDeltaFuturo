# Problema

Nell'operazione "Peso", i valori calcolati (totalWeight, animalsPerKg, averageWeight) non vengono inclusi nella richiesta al server quando si salva l'operazione.

## Analisi

1. Abbiamo già sostituito l'input di tipo controllato con un input non controllato con ID `peso-totale-kg`
2. Il calcolo funziona quando si preme il pulsante "Calcola"
3. Il problema è che quando si preme "Salva Operazione", i dati calcolati non vengono inclusi nella richiesta

## Soluzione

Dobbiamo modificare la funzione che gestisce il pulsante "Salva Operazione" in modo che:

1. Controlli se è un'operazione di tipo "peso"
2. Se lo è, legga il valore dal campo input
3. Calcoli i valori derivati (totalWeight, animalsPerKg, averageWeight)
4. Includa questi valori nella richiesta al server

## Implementazione

```javascript
// Nel pulsante "Salva Operazione"
onClick={() => {
  // Verifichiamo se è un'operazione di peso e se dobbiamo aggiornare i dati prima di salvare
  if (operationData.type === 'peso') {
    const input = document.getElementById('peso-totale-kg') as HTMLInputElement;
    if (input && input.value) {
      const totalWeightKg = parseFloat(input.value);
      if (!isNaN(totalWeightKg) && totalWeightKg > 0) {
        // Aggiorniamo i dati dell'operazione prima di salvarla
        const totalWeightGrams = totalWeightKg * 1000;
        
        // Se non abbiamo animalsPerKg ma abbiamo animalCount, calcoliamolo
        let animalsPerKg = operationData.animalsPerKg;
        let averageWeight = operationData.averageWeight;
        
        if (!animalsPerKg && operationData.animalCount) {
          animalsPerKg = Math.round(operationData.animalCount / totalWeightKg);
          averageWeight = 1000000 / animalsPerKg;
        }
        
        // Creiamo una copia dei dati per evitare di modificare l'originale
        const finalData = {
          ...operationData,
          totalWeight: totalWeightGrams,
          animalsPerKg,
          averageWeight
        };
        
        console.log("Dati operazione inviati al server:", finalData);
        createOperationMutation.mutate(finalData);
        return;
      }
    }
  }
  
  // Se non è un'operazione di peso o mancano i dati, procediamo con i dati esistenti
  console.log("Dati operazione inviati al server:", operationData);
  createOperationMutation.mutate(operationData);
}}
```
