// Questo è il codice corretto per il pulsante "Salva Operazione" che deve essere inserito al posto dell'attuale
// in QuickOperations.tsx

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