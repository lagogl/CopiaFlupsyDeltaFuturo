import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Helmet } from "react-helmet";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import OperationsDropZoneContainer from "@/components/dashboard/OperationsDropZoneContainer";

export default function OperationsDragDrop() {
  const [selectedFlupsyId, setSelectedFlupsyId] = useState<number | null>(null);

  // Carica i dati dei FLUPSY
  const { data: flupsys } = useQuery({
    queryKey: ['/api/flupsys'],
    queryFn: getQueryFn({ on401: "throw" })
  });

  // Se c'è almeno un FLUPSY, seleziona il primo di default
  useEffect(() => {
    if (flupsys && flupsys.length > 0 && !selectedFlupsyId) {
      setSelectedFlupsyId(flupsys[0].id);
    }
  }, [flupsys, selectedFlupsyId]);

  return (
    <>
      <Helmet>
        <title>Operazioni Drag&Drop</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">Operazioni Drag&Drop</h1>
          
          <div className="flex items-center space-x-4">
            <div className="w-64">
              <label className="text-sm font-medium mb-1 block">
                Seleziona FLUPSY
              </label>
              <Select
                value={selectedFlupsyId?.toString()}
                onValueChange={(value) => setSelectedFlupsyId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona un FLUPSY" />
                </SelectTrigger>
                <SelectContent>
                  {flupsys && flupsys.map((flupsy: any) => (
                    <SelectItem key={flupsy.id} value={flupsy.id.toString()}>
                      {flupsy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Suggerimento:</strong> Trascina l'icona dell'operazione che vuoi eseguire e 
                rilasciala sulla cesta desiderata. Inserisci i dati richiesti e conferma per 
                completare l'operazione.
              </p>
            </div>
          </div>
        </div>

        {selectedFlupsyId && (
          <DndProvider backend={HTML5Backend}>
            <OperationsDropZoneContainer flupsyId={selectedFlupsyId} />
          </DndProvider>
        )}
      </div>
    </>
  );
}