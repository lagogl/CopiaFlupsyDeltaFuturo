import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
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
  
  // Fetch all baskets for validation
  const { data: baskets = [] } = useQuery<any[]>({
    queryKey: ['/api/baskets'],
  });
  
  // Fetch FLUPSY info for error messages
  const { data: flupsys = [] } = useQuery<any[]>({
    queryKey: ['/api/flupsys'],
  });
  
  useEffect(() => {
    // Skip validation if no FLUPSY selected or no basket number
    if (!flupsyId || !basketNumber) {
      setError(null);
      onValidationChange(true);
      return;
    }
    
    // Check if basket with same number exists in same FLUPSY
    const existingBasket = baskets.find(basket => 
      basket.flupsyId === flupsyId && 
      basket.physicalNumber === basketNumber
    );
    
    if (existingBasket) {
      const flupsyName = flupsys.find(f => f.id === flupsyId)?.name || `FLUPSY #${flupsyId}`;
      const errorMessage = `Esiste già una cesta con il numero ${basketNumber} in ${flupsyName}`;
      setError(errorMessage);
      onValidationChange(false);
    } else {
      setError(null);
      onValidationChange(true);
    }
  }, [flupsyId, basketNumber, baskets, flupsys, onValidationChange]);
  
  if (!error) return null;
  
  return (
    <Alert variant="destructive" className="mt-2 mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Errore</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}