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
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Brush } from "lucide-react";
import OperationsDropZoneContainer from "@/components/dashboard/OperationsDropZoneContainer";

export default function OperationsDragDrop() {
  const [selectedFlupsyId, setSelectedFlupsyId] = useState<number | null>(null);

  // Carica i dati dei FLUPSY
  const { data: flupsys, isLoading } = useQuery({
    queryKey: ['/api/flupsys'],
    queryFn: getQueryFn({ on401: "throw" })
  });

  // Se c'è almeno un FLUPSY, seleziona il primo di default
  useEffect(() => {
    if (flupsys && flupsys.length > 0 && !selectedFlupsyId) {
      setSelectedFlupsyId(flupsys[0].id);
    }
  }, [flupsys, selectedFlupsyId]);

  // Trova il FLUPSY selezionato
  const selectedFlupsy = flupsys?.find((f: any) => f.id === selectedFlupsyId);

  return (
    <>
      <Helmet>
        <title>Operazioni Drag&Drop</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Brush className="h-6 w-6 text-primary" /> 
              Operazioni Drag&Drop
            </h1>
            <p className="text-slate-500 mt-1">
              Gestisci velocemente le operazioni sulle ceste con drag & drop
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="w-64">
              <label className="text-sm font-medium mb-1 block">
                Seleziona FLUPSY
              </label>
              <Select
                value={selectedFlupsyId?.toString()}
                onValueChange={(value) => setSelectedFlupsyId(parseInt(value))}
              >
                <SelectTrigger className="bg-white">
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

        {selectedFlupsy && (
          <Card className="border-primary/20 mb-6 bg-gradient-to-r from-slate-50 to-blue-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                {selectedFlupsy.name}
                <Badge variant="outline" className="ml-2 text-xs font-normal">
                  {selectedFlupsy.location}
                </Badge>
              </CardTitle>
              <CardDescription>
                Trascina l'operazione sulle ceste per eseguirla
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 p-3 rounded-md border border-blue-100">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                <div>
                  <strong>Suggerimento:</strong> Trascina l'icona dell'operazione che vuoi eseguire e 
                  rilasciala sulla cesta desiderata. Inserisci i dati richiesti e conferma per 
                  completare l'operazione.
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading && (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {selectedFlupsyId && !isLoading && (
          <DndProvider backend={HTML5Backend}>
            <OperationsDropZoneContainer flupsyId={selectedFlupsyId} />
          </DndProvider>
        )}
      </div>
    </>
  );
}