// This file contains the corrected code for QuickOperations.tsx
// We need to replace all instances of "selectedDate" with "operationFormSaveDate"
// and all instances of "selectedDateString" with "operationFormSaveDateString"

// Example code replacement for any validation block in QuickOperations.tsx:
/*
const operationFormSaveDate = new Date(operationData.date);
const operationFormSaveDateString = operationFormSaveDate.toISOString().split("T")[0];
const hasOperationOnSameDate = basketOperations.some(op => {
  const opDate = new Date(op.date).toISOString().split("T")[0];
  return opDate === operationFormSaveDateString && op.type === operationData.type;
});
if (hasOperationOnSameDate) {
  toast({
    title: "Attenzione",
    description: `È già presente un'operazione di tipo ${getOperationTypeLabel(operationData.type)} per questa cesta alla data ${format(operationFormSaveDate, 'dd/MM/yyyy')}. Modifica la data prima di salvare.`,
    variant: "destructive"
  });
  return;
}
*/