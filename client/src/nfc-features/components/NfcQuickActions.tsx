import React from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  BarChart, 
  Package, 
  BookOpen, 
  Edit, 
  Scale, 
  RefreshCw,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { NfcTag } from '../utils/nfcSimulator';
import { toast } from '@/hooks/use-toast';

interface NfcQuickActionsProps {
  tag: NfcTag;
}

/**
 * Componente che mostra azioni rapide per interagire con un tag NFC scansionato
 */
const NfcQuickActions: React.FC<NfcQuickActionsProps> = ({ tag }) => {
  const [, navigate] = useLocation();
  const basketId = tag.basketId || tag.data?.basketId;

  // Query per ottenere i dettagli della cesta
  const { data: basket, isLoading, error } = useQuery({
    queryKey: ['/api/baskets', basketId],
    queryFn: async () => {
      if (!basketId) return null;
      const response = await fetch(`/api/baskets/${basketId}`);
      if (!response.ok) throw new Error('Errore nel recupero dei dati della cesta');
      return response.json();
    },
    enabled: !!basketId, // Esegui la query solo se abbiamo un basketId
    staleTime: 1000 * 60 * 5, // 5 minuti
  });

  // Verifica se il tag è associato a una cesta attiva
  const isLinkedToBasket = !!basketId && !!basket;

  // Gestione delle azioni
  const handleAction = (action: string) => {
    if (!basketId) {
      toast({
        title: "Azione non disponibile",
        description: "Questo tag NFC non è associato a nessuna cesta",
        variant: "destructive"
      });
      return;
    }

    switch (action) {
      case 'view':
        navigate(`/baskets/${basketId}`);
        break;
      case 'stats':
        navigate(`/flupsy-comparison?basketId=${basketId}`);
        break;
      case 'operations':
        navigate(`/operations?basketId=${basketId}`);
        break;
      case 'peso':
        navigate(`/operations?basketId=${basketId}&operation=peso`);
        break;
      case 'misurazione':
        navigate(`/operations?basketId=${basketId}&operation=misura`);
        break;
      case 'cycle':
        if (basket && basket.activeBasketId && basket.cycleId) {
          navigate(`/cycles/${basket.cycleId}`);
        } else {
          toast({
            title: "Ciclo non disponibile",
            description: "Questa cesta non è associata a nessun ciclo attivo",
            variant: "destructive"
          });
        }
        break;
      default:
        toast({
          title: "Azione non implementata",
          description: `L'azione '${action}' non è ancora disponibile`
        });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2">Caricamento informazioni cesta...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mt-2">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Errore</AlertTitle>
        <AlertDescription>
          Non è stato possibile recuperare le informazioni sulla cesta.
          {error instanceof Error ? ` ${error.message}` : ''}
        </AlertDescription>
      </Alert>
    );
  }

  if (!isLinkedToBasket) {
    return (
      <Alert variant="default" className="mt-2 bg-amber-50 border-amber-200 text-amber-800">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Tag non associato</AlertTitle>
        <AlertDescription>
          Questo tag NFC non è associato a nessuna cesta attiva nel sistema.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Informazioni sulla cesta */}
      {basket && (
        <div className="bg-blue-50 p-3 rounded-md border border-blue-100">
          <div className="flex items-center">
            <Check className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-sm font-medium">Tag collegato a cesta attiva</span>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>Flupsy: <span className="font-medium">{basket.flupsyName}</span></div>
            <div>Posizione: <span className="font-medium">{basket.position || 'N/D'}</span></div>
            <div>Animali: <span className="font-medium">{basket.animalCount?.toLocaleString('it-IT') || 'N/D'}</span></div>
            <div>Taglia: <span className="font-medium">{basket.sizeClass || 'N/D'}</span></div>
          </div>
        </div>
      )}

      {/* Azioni rapide */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center justify-start"
          onClick={() => handleAction('view')}
        >
          <Package className="h-4 w-4 mr-2 text-blue-600" />
          Dettagli Cesta
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="flex items-center justify-start"
          onClick={() => handleAction('operations')}
        >
          <FileText className="h-4 w-4 mr-2 text-green-600" />
          Operazioni
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="flex items-center justify-start"
          onClick={() => handleAction('peso')}
        >
          <Scale className="h-4 w-4 mr-2 text-orange-600" />
          Operazione Peso
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="flex items-center justify-start"
          onClick={() => handleAction('misurazione')}
        >
          <Edit className="h-4 w-4 mr-2 text-orange-600" />
          Misurazione
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="flex items-center justify-start"
          onClick={() => handleAction('stats')}
        >
          <BarChart className="h-4 w-4 mr-2 text-purple-600" />
          Statistiche
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="flex items-center justify-start"
          onClick={() => handleAction('cycle')}
        >
          <RefreshCw className="h-4 w-4 mr-2 text-blue-600" />
          Ciclo Produttivo
        </Button>
      </div>
    </div>
  );
};

export default NfcQuickActions;