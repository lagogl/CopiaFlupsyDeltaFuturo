// Bottone modificato per gestire correttamente le operazioni di tipo "peso"
<Button 
  onClick={() => {
    // Per l'operazione di tipo peso, assicuriamoci di usare i valori calcolati corretti
    if (operationData.type === 'peso' && operationData.totalWeight && operationData.animalCount) {
      // Ricalcoliamo animalsPerKg prima di inviare
      const totalWeightKg = operationData.totalWeight / 1000;
      const animalsPerKg = Math.round(operationData.animalCount / totalWeightKg);
      const averageWeight = 1000000 / animalsPerKg;
      
      // Trova il target size in base agli animali per kg calcolati
      const targetSize = getSizeFromAnimalsPerKg(animalsPerKg);
      
      // Trova l'ID della taglia corrispondente nel database
      const sizeId = targetSize ? 
        sizes?.find(s => s.code === targetSize.code)?.id || operationData.sizeId : 
        operationData.sizeId;
      
      // Aggiorniamo l'oggetto operationData con i valori calcolati corretti
      const updatedOperationData = {
        ...operationData,
        animalsPerKg,
        averageWeight,
        sizeId
      };
      
      console.log("Dati aggiornati prima dell'invio:", updatedOperationData);
      createOperationMutation.mutate(updatedOperationData);
    } else {
      // Per altri tipi di operazioni, procediamo normalmente
      createOperationMutation.mutate(operationData);
    }
  }}
  disabled={createOperationMutation.isPending}
>
  {createOperationMutation.isPending ? (
    <>
      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      Salvataggio...
    </>
  ) : "Salva Operazione"}
</Button>