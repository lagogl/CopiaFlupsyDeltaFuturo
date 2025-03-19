import { useEffect, useState } from "react";
import { AlertCircle, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";

interface BasketExistsCheckProps {
  flupsyId: number | null;
  basketNumber: number | null;
  onValidationChange: (isValid: boolean) => void;
}

export default function BasketExistsCheck({ 
  flupsyId, 
  basketNumber, 
  onValidationChange 
}: BasketExistsCheckProps) {
  const [error, setError] = useState<string | null>(null);
  const [warningOnly, setWarningOnly] = useState<boolean>(false);
  
  // Query per verificare l'esistenza della cesta
  const basketExistsQuery = useQuery<any>({
    queryKey: ['/api/baskets/check-exists', flupsyId, basketNumber],
    queryFn: async () => {
      if (!flupsyId || !basketNumber) return { exists: false };
      
      const response = await fetch(`/api/baskets/check-exists?flupsyId=${flupsyId}&physicalNumber=${basketNumber}`);
      if (!response.ok) {
        throw new Error("Errore nella verifica dell'esistenza della cesta");
      }
      return response.json();
    },
    enabled: !!flupsyId && !!basketNumber, // Eseguire solo quando abbiamo flupsyId e basketNumber
  });
  
  useEffect(() => {
    // Salt la validazione se non c'è FLUPSY selezionato o numero cesta
    if (!flupsyId || !basketNumber) {
      setError(null);
      setWarningOnly(false);
      onValidationChange(true);
      return;
    }
    
    // Se stiamo caricando, non fare nulla
    if (basketExistsQuery.isLoading) {
      return;
    }
    
    // Se c'è stato un errore nella query, mostra l'errore ma consenti comunque il salvataggio
    if (basketExistsQuery.isError) {
      setError("Errore durante la verifica dell'esistenza della cesta. Controllare manualmente.");
      setWarningOnly(true);
      onValidationChange(true);
      return;
    }
    
    // Se la query è andata a buon fine, verifica il risultato
    if (basketExistsQuery.data) {
      if (basketExistsQuery.data.exists) {
        // La cesta esiste, verifica lo stato
        const basketState = basketExistsQuery.data.state;
        setError(basketExistsQuery.data.message);
        
        // Se la cesta è "disponibile", possiamo mostrare un avviso ma consentire comunque il salvataggio
        // in tutti gli altri casi, blocchiamo il salvataggio
        if (basketState === "available") {
          setWarningOnly(true);
          onValidationChange(true);
        } else {
          setWarningOnly(false);
          onValidationChange(false);
        }
      } else {
        // La cesta non esiste, tutto ok
        setError(null);
        setWarningOnly(false);
        onValidationChange(true);
      }
    }
  }, [flupsyId, basketNumber, basketExistsQuery.data, basketExistsQuery.isLoading, basketExistsQuery.isError, onValidationChange]);
  
  if (!error) return null;
  
  return (
    <Alert 
      variant={warningOnly ? "warning" : "destructive"} 
      className="mt-2 mb-4"
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