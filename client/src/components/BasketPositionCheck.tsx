import { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";

interface BasketPositionCheckProps {
  flupsyId: number | null;
  row: string | null;
  position: number | null;
  basketId?: number | null; // opzionale, usato durante la modifica
  onValidationChange: (isValid: boolean) => void;
}

export default function BasketPositionCheck({ 
  flupsyId, 
  row, 
  position, 
  basketId = null,
  onValidationChange 
}: BasketPositionCheckProps) {
  const [error, setError] = useState<string | null>(null);
  const [warningOnly, setWarningOnly] = useState<boolean>(false);
  
  // Query per verificare l'esistenza della posizione
  const positionQuery = useQuery<any>({
    queryKey: ['/api/baskets/check-position', flupsyId, row, position, basketId],
    queryFn: async () => {
      if (!flupsyId || !row || !position) return { positionTaken: false };
      
      let url = `/api/baskets/check-position?flupsyId=${flupsyId}&row=${row}&position=${position}`;
      if (basketId) {
        url += `&basketId=${basketId}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Errore nella verifica della posizione");
      }
      return response.json();
    },
    enabled: !!flupsyId && !!row && !!position, // Eseguire solo quando abbiamo tutti i parametri necessari
  });
  
  useEffect(() => {
    // Salta la validazione se non abbiamo i parametri necessari
    if (!flupsyId || !row || !position) {
      setError(null);
      setWarningOnly(false);
      onValidationChange(true);
      return;
    }
    
    // Se stiamo caricando, non fare nulla
    if (positionQuery.isLoading) {
      return;
    }
    
    // Se c'è stato un errore nella query, mostra l'errore ma consenti comunque il salvataggio
    if (positionQuery.isError) {
      setError("Errore durante la verifica della posizione. Controllare manualmente.");
      setWarningOnly(true);
      onValidationChange(true);
      return;
    }
    
    // Se la query è andata a buon fine, verifica il risultato
    if (positionQuery.data) {
      if (positionQuery.data.positionTaken) {
        setError(positionQuery.data.message);
        setWarningOnly(false);
        onValidationChange(false);
      } else {
        // La posizione non è occupata, tutto ok
        setError(null);
        setWarningOnly(false);
        onValidationChange(true);
      }
    }
  }, [flupsyId, row, position, basketId, positionQuery.data, positionQuery.isLoading, positionQuery.isError, onValidationChange]);
  
  if (!error) return null;
  
  return (
    <Alert 
      variant={warningOnly ? "default" : "destructive"} 
      className={`mt-2 mb-4 ${warningOnly ? "border-amber-400" : ""}`} 
    >
      {warningOnly ? 
        <AlertTriangle className="h-4 w-4" /> : 
        <AlertCircle className="h-4 w-4" />
      }
      <AlertTitle>{warningOnly ? "Attenzione" : "Errore"}</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}