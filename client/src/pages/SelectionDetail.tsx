import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { PageHeading } from "@/components/PageHeading";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import {
  ArrowLeft,
  FileText,
  Package,
  Info,
  Plus,
  X,
  FileDown,
  CheckCircle,
  AlertCircle,
  Clock,
  Pencil,
  Calculator,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn, formatDate, formatNumberWithCommas, getSizeColorClass } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { Selection, SelectionSourceBasket, SelectionDestinationBasket } from "@shared/schema";

export default function VagliaturaDetailPage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addSourceDialogOpen, setAddSourceDialogOpen] = useState(false);
  const [addDestinationDialogOpen, setAddDestinationDialogOpen] = useState(false);
  const [cancelConfirmDialogOpen, setCancelConfirmDialogOpen] = useState(false);
  const [completeConfirmDialogOpen, setCompleteConfirmDialogOpen] = useState(false);
  const [editDestinationDialogOpen, setEditDestinationDialogOpen] = useState(false);
  const [editingBasketId, setEditingBasketId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("origine");

  // Query per caricare i dati della selezione
  const { data: selection, isLoading: isLoadingSelection, refetch: refetchSelection } = useQuery({
    queryKey: [`/api/selections/${id}`],
    staleTime: 1000 * 30, // 30 secondi
  });

  // Query per caricare i cestelli di origine
  const { data: sourceBaskets, isLoading: isLoadingSourceBaskets, refetch: refetchSourceBaskets } = useQuery({
    queryKey: [`/api/selections/${id}/source-baskets`],
    staleTime: 1000 * 30, // 30 secondi
  });

  // Query per caricare i cestelli di destinazione
  const { data: destinationBaskets, isLoading: isLoadingDestinationBaskets, refetch: refetchDestinationBaskets } = useQuery({
    queryKey: [`/api/selections/${id}/destination-baskets`],
    staleTime: 1000 * 30, // 30 secondi
  });

  // Dati per il form di aggiunta cestello sorgente
  const [sourceBasketData, setSourceBasketData] = useState({
    basketId: "",
    cycleId: null,
    flupsyFilter: "",
  });

  // Dati per il form di aggiunta cestello destinazione
  const [destinationBasketData, setDestinationBasketData] = useState({
    basketId: "",
    animalCount: 0,
    deadCount: 0,
    sampleWeight: 100, // Impostiamo il valore predefinito a 100 grammi
    sampleCount: 0,
    totalWeightKg: 0,
    animalsPerKg: 0,
    positionId: "", // ID combinato per la posizione nel formato "flupsyId-row-position"
    positionFlupsyId: "",
    positionRow: "",
    positionNumber: "",
    saleDestination: false,
    saleDate: new Date(),
    saleClient: "",
  });
  
  // Stato per le ceste di destinazione in attesa di registrazione
  const [pendingDestinationBaskets, setPendingDestinationBaskets] = useState([]);
  
  // Stato per gestire la destinazione finale delle ceste pendenti (FLUPSY o vendita)
  const [basketDestinations, setBasketDestinations] = useState<Record<string, 'flupsy' | 'sold'>>({});

  // Query per caricare le ceste disponibili
  const { data: availableBaskets, isLoading: isLoadingAvailableBaskets } = useQuery({
    queryKey: ["/api/baskets/available", selection?.referenceSizeId],
    queryFn: async () => {
      // Includi il parametro referenceSizeId nella richiesta se disponibile
      const url = selection?.referenceSizeId 
        ? `/api/baskets/available?referenceSizeId=${selection.referenceSizeId}` 
        : '/api/baskets/available';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Errore nel caricamento delle ceste disponibili');
      }
      return response.json();
    },
    staleTime: 1000 * 60, // 1 minuto
    enabled: !!selection, // Esegui solo quando i dati della selezione sono caricati
  });

  // Query per caricare i flupsy disponibili
  const { data: flupsys, isLoading: isLoadingFlupsys } = useQuery({
    queryKey: ["/api/flupsys"],
    staleTime: 1000 * 60, // 1 minuto
  });

  // Funzione per ottenere il FLUPSY di origine della cesta selezionata
  function getSourceFlupsyId() {
    if (!destinationBasketData.basketId) return null;
    
    // Cerca la cesta selezionata tra le ceste disponibili
    const selectedBasket = availableBaskets?.find(
      basket => basket.basketId === parseInt(destinationBasketData.basketId)
    );
    
    return selectedBasket?.flupsyId || null;
  }
  
  // Query per caricare tutte le posizioni disponibili in tutti i FLUPSY (usa il nuovo endpoint)
  const { data: availablePositions, isLoading: isLoadingPositions } = useQuery({
    queryKey: [
      `/api/flupsy/available-positions`, 
      { originFlupsyId: getSourceFlupsyId() }
    ],
    queryFn: async ({ queryKey }) => {
      const [_, params] = queryKey;
      const originFlupsyId = (params as any).originFlupsyId;
      
      const url = originFlupsyId 
        ? `/api/flupsy/available-positions?originFlupsyId=${originFlupsyId}` 
        : '/api/flupsy/available-positions';
        
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Errore nel caricamento delle posizioni disponibili');
      }
      return response.json();
    },
  });

  // Calcola i totali della selezione, includendo sia i cestelli confermati che quelli pendenti
  const calculateTotals = () => {
    if (!sourceBaskets) return null;

    // Calcola il totale degli animali dalle ceste di origine
    const sourceTotals = {
      basketCount: sourceBaskets.length,
      totalAnimals: sourceBaskets.reduce(
        (sum: number, basket: SelectionSourceBasket) => sum + (basket.animalCount || 0),
        0
      ),
    };

    // Calcola il totale per le ceste di destinazione già confermate
    const confirmedDestinationTotals = {
      basketCount: destinationBaskets ? destinationBaskets.length : 0,
      totalAnimals: destinationBaskets ? destinationBaskets.reduce(
        (sum: number, basket: SelectionDestinationBasket) => sum + (basket.animalCount || 0),
        0
      ) : 0,
    };
    
    // Calcola il totale per le ceste di destinazione in attesa
    const pendingDestinationTotals = {
      basketCount: pendingDestinationBaskets.length,
      totalAnimals: pendingDestinationBaskets.reduce(
        (sum: number, basket: any) => sum + (basket.animalCount || 0),
        0
      ),
    };
    
    // Combina i totali confermati e pendenti
    const destinationTotals = {
      basketCount: confirmedDestinationTotals.basketCount + pendingDestinationTotals.basketCount,
      totalAnimals: confirmedDestinationTotals.totalAnimals + pendingDestinationTotals.totalAnimals,
    };

    const remainingAnimals = sourceTotals.totalAnimals - destinationTotals.totalAnimals;
    
    // Calcola il bilancio tra animali di origine e destinazione
    const animalBalance = {
      // Se gli animali di destinazione sono più di quelli di origine, c'è un surplus
      hasDiscrepancy: sourceTotals.totalAnimals !== destinationTotals.totalAnimals && destinationTotals.totalAnimals > 0,
      surplus: destinationTotals.totalAnimals > sourceTotals.totalAnimals,
      difference: Math.abs(sourceTotals.totalAnimals - destinationTotals.totalAnimals),
      percentage: sourceTotals.totalAnimals > 0 
        ? Math.abs((destinationTotals.totalAnimals - sourceTotals.totalAnimals) / sourceTotals.totalAnimals * 100).toFixed(1)
        : "0"
    };

    return {
      sourceTotals,
      destinationTotals,
      pendingDestinationTotals,
      confirmedDestinationTotals,
      remainingAnimals,
      animalBalance,
      percentageCompleted: sourceTotals.totalAnimals > 0
        ? ((destinationTotals.totalAnimals / sourceTotals.totalAnimals) * 100).toFixed(1)
        : "0",
    };
  };

  // Calcola i totali
  const totals = calculateTotals();

  // Gestisce l'aggiunta di un cestello sorgente
  const handleAddSourceBasket = async () => {
    if (!sourceBasketData.basketId) {
      toast({
        title: "Errore",
        description: "Seleziona un cestello valido",
        variant: "destructive",
      });
      return;
    }
    
    // Verifica se cycleId è presente
    if (!sourceBasketData.cycleId) {
      // Se non è presente, trova nuovamente la cesta selezionata
      const selectedBasket = availableBaskets?.find(b => b.basketId.toString() === sourceBasketData.basketId);
      
      if (!selectedBasket || !selectedBasket.cycle?.id) {
        toast({
          title: "Errore",
          description: "La cesta selezionata non ha un ciclo attivo",
          variant: "destructive",
        });
        return;
      }
      
      // Aggiorna il cycleId con quello trovato
      setSourceBasketData(prev => ({ 
        ...prev, 
        cycleId: selectedBasket.cycle.id 
      }));
    }

    setIsSubmitting(true);

    try {
      // Ottieni nuovamente il basket selezionato (per sicurezza)
      const selectedBasket = availableBaskets?.find(b => b.basketId.toString() === sourceBasketData.basketId);
      const cycleId = sourceBasketData.cycleId || selectedBasket?.cycle?.id;
      
      if (!cycleId) {
        throw new Error("Impossibile determinare il cycleId per la cesta selezionata");
      }
      
      // Nota: Il server si aspetta un array di cestelli di origine
      const response = await fetch(`/api/selections/${id}/source-baskets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          {
            basketId: parseInt(sourceBasketData.basketId),
            cycleId: cycleId,  // Usiamo il valore sicuramente non null
            animalCount: null, // Questi valori verranno determinati dal server
            totalWeight: null,
            animalsPerKg: null,
            sizeId: null,
            lotId: null
          }
        ]),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore nell'aggiunta del cestello sorgente");
      }

      await response.json();
      
      toast({
        title: "Cestello aggiunto",
        description: "Cestello sorgente aggiunto con successo",
      });
      
      setAddSourceDialogOpen(false);
      setSourceBasketData({ basketId: "", cycleId: null });
      refetchSourceBaskets();
    } catch (error) {
      console.error("Errore:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiunta del cestello",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Gestisce l'aggiunta di un cestello destinazione - NON registra subito sul database
  const handleAddDestinationBasket = async () => {
    if (!destinationBasketData.basketId) {
      toast({
        title: "Errore",
        description: "Seleziona un cestello valido",
        variant: "destructive",
      });
      return;
    }
    
    // Verifica che sia selezionata una posizione quando è richiesta
    if (!destinationBasketData.saleDestination && !destinationBasketData.positionId) {
      toast({
        title: "Errore",
        description: "Seleziona una posizione valida per il cestello",
        variant: "destructive",
      });
      return;
    }
    
    // Verifica che siano stati inseriti dati minimi validi per il conteggio
    if (!destinationBasketData.animalCount || destinationBasketData.animalCount <= 0) {
      toast({
        title: "Errore",
        description: "Inserisci un numero valido di animali nel cestello",
        variant: "destructive",
      });
      return;
    }
    
    // Verifica che il peso del campione sia valido
    if (!destinationBasketData.sampleWeight || destinationBasketData.sampleWeight <= 0) {
      toast({
        title: "Errore",
        description: "Inserisci un peso del campione valido (maggiore di zero)",
        variant: "destructive",
      });
      return;
    }

    if (destinationBasketData.saleDestination && !destinationBasketData.saleClient) {
      toast({
        title: "Errore",
        description: "Inserisci il cliente per la vendita",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepariamo i parametri corretti per la richiesta
      const positionComponents = destinationBasketData.positionId ? 
                                 destinationBasketData.positionId.split('-') : null;
      
      const positionFlupsyId = positionComponents && positionComponents.length > 0 ? 
                             parseInt(positionComponents[0]) : null;
      
      const positionRow = positionComponents && positionComponents.length > 1 ? 
                        positionComponents[1] : null;
      
      const positionNumber = positionComponents && positionComponents.length > 2 ? 
                           parseInt(positionComponents[2]) : null;
                           
      // Crea la stringa di posizione nel formato corretto per il backend (es: "DX2")
      // Non includiamo il flupsyId nella posizione, solo row + number
      const formattedPosition = positionRow && positionNumber !== null ? 
                           `${positionRow}${positionNumber}` : null;
      
      // Trova la cesta tra quelle disponibili
      const selectedBasket = availableBaskets?.find(
        basket => basket.basketId === parseInt(destinationBasketData.basketId)
      );
      
      if (!selectedBasket) {
        throw new Error("Cestello non trovato");
      }

      // Crea l'oggetto cestello da aggiungere all'array dei pending
      const newBasket = {
        basketId: parseInt(destinationBasketData.basketId),
        physicalNumber: selectedBasket.physicalNumber,
        // Anche per i cestelli venduti è necessario impostare un FLUPSY, 
        // altrimenti viola vincolo not-null nel database
        // Se è vendita, useremo il FLUPSY predefinito 1 ma non sarà visibile
        flupsyId: destinationBasketData.saleDestination ? 1 : positionFlupsyId,
        position: destinationBasketData.saleDestination ? null : formattedPosition,
        destinationType: destinationBasketData.saleDestination ? 'sold' : 'placed',
        animalCount: destinationBasketData.animalCount || null,
        deadCount: destinationBasketData.deadCount || null,
        sampleWeight: destinationBasketData.sampleWeight || null,
        sampleCount: destinationBasketData.sampleCount || null,
        totalWeight: destinationBasketData.totalWeightKg ? destinationBasketData.totalWeightKg * 1000 : null, // Converti in grammi
        animalsPerKg: destinationBasketData.animalsPerKg || null,
        saleDate: destinationBasketData.saleDate && destinationBasketData.saleDestination
          ? destinationBasketData.saleDate.toISOString().split('T')[0]
          : null,
        saleClient: destinationBasketData.saleClient && destinationBasketData.saleDestination
          ? destinationBasketData.saleClient
          : null,
        flupsy: positionFlupsyId ? flupsys?.find(f => f.id === positionFlupsyId) : null,
        isPending: true, // Flag per indicare che è in attesa di registrazione
        createdAt: new Date().toISOString()
      };

      // Aggiungi il nuovo cestello all'array dei cestelli in attesa
      setPendingDestinationBaskets(prev => [...prev, newBasket]);
      
      // MODIFICA: Non eseguiamo più chiamata API, ma aggiorniamo solo lo stato locale
      toast({
        title: "Cestello aggiunto in attesa",
        description: "Cestello destinazione aggiunto in attesa di completamento vagliatura",
      });
      
      setAddDestinationDialogOpen(false);
      setDestinationBasketData({
        basketId: "",
        animalCount: 0,
        deadCount: 0,
        sampleWeight: 100, // Impostiamo a 100gr come valore predefinito
        sampleCount: 0,
        totalWeightKg: 0,
        animalsPerKg: 0,
        positionId: "", // Aggiungiamo il nuovo campo combinato
        positionFlupsyId: "",
        positionRow: "",
        positionNumber: "",
        saleDestination: false,
        saleDate: new Date(),
        saleClient: "",
      });
      
    } catch (error) {
      console.error("Errore:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'aggiunta del cestello",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rimuove un cestello sorgente
  const handleRemoveSourceBasket = async (sourceBasketId: number) => {
    try {
      const response = await fetch(`/api/selections/${id}/source-baskets/${sourceBasketId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Errore nella rimozione del cestello sorgente");
      }

      toast({
        title: "Cestello rimosso",
        description: "Cestello sorgente rimosso con successo",
      });
      
      refetchSourceBaskets();
    } catch (error) {
      console.error("Errore:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la rimozione del cestello",
        variant: "destructive",
      });
    }
  };

  // Rimuove un cestello destinazione
  const handleRemoveDestinationBasket = async (destinationBasketId: number) => {
    try {
      const response = await fetch(`/api/selections/${id}/destination-baskets/${destinationBasketId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Errore nella rimozione del cestello destinazione");
      }

      toast({
        title: "Cestello rimosso",
        description: "Cestello destinazione rimosso con successo",
      });
      
      refetchDestinationBaskets();
    } catch (error) {
      console.error("Errore:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante la rimozione del cestello",
        variant: "destructive",
      });
    }
  };

  // Annulla la selezione
  const handleCancelSelection = async () => {
    try {
      const response = await fetch(`/api/selections/${id}/cancel`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Errore nell'annullamento della selezione");
      }

      toast({
        title: "Selezione annullata",
        description: "La selezione è stata annullata con successo",
      });
      
      setCancelConfirmDialogOpen(false);
      refetchSelection();
    } catch (error) {
      console.error("Errore:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante l'annullamento della selezione",
        variant: "destructive",
      });
    }
  };

  // Rimuove un cestello dalla lista di quelli in attesa
  const handleRemovePendingDestinationBasket = (basketId: number) => {
    setPendingDestinationBaskets(prev => prev.filter(basket => basket.basketId !== basketId));
    
    // Rimuovi anche la destinazione se presente
    if (basketDestinations[basketId]) {
      const newDestinations = {...basketDestinations};
      delete newDestinations[basketId];
      setBasketDestinations(newDestinations);
    }
    
    toast({
      title: "Cestello rimosso",
      description: "Cestello destinazione in attesa rimosso con successo",
    });
  };

  // Gestisce l'apertura del dialogo di modifica di un cestello in attesa
  const handleEditPendingBasket = (basketId: number) => {
    // Trova il cestello da modificare
    const basketToEdit = pendingDestinationBaskets.find(basket => basket.basketId === basketId);
    
    if (!basketToEdit) {
      toast({
        title: "Errore",
        description: "Cestello non trovato",
        variant: "destructive",
      });
      return;
    }
    
    // Imposta i dati del cestello nel form
    setDestinationBasketData({
      basketId: basketToEdit.basketId.toString(),
      animalCount: basketToEdit.animalCount || 0,
      deadCount: basketToEdit.deadCount || 0,
      sampleWeight: basketToEdit.sampleWeight || 100,
      sampleCount: basketToEdit.sampleCount || 0,
      totalWeightKg: basketToEdit.totalWeight ? basketToEdit.totalWeight / 1000 : 0, // Converti da grammi a kg
      animalsPerKg: basketToEdit.animalsPerKg || 0,
      positionId: basketToEdit.flupsyId && basketToEdit.position 
        ? `${basketToEdit.flupsyId}-${basketToEdit.position.substring(0, 2)}-${basketToEdit.position.substring(2)}` 
        : "",
      positionFlupsyId: basketToEdit.flupsyId ? basketToEdit.flupsyId.toString() : "",
      positionRow: basketToEdit.position ? basketToEdit.position.substring(0, 2) : "",
      positionNumber: basketToEdit.position ? basketToEdit.position.substring(2) : "",
      saleDestination: basketToEdit.destinationType === 'sold',
      saleDate: basketToEdit.saleDate ? new Date(basketToEdit.saleDate) : new Date(),
      saleClient: basketToEdit.saleClient || "",
    });
    
    // Imposta l'ID del cestello in modifica e apri il dialogo
    setEditingBasketId(basketId);
    setEditDestinationDialogOpen(true);
  };
  
  // Salva le modifiche a un cestello in attesa
  const handleSaveEditedPendingBasket = () => {
    if (!editingBasketId) return;
    
    // Verifica che siano stati inseriti dati minimi validi per il conteggio
    if (!destinationBasketData.animalCount || destinationBasketData.animalCount <= 0) {
      toast({
        title: "Errore",
        description: "Inserisci un numero valido di animali nel cestello",
        variant: "destructive",
      });
      return;
    }
    
    // Verifica che il peso del campione sia valido
    if (!destinationBasketData.sampleWeight || destinationBasketData.sampleWeight <= 0) {
      toast({
        title: "Errore",
        description: "Inserisci un peso del campione valido (maggiore di zero)",
        variant: "destructive",
      });
      return;
    }
    
    if (destinationBasketData.saleDestination && !destinationBasketData.saleClient) {
      toast({
        title: "Errore",
        description: "Inserisci il cliente per la vendita",
        variant: "destructive",
      });
      return;
    }

    // Trova il cestello originale per preservare alcune informazioni
    const originalBasket = pendingDestinationBaskets.find(basket => basket.basketId === editingBasketId);
    if (!originalBasket) {
      toast({
        title: "Errore",
        description: "Cestello non trovato",
        variant: "destructive",
      });
      return;
    }

    // Prepariamo i parametri corretti per la modifica
    const positionComponents = destinationBasketData.positionId ? 
                             destinationBasketData.positionId.split('-') : null;
    
    const positionFlupsyId = positionComponents && positionComponents.length > 0 ? 
                           parseInt(positionComponents[0]) : null;
    
    const positionRow = positionComponents && positionComponents.length > 1 ? 
                      positionComponents[1] : null;
    
    const positionNumber = positionComponents && positionComponents.length > 2 ? 
                         positionComponents[2] : null;
                         
    // Crea la stringa di posizione nel formato corretto per il backend (es: "DX2")
    const formattedPosition = positionRow && positionNumber ? 
                         `${positionRow}${positionNumber}` : null;
    
    // Aggiorna il cestello nell'array dei pendenti
    setPendingDestinationBaskets(prev => 
      prev.map(basket => {
        if (basket.basketId === editingBasketId) {
          return {
            // Mantieni alcune proprietà originali
            ...basket,
            // Aggiorna con i nuovi valori
            animalCount: destinationBasketData.animalCount || null,
            deadCount: destinationBasketData.deadCount || null,
            sampleWeight: destinationBasketData.sampleWeight || null,
            sampleCount: destinationBasketData.sampleCount || null,
            animalsPerKg: destinationBasketData.animalsPerKg || null,
            totalWeight: destinationBasketData.totalWeightKg ? destinationBasketData.totalWeightKg * 1000 : null, // Converti in grammi
            destinationType: destinationBasketData.saleDestination ? 'sold' : 'placed',
            position: destinationBasketData.saleDestination ? null : formattedPosition,
            flupsyId: destinationBasketData.saleDestination ? 1 : positionFlupsyId, // Imposta flupsyId a 1 per le ceste vendute (per mantenere il vincolo di non-null)
            saleClient: destinationBasketData.saleDestination ? destinationBasketData.saleClient : null,
            saleDate: destinationBasketData.saleDestination ? 
                     (destinationBasketData.saleDate instanceof Date ? 
                      destinationBasketData.saleDate.toISOString().split('T')[0] : 
                      new Date().toISOString().split('T')[0]) : null,
          };
        }
        return basket;
      })
    );
    
    // Aggiorna anche lo stato della destinazione (flupsy o sold)
    setBasketDestinations(prev => ({
      ...prev,
      [editingBasketId]: destinationBasketData.saleDestination ? 'sold' : 'flupsy'
    }));
    
    // Chiudi il dialog e resetta lo stato
    setEditDestinationDialogOpen(false);
    setEditingBasketId(null);
    
    toast({
      title: "Cestello aggiornato",
      description: "Informazioni del cestello aggiornate con successo",
    });
  };
  
  // Cambia la destinazione di una cesta da "placed" a "sold" o viceversa
  const toggleBasketDestination = (basketId: number) => {
    setBasketDestinations(prev => {
      const currentValue = prev[basketId] || 'flupsy';
      return {
        ...prev,
        [basketId]: currentValue === 'flupsy' ? 'sold' : 'flupsy'
      };
    });
    
    // Aggiorna anche il cestello nel pendingDestinationBaskets
    setPendingDestinationBaskets(prev => 
      prev.map(basket => {
        if (basket.basketId === basketId) {
          const newDestType = (basketDestinations[basketId] || 'flupsy') === 'flupsy' ? 'sold' : 'placed';
          
          // Se la destinazione è cambiata a vendita, richiedi il cliente
          if (newDestType === 'sold' && !basket.saleClient) {
            // Apri un dialogo modale per richiedere il cliente di vendita
            // Per ora usiamo un prompt, ma potremmo implementare un dialogo più elegante
            const clientName = prompt('Inserisci il nome del cliente per la vendita');
            
            // Se la destinazione è cambiata a vendita, impostiamo il FLUPSY predefinito ma position a null
            // Se torna a normale, dobbiamo impostare position a un valore valido
            return {
              ...basket,
              destinationType: newDestType,
              position: newDestType === 'sold' ? null : (basket.position || 'DX1'), // Usa la posizione esistente o un default
              // Un FLUPSY ID deve sempre essere presente per motivi di vincolo database
              flupsyId: newDestType === 'sold' ? 1 : (basket.flupsyId || 1),
              saleClient: clientName || 'Cliente non specificato',
              saleDate: new Date().toISOString().split('T')[0] // Data di oggi
            };
          }
          
          // Se la destinazione cambia da vendita a FLUPSY o non è cambiata
          return {
            ...basket,
            destinationType: newDestType,
            position: newDestType === 'sold' ? null : (basket.position || 'DX1'), // Usa la posizione esistente o un default
            // Un FLUPSY ID deve sempre essere presente per motivi di vincolo database
            flupsyId: newDestType === 'sold' ? 1 : (basket.flupsyId || 1)
          };
        }
        return basket;
      })
    );
  };

  // Completa la selezione registrando tutte le operazioni in attesa
  const handleCompleteSelection = async () => {
    setIsSubmitting(true);
    
    try {
      // Verifica che ci siano cestelli in attesa da registrare
      if (pendingDestinationBaskets.length === 0) {
        // Se non ci sono cestelli in attesa, procedi con il completamento standard
        const response = await fetch(`/api/selections/${id}/complete`, {
          method: "POST",
        });

        if (!response.ok) {
          throw new Error("Errore nel completamento della selezione");
        }
      } else {
        // FASE 1: Registra tutti i cestelli di destinazione in attesa
        const registeredBaskets = [];
        
        for (const pendingBasket of pendingDestinationBaskets) {
          // Rimuovi proprietà aggiunte localmente che non servono per l'API
          const { flupsy, isPending, createdAt, ...basketToRegister } = pendingBasket;
          
          const response = await fetch(`/api/selections/${id}/destination-baskets`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify([basketToRegister]),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Errore nella registrazione dei cestelli destinazione");
          }
          
          const result = await response.json();
          registeredBaskets.push(result);
        }
        
        // FASE 2: Completa la selezione
        const completeResponse = await fetch(`/api/selections/${id}/complete`, {
          method: "POST",
        });

        if (!completeResponse.ok) {
          throw new Error("Errore nel completamento della selezione");
        }
      }

      // Svuota l'array dei cestelli in attesa
      setPendingDestinationBaskets([]);
      
      toast({
        title: "Vagliatura completata",
        description: "La vagliatura è stata completata con successo e tutte le operazioni sono state registrate",
      });
      
      setCompleteConfirmDialogOpen(false);
      refetchSelection();
      refetchDestinationBaskets();
    } catch (error) {
      console.error("Errore:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il completamento della vagliatura",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calcola automaticamente animalsPerKg dal campione
  useEffect(() => {
    if (
      destinationBasketData.sampleWeight > 0 &&
      destinationBasketData.sampleCount > 0
    ) {
      // Calcola animali per kg dal campione
      const animalsPerKg = Math.round(
        (destinationBasketData.sampleCount / destinationBasketData.sampleWeight) * 1000
      );
      setDestinationBasketData({
        ...destinationBasketData,
        animalsPerKg,
      });
    }
  }, [destinationBasketData.sampleWeight, destinationBasketData.sampleCount]);

  // Calcola automaticamente animalCount dal peso totale e animalsPerKg
  useEffect(() => {
    if (
      destinationBasketData.totalWeightKg > 0 &&
      destinationBasketData.animalsPerKg > 0
    ) {
      // Calcola numero totale di animali
      const animalCount = Math.round(
        destinationBasketData.totalWeightKg * destinationBasketData.animalsPerKg
      );
      setDestinationBasketData({
        ...destinationBasketData,
        animalCount,
      });
    }
  }, [destinationBasketData.totalWeightKg, destinationBasketData.animalsPerKg]);

  // Ottiene lo stato della vagliatura
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="success" className="ml-2">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completata
          </Badge>
        );
      case "draft":
        return (
          <Badge variant="secondary" className="ml-2">
            <Clock className="h-3 w-3 mr-1" />
            Bozza
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="destructive" className="ml-2">
            <AlertCircle className="h-3 w-3 mr-1" />
            Annullata
          </Badge>
        );
      default:
        return null;
    }
  };

  // Mostra il loader se i dati sono in caricamento
  if (isLoadingSelection) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  // Se la vagliatura non esiste, mostra un messaggio di errore
  if (!selection) {
    return (
      <EmptyState
        icon={<AlertCircle className="h-12 w-12 text-destructive" />}
        title="Vagliatura non trovata"
        description="La vagliatura richiesta non è stata trovata nel database"
        action={
          <Button onClick={() => navigate("/selection")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna all'elenco
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/" },
              { label: "Vagliatura", href: "/selection" },
              { label: `Vagliatura #${selection.selectionNumber}`, href: `/selection/${id}` },
            ]}
          />
          <div className="flex items-center">
            <PageHeading
              title={`Vagliatura #${selection.selectionNumber}`}
              description={`Creata il ${formatDate(new Date(selection.date))}`}
              icon={<FileText className="h-6 w-6" />}
              className="mt-2"
            />
            {getStatusBadge(selection.status)}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {selection.status === "draft" && (
            <>
              <Button 
                variant="outline" 
                onClick={() => setAddSourceDialogOpen(true)}
                disabled={selection.status !== "draft"}
              >
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Cesta Origine
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setAddDestinationDialogOpen(true)}
                disabled={selection.status !== "draft" || !sourceBaskets?.length}
              >
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Cesta Destinazione
              </Button>
              
              <Button
                variant="destructive"
                onClick={() => setCancelConfirmDialogOpen(true)}
                disabled={selection.status !== "draft"}
              >
                <X className="h-4 w-4 mr-2" />
                Annulla Vagliatura
              </Button>
              
              <Button
                onClick={() => setCompleteConfirmDialogOpen(true)}
                disabled={
                  selection.status !== "draft" || 
                  !sourceBaskets?.length || 
                  (!destinationBaskets?.length && !pendingDestinationBaskets?.length) ||
                  // Se ci sono cestelli in attesa, ignoriamo il controllo sugli animali rimanenti
                  (pendingDestinationBaskets.length === 0 && totals && totals.remainingAnimals > 0)
                }
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {pendingDestinationBaskets.length > 0 ? 'Conferma Destinazioni e Completa' : 'Completa Vagliatura'}
              </Button>
            </>
          )}
          
          <Button variant="outline" onClick={() => navigate("/selection")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna all'elenco
          </Button>
        </div>
      </div>

      {/* Informazioni sulla vagliatura */}
      <Card>
        <CardHeader>
          <CardTitle>Dettagli Vagliatura</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Scopo
              </h3>
              <p className="font-medium">
                {selection.purpose === "vendita"
                  ? "Vendita"
                  : selection.purpose === "vagliatura"
                  ? "Vagliatura"
                  : "Altro"}
              </p>
            </div>
            
            {selection.purpose === "vagliatura" && selection.screeningType && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Tipo Vaglio
                </h3>
                <p className="font-medium">
                  {selection.screeningType === "sopra_vaglio"
                    ? "Sopra Vaglio"
                    : "Sotto Vaglio"}
                </p>
              </div>
            )}
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                Data
              </h3>
              <p className="font-medium">{formatDate(new Date(selection.date))}</p>
            </div>
            
            {selection.notes && (
              <div className="md:col-span-3">
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Note
                </h3>
                <p className="text-sm">{selection.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Riepilogo dei totali */}
      {totals && (
        <Card className={selection.status === "completed" ? "border-green-500" : (selection.status === "cancelled" ? "border-red-500" : "")}>
          <CardHeader>
            <CardTitle>Riepilogo Operazione</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Ceste Origine
                </h3>
                <p className="text-xl font-bold">{totals.sourceTotals.basketCount}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Animali Totali
                </h3>
                <p className="text-xl font-bold">
                  {formatNumberWithCommas(totals.sourceTotals.totalAnimals)}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Ceste Destinate
                </h3>
                <p className="text-xl font-bold">{totals.destinationTotals.basketCount}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Animali in Destinazione
                </h3>
                <p className="text-xl font-bold">
                  {formatNumberWithCommas(totals.destinationTotals.totalAnimals)}
                </p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Animali Rimanenti
                </h3>
                <p className={`text-xl font-bold ${
                  totals.remainingAnimals > 0 
                    ? "text-red-600" // Deficit (negativo) - rosso
                    : totals.remainingAnimals < 0 
                      ? "text-green-600" // Surplus (positivo) - verde  
                      : "" // Zero - colore normale
                }`}>
                  {formatNumberWithCommas(totals.remainingAnimals)}
                </p>
              </div>
              
              <div className="md:col-span-4">
                <div className="bg-muted p-3 rounded-md">
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-primary mr-2 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium mb-1">
                        Stato attuale dell'operazione
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {selection.status === "completed" 
                          ? "Questa vagliatura è stata completata con successo."
                          : selection.status === "cancelled"
                          ? "Questa vagliatura è stata annullata."
                          : totals.remainingAnimals > 0
                          ? `Ci sono ancora ${formatNumberWithCommas(totals.remainingAnimals)} animali da distribuire nelle ceste di destinazione.`
                          : totals.remainingAnimals === 0 && totals.destinationTotals.basketCount > 0
                          ? "Tutti gli animali sono stati distribuiti nelle ceste di destinazione. La vagliatura può essere completata."
                          : totals.sourceTotals.basketCount === 0
                          ? "Non sono state ancora aggiunte ceste di origine."
                          : "Aggiungi ceste di destinazione per completare la vagliatura."}
                      </p>
                      
                      {/* Avviso bilancio animali discrepante */}
                      {totals.animalBalance?.hasDiscrepancy && (
                        <div className={`mt-2 p-2 rounded ${totals.animalBalance.surplus ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                          <div className="flex items-start">
                            <AlertCircle className="h-4 w-4 mr-2 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium">
                                {totals.animalBalance.surplus 
                                  ? `Eccesso: ${formatNumberWithCommas(totals.animalBalance.difference)} animali in più nelle destinazioni` 
                                  : `Deficit: ${formatNumberWithCommas(totals.animalBalance.difference)} animali in meno nelle destinazioni`}
                              </p>
                              <p className="text-xs">
                                {totals.animalBalance.surplus
                                  ? `Le ceste di destinazione contengono il ${totals.animalBalance.percentage}% di animali in più rispetto alle ceste di origine.`
                                  : `Le ceste di destinazione contengono il ${totals.animalBalance.percentage}% di animali in meno rispetto alle ceste di origine.`}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {selection.status === "draft" && totals.sourceTotals.totalAnimals > 0 && totals.destinationTotals.totalAnimals > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium">
                            Progresso: {totals.percentageCompleted}% completato
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs per gestire le ceste di origine e destinazione */}
      <Tabs
        defaultValue="origine"
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="origine">Ceste Origine</TabsTrigger>
          <TabsTrigger value="destinazione">Ceste Destinazione</TabsTrigger>
        </TabsList>
        
        <TabsContent value="origine" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ceste Origine</CardTitle>
              <CardDescription>
                Elenco delle ceste origine selezionate per l'operazione
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSourceBaskets ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              ) : sourceBaskets?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cesta</TableHead>
                      <TableHead>FLUPSY</TableHead>
                      <TableHead>Taglia</TableHead>
                      <TableHead className="text-right">Animali</TableHead>
                      <TableHead>Animali/Kg</TableHead>
                      {selection.status === "draft" && <TableHead></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sourceBaskets.map((sourceBasket: SelectionSourceBasket) => (
                      <TableRow key={sourceBasket.id}>
                        <TableCell className="font-medium">
                          #{sourceBasket.physicalNumber || (sourceBasket.basket?.physicalNumber || "N/A")}
                        </TableCell>
                        <TableCell>
                          {sourceBasket.flupsy?.name || (sourceBasket.basket?.flupsy?.name || "N/A")}
                        </TableCell>
                        <TableCell>
                          <Badge className={`font-mono ${sourceBasket.size?.code ? getSizeColorClass(sourceBasket.size.code) : ''}`}>
                            {sourceBasket.size?.code || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatNumberWithCommas(sourceBasket.animalCount || 0)}
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatNumberWithCommas(sourceBasket.animalsPerKg || 0)}
                        </TableCell>
                        {selection.status === "draft" && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveSourceBasket(sourceBasket.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  icon={<Package className="h-12 w-12 text-muted-foreground" />}
                  title="Nessuna cesta origine"
                  description="Non sono state ancora aggiunte ceste di origine a questa vagliatura"
                  action={
                    selection.status === "draft" ? (
                      <Button
                        onClick={() => setAddSourceDialogOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Aggiungi Cesta
                      </Button>
                    ) : null
                  }
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="destinazione" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ceste Destinazione</CardTitle>
              <CardDescription>
                Elenco delle ceste destinazione create durante l'operazione
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingDestinationBaskets ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              ) : destinationBaskets?.length || pendingDestinationBaskets?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cesta</TableHead>
                      <TableHead>Destinazione</TableHead>
                      <TableHead>Taglia</TableHead>
                      <TableHead className="text-right">Animali</TableHead>
                      <TableHead>Animali/Kg</TableHead>
                      <TableHead>Stato</TableHead>
                      {selection.status === "draft" && <TableHead></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Prima mostra i cestelli destinazione confermati */}
                    {destinationBaskets && destinationBaskets.map((destBasket: SelectionDestinationBasket) => (
                      <TableRow key={`confirmed-${destBasket.id}`}>
                        <TableCell className="font-medium">
                          #{destBasket.basket && destBasket.basket.physicalNumber}
                        </TableCell>
                        <TableCell>
                          {destBasket.saleDestination ? (
                            <Badge variant="destructive">Venduta</Badge>
                          ) : (
                            destBasket.positionFlupsyId ? (
                              <span>
                                {flupsys?.find(f => f.id === destBasket.positionFlupsyId)?.name || "Flupsy"} {" "}
                                {destBasket.positionRow} {destBasket.positionNumber}
                              </span>
                            ) : "N/A"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`font-mono ${destBasket.size?.code ? getSizeColorClass(destBasket.size.code) : ''}`}>
                            {destBasket.size?.code || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatNumberWithCommas(destBasket.animalCount || 0)}
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatNumberWithCommas(destBasket.animalsPerKg || 0)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Confermata
                          </Badge>
                        </TableCell>
                        {selection.status === "draft" && (
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveDestinationBasket(destBasket.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                    
                    {/* Poi mostra i cestelli in attesa */}
                    {pendingDestinationBaskets.map((pendingBasket) => (
                      <TableRow key={`pending-${pendingBasket.basketId}`} className="bg-amber-50">
                        <TableCell className="font-medium">
                          #{pendingBasket.physicalNumber}
                        </TableCell>
                        <TableCell>
                          {pendingBasket.destinationType === 'sold' ? (
                            <Badge variant="destructive">Vendita: {pendingBasket.saleClient || "N/A"}</Badge>
                          ) : (
                            pendingBasket.flupsyId ? (
                              <span>
                                {flupsys?.find(f => f.id === pendingBasket.flupsyId)?.name || "Flupsy"} {" "}
                                {pendingBasket.position && pendingBasket.position.substring(0, 2)} {pendingBasket.position && pendingBasket.position.substring(2)}
                              </span>
                            ) : "N/A"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`font-mono`}>
                            In Definizione
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatNumberWithCommas(pendingBasket.animalCount || 0)}
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatNumberWithCommas(pendingBasket.animalsPerKg || 0)}
                        </TableCell>
                        <TableCell>
                          {/* Manopola per scegliere la destinazione finale */}
                          <div className="flex items-center space-x-2">
                            <div 
                              className={`relative w-14 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors
                                ${pendingBasket.destinationType === 'sold' ? 'bg-red-200' : 'bg-green-200'}`}
                              onClick={() => toggleBasketDestination(pendingBasket.basketId)}
                            >
                              <div 
                                className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform
                                  ${pendingBasket.destinationType === 'sold' ? 'translate-x-7' : 'translate-x-0'}`}
                              />
                              <span className={`absolute text-[10px] font-bold
                                ${pendingBasket.destinationType === 'sold' 
                                  ? 'right-1.5 text-red-700' 
                                  : 'left-1.5 text-green-700'}`}>
                                {pendingBasket.destinationType === 'sold' ? 'VENDI' : 'FLUPSY'}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        {selection.status === "draft" && (
                          <TableCell>
                            <div className="flex space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditPendingBasket(pendingBasket.basketId)}
                                title="Modifica cestello"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemovePendingDestinationBasket(pendingBasket.basketId)}
                                title="Rimuovi cestello"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  icon={<Package className="h-12 w-12 text-muted-foreground" />}
                  title="Nessuna cesta destinazione"
                  description={
                    sourceBaskets?.length ? 
                    "Non sono state ancora create ceste di destinazione" :
                    "Aggiungi prima ceste di origine per poter creare ceste di destinazione"
                  }
                  action={
                    selection.status === "draft" && sourceBaskets?.length ? (
                      <Button
                        onClick={() => setAddDestinationDialogOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Aggiungi Cesta
                      </Button>
                    ) : null
                  }
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog per aggiungere cesta origine */}
      <Dialog
        open={addSourceDialogOpen}
        onOpenChange={setAddSourceDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aggiungi Cesta Origine</DialogTitle>
            <DialogDescription>
              Seleziona una cesta attiva da utilizzare come origine
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Filtro per FLUPSY */}
            <div className="space-y-2">
              <Label htmlFor="flupsyFilter" className="font-bold">Filtra per FLUPSY</Label>
              <Select
                value={sourceBasketData.flupsyFilter || "all"}
                onValueChange={(value) => {
                  console.log("Filtro FLUPSY selezionato:", value);
                  setSourceBasketData({ 
                    ...sourceBasketData, 
                    basketId: "", // Reset della selezione cestello quando cambia il filtro
                    cycleId: null,
                    flupsyFilter: value === "all" ? "" : value 
                  });
                }}
              >
                <SelectTrigger id="flupsyFilter" className="border-2 border-primary">
                  <SelectValue placeholder="Seleziona un FLUPSY" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i FLUPSY</SelectItem>
                  <SelectGroup>
                    <SelectLabel>FLUPSY disponibili</SelectLabel>
                    {/* Crea un elenco unico di FLUPSY */}
                    {availableBaskets
                      ?.map(b => ({ id: b.flupsyId, name: b.flupsyName }))
                      .filter((flupsy, index, self) => 
                        flupsy.id && flupsy.name && self.findIndex(f => f.id === flupsy.id) === index)
                      .map(flupsy => (
                        <SelectItem key={flupsy.id} value={flupsy.id?.toString() || ""}>
                          {flupsy.name}
                        </SelectItem>
                      ))
                    }
                  </SelectGroup>
                </SelectContent>
              </Select>
              
              {sourceBasketData.flupsyFilter && (
                <div className="mt-1 text-sm text-blue-600">
                  Filtro attivo: {
                    availableBaskets
                      ?.find(b => b.flupsyId?.toString() === sourceBasketData.flupsyFilter)
                      ?.flupsyName || "FLUPSY selezionato"
                  }
                </div>
              )}
            </div>

            <div className="space-y-2 mt-4">
              <Label htmlFor="basketId">Cesta da aggiungere</Label>
              <Select
                value={sourceBasketData.basketId}
                onValueChange={(value) => {
                  // Trova la cesta selezionata per ottenere il suo cycleId
                  const selectedBasket = availableBaskets?.find(b => b.basketId.toString() === value);
                  setSourceBasketData({ 
                    ...sourceBasketData, 
                    basketId: value,
                    cycleId: selectedBasket?.cycle?.id || null
                  });
                }}
              >
                <SelectTrigger id="basketId">
                  <SelectValue placeholder="Seleziona una cesta" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingAvailableBaskets ? (
                    <div className="flex justify-center py-2">
                      <Spinner size="sm" />
                    </div>
                  ) : availableBaskets
                      ?.filter(b => b.state === "active" && b.cycleId)
                      ?.filter(b => !sourceBasketData.flupsyFilter || b.flupsyId?.toString() === sourceBasketData.flupsyFilter)
                      ?.length ? (
                    availableBaskets
                      ?.filter(b => !sourceBasketData.flupsyFilter || b.flupsyId?.toString() === sourceBasketData.flupsyFilter)
                      .filter(b => b.state === "active" && b.cycleId)
                      // Filtra le ceste che sono già state aggiunte come origine
                      .filter(basket => {
                        const alreadyAdded = sourceBaskets?.some(
                          sourceBasket => sourceBasket.basketId === basket.basketId
                        );
                        return !alreadyAdded;
                      })
                      .map(basket => {
                        // Controlla se questa taglia corrisponde alla taglia di riferimento della selezione
                        const isReferenceSize = selection?.referenceSizeId && basket.size?.id === selection.referenceSizeId;
                        const sizeCode = basket.size?.code || basket.size?.sizeCode || "N/A";
                        
                        return (
                          <SelectItem 
                            key={basket.basketId} 
                            value={basket.basketId.toString()}
                            className={isReferenceSize ? "bg-green-50 dark:bg-green-900" : ""}
                          >
                            <div className="grid grid-cols-12 w-full items-center gap-1">
                              {/* Colonna 1-3: Numero cestello */}
                              <div className="col-span-3 font-semibold">
                                Cesta #{basket.physicalNumber}
                              </div>
                              
                              {/* Colonna 4-5: Taglia */}
                              <div className="col-span-2">
                                <span 
                                  className={`px-2 py-0.5 rounded text-xs font-medium inline-block ${
                                    isReferenceSize 
                                      ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100 font-bold border border-green-500" 
                                      : basket.size?.code ? getSizeColorClass(basket.size.code) : ""
                                  }`}
                                >
                                  {isReferenceSize ? "★ " : ""}{basket.size?.code || "N/A"}{isReferenceSize ? " ★" : ""}
                                </span>
                              </div>
                              
                              {/* Colonna 6-9: Nome FLUPSY */}
                              <div className="col-span-4 truncate">
                                {basket.flupsy && basket.flupsy.name}
                              </div>
                              
                              {/* Colonna 10-12: Conteggio animali */}
                              <div className="col-span-3 text-right">
                                {basket.lastOperation?.animalCount ? (
                                  <span className="text-xs font-medium">
                                    {formatNumberWithCommas(basket.lastOperation.animalCount)}
                                  </span>
                                ) : basket.cycle?.animalCount ? (
                                  <span className="text-xs font-medium">
                                    {formatNumberWithCommas(basket.cycle.animalCount)}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })
                  ) : (
                    <SelectItem disabled value="none">Nessuna cesta attiva disponibile</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddSourceDialogOpen(false)}
            >
              Annulla
            </Button>
            <Button 
              onClick={handleAddSourceBasket}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Aggiunta in corso..." : "Aggiungi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog per aggiungere cesta destinazione */}
      <Dialog
        open={addDestinationDialogOpen}
        onOpenChange={setAddDestinationDialogOpen}
      >
        <DialogContent className="max-w-3xl p-4">
          <DialogHeader className="p-2">
            <DialogTitle className="text-lg">Aggiungi Cesta Destinazione</DialogTitle>
            <DialogDescription className="text-xs">
              Crea una nuova cesta di destinazione per la vagliatura
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="flex flex-col space-y-4">
              {/* Prima riga - selezione cesta */}
              <div>
                <Label htmlFor="destBasketId" className="block mb-2">Cesta</Label>
                <Select
                  value={destinationBasketData.basketId}
                  onValueChange={(value) => setDestinationBasketData({ ...destinationBasketData, basketId: value })}
                >
                  <SelectTrigger id="destBasketId">
                    <SelectValue placeholder="Seleziona una cesta" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingAvailableBaskets ? (
                      <div className="flex justify-center py-2">
                        <Spinner size="sm" />
                      </div>
                    ) : availableBaskets?.filter(b => b.state === "available" && !b.cycleId)?.length ? (
                      // CORREZIONE: Stampa i dati delle ceste prima del filtro
                      console.log("DEBUG - Ceste disponibili prima del filtro:", availableBaskets),
                      
                      // Mostra solo ceste available (vuote) in questo menù
                      availableBaskets
                        .filter(b => {
                          // Verifica se la cesta è available e senza ciclo
                          const isAvailable = (b.state === "available" && !b.cycleId);
                          console.log(`Cesta ${b.physicalNumber}: state=${b.state}, cycleId=${b.cycleId}, basketId=${b.basketId}, isAvailable=${isAvailable}`);
                          return isAvailable;
                        })
                        // Filtra le ceste che sono già state aggiunte come destinazione
                        .filter(basket => {
                          // Controlla se la cesta è già stata aggiunta alle ceste di destinazione nel database
                          const alreadyAddedInDB = destinationBaskets?.some(
                            destBasket => destBasket.basketId === basket.basketId
                          );
                          
                          // Controlla se la cesta è già stata aggiunta alle ceste di destinazione in attesa
                          const alreadyAddedInPending = pendingDestinationBaskets.some(
                            pendingBasket => pendingBasket.basketId === basket.basketId
                          );
                          
                          // DEBUG - Log per capire quali ceste vengono filtrate e perché
                          console.log(`Cesta ${basket.physicalNumber} verifica: in DB=${alreadyAddedInDB}, in pending=${alreadyAddedInPending}`);
                          
                          // Escludi la cesta se è già presente in uno dei due gruppi
                          return !alreadyAddedInDB && !alreadyAddedInPending;
                        })
                        .map(basket => {
                          // CORREZIONE: Se siamo in una cesta di destinazione (senza ciclo)
                          // Non dobbiamo mostrare la taglia, perché non ha senso mostrarla in una cesta vuota
                          // Se una cesta è available, non dovrebbe avere una taglia associata
                          
                          return (
                            <SelectItem key={basket.basketId} value={basket.basketId.toString()}>
                              <div className="grid grid-cols-12 w-full items-center gap-1">
                                {/* Colonna 1-3: Numero cestello */}
                                <div className="col-span-3 font-semibold">
                                  Cesta #{basket.physicalNumber}
                                </div>
                                
                                {/* Per le ceste di destinazione (vuote), non mostriamo la taglia */}
                                <div className="col-span-2">
                                  {/* Colonna intenzionalmente vuota */}
                                </div>
                                
                                {/* Colonna 6-12: Nome FLUPSY */}
                                <div className="col-span-7 truncate">
                                  {basket.flupsy && basket.flupsy.name}
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })
                    ) : (
                      <SelectItem disabled value="none">Nessuna cesta disponibile</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Seconda riga - selezione destinazione */}
              <div>
                <Label htmlFor="saleDestination" className="block mb-2">Destinazione</Label>
                <Select
                  value={destinationBasketData.saleDestination ? "sale" : "flupsy"}
                  onValueChange={(value) => setDestinationBasketData({ 
                    ...destinationBasketData, 
                    saleDestination: value === "sale" 
                  })}
                >
                  <SelectTrigger id="saleDestination">
                    <SelectValue placeholder="Seleziona destinazione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flupsy">Posiziona in FLUPSY</SelectItem>
                    <SelectItem value="sale">Vendita Diretta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              
              {/* Metto qui una calcolatrice con dati direttamente per i cesti di destinazione */}
              <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-3 shadow-sm border mt-2">
                <h3 className="text-base font-semibold mb-2 text-center">Calcolatrice Misurazioni</h3>
                
                <div className="grid grid-cols-2 gap-2">
                  {/* Prima riga - dati di input primari */}
                  <div className="space-y-1 bg-green-50 dark:bg-green-900/20 p-2 rounded-md">
                    <Label htmlFor="sampleWeight" className="text-green-700 dark:text-green-400 font-medium text-sm">
                      Peso Campione (g)
                    </Label>
                    <Input
                      id="sampleWeight"
                      type="number"
                      min="0"
                      step="10" /* Incrementi di 10 grammi per click sulle freccette */
                      defaultValue="100"
                      value={destinationBasketData.sampleWeight || ""}
                      onChange={(e) => {
                        const sampleWeight = parseFloat(e.target.value) || 0;
                        let animalsPerKg = 0;
                        
                        // Calcolo animali per kg
                        if (sampleWeight > 0 && destinationBasketData.sampleCount > 0) {
                          animalsPerKg = Math.round((destinationBasketData.sampleCount / sampleWeight) * 1000);
                        }
                        
                        // MODIFICA: Calcola percentuale di mortalità in base al campione
                        let mortalityPercentage = 0;
                        if (destinationBasketData.sampleCount && destinationBasketData.sampleCount > 0 && destinationBasketData.deadCount) {
                          mortalityPercentage = destinationBasketData.deadCount / destinationBasketData.sampleCount;
                        }
                        
                        // Calcolo totale animali (considerando la percentuale di mortalità)
                        let animalCount = 0;
                        if (animalsPerKg > 0 && destinationBasketData.totalWeightKg > 0) {
                          const totalBeforeMortality = Math.round(animalsPerKg * destinationBasketData.totalWeightKg);
                          animalCount = Math.round(totalBeforeMortality * (1 - mortalityPercentage));
                        }
                        
                        setDestinationBasketData({ 
                          ...destinationBasketData, 
                          sampleWeight,
                          animalsPerKg: animalsPerKg || 0,
                          animalCount: animalCount || 0
                        });
                      }}
                      className="h-9 bg-white dark:bg-slate-800 border-green-200 dark:border-green-800 font-mono text-base"
                    />
                  </div>
                  
                  <div className="space-y-1 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md">
                    <Label htmlFor="sampleCount" className="text-blue-700 dark:text-blue-400 font-medium text-sm">
                      N° Animali nel Campione
                    </Label>
                    <Input
                      id="sampleCount"
                      type="number"
                      min="0"
                      value={destinationBasketData.sampleCount || ""}
                      onChange={(e) => {
                        const sampleCount = parseInt(e.target.value) || 0;
                        let animalsPerKg = 0;
                        
                        // Calcolo animali per kg
                        if (destinationBasketData.sampleWeight > 0 && sampleCount > 0) {
                          animalsPerKg = Math.round((sampleCount / destinationBasketData.sampleWeight) * 1000);
                        }
                        
                        // MODIFICA: Calcola percentuale di mortalità in base al campione
                        let mortalityPercentage = 0;
                        if (sampleCount > 0 && destinationBasketData.deadCount) {
                          mortalityPercentage = destinationBasketData.deadCount / sampleCount;
                        }
                        
                        // Calcolo totale animali (considerando la percentuale di mortalità)
                        let animalCount = 0;
                        if (animalsPerKg > 0 && destinationBasketData.totalWeightKg > 0) {
                          const totalBeforeMortality = Math.round(animalsPerKg * destinationBasketData.totalWeightKg);
                          animalCount = Math.round(totalBeforeMortality * (1 - mortalityPercentage));
                        }
                        
                        setDestinationBasketData({ 
                          ...destinationBasketData, 
                          sampleCount,
                          animalsPerKg: animalsPerKg || 0,
                          animalCount: animalCount || 0
                        });
                      }}
                      className="h-9 bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-800 font-mono text-base"
                    />
                  </div>
                  
                  {/* Seconda riga - dati di input secondari */}
                  <div className="space-y-1 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-md">
                    <Label htmlFor="totalWeightKg" className="text-amber-700 dark:text-amber-400 font-medium text-sm">
                      Peso Totale Cesta (kg)
                    </Label>
                    <Input
                      id="totalWeightKg"
                      type="number"
                      min="0"
                      step="0.1"
                      value={destinationBasketData.totalWeightKg || ""}
                      onChange={(e) => {
                        const totalWeightKg = parseFloat(e.target.value) || 0;
                        
                        // MODIFICA: Calcola percentuale di mortalità in base al campione
                        let mortalityPercentage = 0;
                        if (destinationBasketData.sampleCount && destinationBasketData.sampleCount > 0 && destinationBasketData.deadCount) {
                          mortalityPercentage = destinationBasketData.deadCount / destinationBasketData.sampleCount;
                        }
                        
                        // Calcolo totale animali (considerando la percentuale di mortalità)
                        let animalCount = 0;
                        if (destinationBasketData.animalsPerKg > 0 && totalWeightKg > 0) {
                          const totalBeforeMortality = Math.round(destinationBasketData.animalsPerKg * totalWeightKg);
                          animalCount = Math.round(totalBeforeMortality * (1 - mortalityPercentage));
                        }
                        
                        setDestinationBasketData({ 
                          ...destinationBasketData, 
                          totalWeightKg,
                          animalCount: animalCount || 0
                        });
                      }}
                      className="h-9 bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-800 font-mono text-base"
                    />
                  </div>
                  
                  <div className="space-y-1 bg-red-50 dark:bg-red-900/20 p-2 rounded-md">
                    <Label htmlFor="deadCount" className="text-red-700 dark:text-red-400 font-medium text-sm">
                      Animali Morti
                    </Label>
                    <Input
                      id="deadCount"
                      type="number"
                      min="0"
                      value={destinationBasketData.deadCount || ""}
                      onChange={(e) => {
                        const deadCount = parseInt(e.target.value) || 0;
                        
                        // MODIFICA: Calcola percentuale di mortalità basandosi sui dati del campione
                        let mortalityPercentage = 0;
                        if (destinationBasketData.sampleCount && destinationBasketData.sampleCount > 0) {
                          mortalityPercentage = deadCount / destinationBasketData.sampleCount;
                        }
                        
                        // Calcolo totale animali (considerando la percentuale di mortalità)
                        let animalCount = 0;
                        if (destinationBasketData.animalsPerKg > 0 && destinationBasketData.totalWeightKg > 0) {
                          const totalBeforeMortality = Math.round(destinationBasketData.animalsPerKg * destinationBasketData.totalWeightKg);
                          animalCount = Math.round(totalBeforeMortality * (1 - mortalityPercentage));
                        }
                        
                        setDestinationBasketData({ 
                          ...destinationBasketData, 
                          deadCount,
                          animalCount: animalCount || 0,
                          mortalityPercentage // Aggiungiamo questo campo per usi futuri
                        });
                      }}
                      className="h-9 bg-white dark:bg-slate-800 border-red-200 dark:border-red-800 font-mono text-base"
                    />
                  </div>
                  
                  {/* Terza riga - risultati calcolati */}
                  <div className="space-y-1 bg-purple-50 dark:bg-purple-900/20 p-2 rounded-md">
                    <Label htmlFor="animalsPerKg" className="text-purple-700 dark:text-purple-400 font-medium text-sm">
                      Animali per Kg
                    </Label>
                    <Input
                      id="animalsPerKg"
                      type="number"
                      min="0"
                      value={destinationBasketData.animalsPerKg || ""}
                      onChange={(e) => {
                        const animalsPerKg = parseInt(e.target.value) || 0;
                        
                        // MODIFICA: Calcola percentuale di mortalità in base al campione
                        let mortalityPercentage = 0;
                        if (destinationBasketData.sampleCount && destinationBasketData.sampleCount > 0 && destinationBasketData.deadCount) {
                          mortalityPercentage = destinationBasketData.deadCount / destinationBasketData.sampleCount;
                        }
                        
                        // Calcolo totale animali (considerando la percentuale di mortalità)
                        let animalCount = 0;
                        if (animalsPerKg > 0 && destinationBasketData.totalWeightKg > 0) {
                          const totalBeforeMortality = Math.round(animalsPerKg * destinationBasketData.totalWeightKg);
                          animalCount = Math.round(totalBeforeMortality * (1 - mortalityPercentage));
                        }
                        
                        setDestinationBasketData({ 
                          ...destinationBasketData, 
                          animalsPerKg,
                          animalCount: animalCount || 0
                        });
                      }}
                      className="h-9 bg-white dark:bg-slate-800 border-purple-200 dark:border-purple-800 font-mono text-base font-bold"
                    />
                  </div>
                  
                  <div className="space-y-1 bg-cyan-50 dark:bg-cyan-900/20 p-2 rounded-md">
                    <Label htmlFor="animalCount" className="text-cyan-700 dark:text-cyan-400 font-medium text-sm">
                      Numero Totale Animali
                    </Label>
                    <Input
                      id="animalCount"
                      type="number"
                      min="0"
                      value={destinationBasketData.animalCount || ""}
                      onChange={(e) => setDestinationBasketData({ 
                        ...destinationBasketData, 
                        animalCount: parseInt(e.target.value) || 0
                      })}
                      className="h-9 bg-white dark:bg-slate-800 border-cyan-200 dark:border-cyan-800 font-mono text-base font-bold"
                    />
                  </div>
                </div>
                
                {/* Percentuale mortalità */}
                <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-md flex items-center justify-between">
                  <Label className="text-orange-700 dark:text-orange-400 font-medium text-sm">
                    Percentuale Mortalità:
                  </Label>
                  <div className="font-bold text-base font-mono bg-white dark:bg-slate-800 px-4 py-1 rounded-md border border-orange-200 dark:border-orange-800">
                    {(() => {
                      // MODIFICA: Calcola la percentuale di mortalità in base al campione
                      if (destinationBasketData.sampleCount && destinationBasketData.deadCount) {
                        const percentage = (destinationBasketData.deadCount / destinationBasketData.sampleCount) * 100;
                        return isNaN(percentage) || !isFinite(percentage) ? "0.00%" : `${percentage.toFixed(2)}%`;
                      }
                      return "0.00%";
                    })()}
                  </div>
                </div>
              </div>
              


              {/* Campi condizionali in base alla destinazione */}
              {destinationBasketData.saleDestination ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="saleDate">Data Vendita</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !destinationBasketData.saleDate && "text-muted-foreground"
                          )}
                        >
                          {destinationBasketData.saleDate ? (
                            formatDate(destinationBasketData.saleDate)
                          ) : (
                            <span>Seleziona data</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={destinationBasketData.saleDate}
                          onSelect={(date) => setDestinationBasketData({ 
                            ...destinationBasketData, 
                            saleDate: date || new Date()
                          })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="saleClient">Cliente</Label>
                    <Input
                      id="saleClient"
                      value={destinationBasketData.saleClient}
                      onChange={(e) => setDestinationBasketData({ 
                        ...destinationBasketData, 
                        saleClient: e.target.value
                      })}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="position">Posizione nel FLUPSY</Label>
                    
                    {isLoadingPositions ? (
                      <div className="h-10 flex items-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-2"></div>
                        <span className="text-sm text-muted-foreground">Caricamento posizioni disponibili...</span>
                      </div>
                    ) : availablePositions && availablePositions.length > 0 ? (
                      <Select
                        value={destinationBasketData.positionId || ""}
                        onValueChange={(value) => {
                          // Trova la posizione selezionata tra quelle disponibili
                          const selectedPosition = availablePositions.find(p => 
                            `${p.flupsyId}-${p.row}-${p.position}` === value
                          );
                          
                          if (selectedPosition) {
                            setDestinationBasketData({ 
                              ...destinationBasketData,
                              positionId: value,
                              positionFlupsyId: selectedPosition.flupsyId.toString(),
                              positionRow: selectedPosition.row,
                              positionNumber: selectedPosition.position.toString()
                            });
                          }
                        }}
                      >
                        <SelectTrigger id="position">
                          <SelectValue placeholder="Seleziona una posizione disponibile" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Filtriamo le posizioni per escludere quelle già utilizzate nelle ceste pendenti */}
                          {availablePositions
                            .filter(position => {
                              // Verifica se questa posizione è già stata utilizzata in una cesta pending
                              const positionKey = `${position.flupsyId}-${position.row}-${position.position}`;
                              const alreadyUsedInPending = pendingDestinationBaskets.some(basket => {
                                if (basket.destinationType !== 'placed') return false; // Ignora ceste in vendita
                                
                                // Se la posizione è specificata come stringa nel formato "DX1", estrai flupsyId, row e position
                                if (basket.position && typeof basket.position === 'string' && basket.flupsyId) {
                                  const positionMatch = basket.position.match(/^([A-Za-z]+)(\d+)$/);
                                  if (positionMatch) {
                                    const row = positionMatch[1];
                                    const positionNumber = parseInt(positionMatch[2]);
                                    // Controlla se coincide con la posizione corrente
                                    return basket.flupsyId === position.flupsyId && 
                                           row === position.row && 
                                           positionNumber === position.position;
                                  }
                                }
                                return false;
                              });
                              
                              // Mantieni solo le posizioni non usate
                              return !alreadyUsedInPending;
                            })
                            .map((position) => (
                              <SelectItem 
                                key={`${position.flupsyId}-${position.row}-${position.position}`} 
                                value={`${position.flupsyId}-${position.row}-${position.position}`}
                                className={position.sameFlupsy ? 'bg-green-50 text-green-700 border-l-4 border-green-400 pl-2' : ''}
                              >
                                {position.positionDisplay}
                                {position.sameFlupsy && (
                                  <span className="ml-2 text-xs text-green-600 font-normal">(stesso FLUPSY)</span>
                                )}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-sm text-muted-foreground p-2 border rounded-md">
                        Nessuna posizione disponibile in alcun FLUPSY.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDestinationDialogOpen(false)}
            >
              Annulla
            </Button>
            <Button 
              onClick={handleAddDestinationBasket}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Aggiunta in corso..." : "Aggiungi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog per confermare cancellazione */}
      <Dialog
        open={cancelConfirmDialogOpen}
        onOpenChange={setCancelConfirmDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma Annullamento</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler annullare questa selezione? 
              Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelConfirmDialogOpen(false)}
            >
              No, mantieni
            </Button>
            <Button 
              variant="destructive"
              onClick={handleCancelSelection}
            >
              Sì, annulla vagliatura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog per confermare completamento */}
      <Dialog
        open={completeConfirmDialogOpen}
        onOpenChange={setCompleteConfirmDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma Completamento</DialogTitle>
            <DialogDescription>
              {pendingDestinationBaskets.length > 0 ? (
                <>
                  Stai per registrare <strong>{pendingDestinationBaskets.length}</strong> ceste di destinazione in attesa e completare la vagliatura.
                  <br />
                  {pendingDestinationBaskets.some(b => b.destinationType === 'sold') && (
                    <>I cestelli destinati alla vendita saranno immediatamente registrati come venduti.<br /></>
                  )}
                  Questa azione chiuderà tutti i cicli collegati alle ceste di origine e creerà nuovi cicli per le ceste di destinazione.
                </>
              ) : (
                <>
                  Sei sicuro di voler completare questa vagliatura?
                  <br />
                  Questa azione chiuderà tutti i cicli collegati alle ceste di origine
                  e creerà nuovi cicli per le ceste di destinazione.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {pendingDestinationBaskets.length > 0 && (
            <div className="py-2">
              <h3 className="font-medium mb-2">Cestelli in attesa di registrazione:</h3>
              <ul className="text-sm space-y-1 max-h-60 overflow-y-auto border rounded-md p-2">
                {pendingDestinationBaskets.map((basket, index) => (
                  <li key={index} className="flex items-center py-1 border-b last:border-b-0 border-gray-100">
                    <div className="flex-1">
                      <span className="font-medium">Cesta #{basket.physicalNumber}</span>
                      {' - '}
                      {basket.destinationType === 'sold' ? (
                        <span className="text-red-600">Vendita {basket.saleClient ? `(${basket.saleClient})` : ''}</span>
                      ) : (
                        <span className="text-green-600">{flupsys?.find(f => f.id === basket.flupsyId)?.name || "FLUPSY"} {basket.position}</span>
                      )}
                    </div>
                    <div className="flex-none font-mono ml-2 mr-4">{formatNumberWithCommas(basket.animalCount || 0)} animali</div>
                    <div className="flex-none flex space-x-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleEditPendingBasket(basket.basketId);
                          setCompleteConfirmDialogOpen(false);
                        }}
                        className="h-6 w-6 p-0"
                        title="Modifica cestello"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCompleteConfirmDialogOpen(false)}
            >
              No, non ancora
            </Button>
            <Button 
              onClick={handleCompleteSelection}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Spinner size="sm" className="mr-2" /> : null}
              {pendingDestinationBaskets.length > 0 ? 'Conferma e Completa' : 'Sì, completa vagliatura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog per modificare cesta destinazione in attesa */}
      <Dialog
        open={editDestinationDialogOpen}
        onOpenChange={(open) => {
          setEditDestinationDialogOpen(open);
          if (!open) setEditingBasketId(null);
        }}
      >
        <DialogContent className="max-w-3xl p-4">
          <DialogHeader className="p-2">
            <DialogTitle className="text-lg">Modifica Cesta Destinazione</DialogTitle>
            <DialogDescription className="text-xs">
              Modifica i dati della cesta di destinazione selezionata
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="flex flex-col space-y-4">
              {/* Prima riga - Informazioni sul cestello (solo visualizzazione) */}
              <div className="p-3 bg-blue-50 rounded-md">
                <p className="text-sm font-medium text-blue-800">
                  Modifica del cestello #{
                    pendingDestinationBaskets.find(basket => basket.basketId === editingBasketId)?.physicalNumber || ""
                  }
                </p>
              </div>
              
              {/* Contenuto uguale al dialog di aggiunta cestello, ma senza la selezione del cestello */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Input numerico per il conteggio animali */}
                <div>
                  <Label htmlFor="animalCount" className="block mb-2">Conteggio Animali</Label>
                  <Input
                    id="animalCount"
                    type="number"
                    min={0}
                    value={destinationBasketData.animalCount}
                    onChange={(e) => {
                      const count = parseInt(e.target.value) || 0;
                      setDestinationBasketData({
                        ...destinationBasketData,
                        animalCount: count
                      });
                    }}
                    placeholder="Numero di animali"
                    className="w-full"
                  />
                </div>
                
                {/* Input numerico per il conteggio morti */}
                <div>
                  <Label htmlFor="deadCount" className="block mb-2">Animali Morti</Label>
                  <Input
                    id="deadCount"
                    type="number"
                    min={0}
                    value={destinationBasketData.deadCount}
                    onChange={(e) => {
                      const count = parseInt(e.target.value) || 0;
                      setDestinationBasketData({
                        ...destinationBasketData,
                        deadCount: count
                      });
                    }}
                    placeholder="Numero di animali morti"
                    className="w-full"
                  />
                </div>
                
                {/* Campionamento e peso - Calcolatrice */}
                <div className="sm:col-span-2 p-4 border rounded-md">
                  <h4 className="text-sm font-medium mb-2 flex items-center">
                    <Calculator className="h-4 w-4 mr-1" />
                    Calcolatrice Peso Campione
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Input per il peso del campione */}
                    <div>
                      <Label htmlFor="sampleWeight" className="block mb-1">Peso del Campione (g)</Label>
                      <Input
                        id="sampleWeight"
                        type="number"
                        min={0}
                        value={destinationBasketData.sampleWeight}
                        onChange={(e) => {
                          const weight = parseFloat(e.target.value) || 0;
                          const sampleCount = destinationBasketData.sampleCount;
                          
                          // Calcola gli animali per kg solo se entrambi i valori sono validi e maggiori di zero
                          let animalsPerKg = 0;
                          if (weight > 0 && sampleCount > 0) {
                            // Calcola gli animali per kg (converti grammi in kg dividendo per 1000)
                            animalsPerKg = Math.round(sampleCount / (weight / 1000));
                          }
                          
                          // Stima il peso totale in kg se il numero di animali totale è maggiore di zero
                          let totalWeightKg = 0;
                          if (destinationBasketData.animalCount > 0 && animalsPerKg > 0) {
                            totalWeightKg = parseFloat((destinationBasketData.animalCount / animalsPerKg).toFixed(2));
                          }
                          
                          setDestinationBasketData({
                            ...destinationBasketData,
                            sampleWeight: weight,
                            animalsPerKg,
                            totalWeightKg
                          });
                        }}
                        placeholder="Peso in grammi"
                        className="w-full"
                      />
                    </div>
                    
                    {/* Input per il conteggio del campione */}
                    <div>
                      <Label htmlFor="sampleCount" className="block mb-1">Numero Animali nel Campione</Label>
                      <Input
                        id="sampleCount"
                        type="number"
                        min={0}
                        value={destinationBasketData.sampleCount}
                        onChange={(e) => {
                          const count = parseInt(e.target.value) || 0;
                          const sampleWeight = destinationBasketData.sampleWeight;
                          
                          // Calcola gli animali per kg solo se entrambi i valori sono validi e maggiori di zero
                          let animalsPerKg = 0;
                          if (sampleWeight > 0 && count > 0) {
                            // Calcola gli animali per kg (converti grammi in kg dividendo per 1000)
                            animalsPerKg = Math.round(count / (sampleWeight / 1000));
                          }
                          
                          // Stima il peso totale in kg se il numero di animali totale è maggiore di zero
                          let totalWeightKg = 0;
                          if (destinationBasketData.animalCount > 0 && animalsPerKg > 0) {
                            totalWeightKg = parseFloat((destinationBasketData.animalCount / animalsPerKg).toFixed(2));
                          }
                          
                          setDestinationBasketData({
                            ...destinationBasketData,
                            sampleCount: count,
                            animalsPerKg,
                            totalWeightKg
                          });
                        }}
                        placeholder="Numero animali"
                        className="w-full"
                      />
                    </div>
                    
                    {/* Risultati dei calcoli in una cornice */}
                    <div className="sm:col-span-2 p-3 bg-gray-50 rounded-md space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">Animali per Kg:</span>
                        <span className="font-mono font-medium">
                          {formatNumberWithCommas(destinationBasketData.animalsPerKg || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">Peso Totale Stimato:</span>
                        <span className="font-mono font-medium">
                          {formatNumberWithCommas(destinationBasketData.totalWeightKg || 0)} kg
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Destinazione del cestello: FLUPSY o Vendita con switch */}
                <div className="sm:col-span-2 p-4 border rounded-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Destinazione Finale</h4>
                      <p className="text-xs text-muted-foreground">
                        Scegli se riposizionare il cestello in un FLUPSY o se destinarlo alla vendita
                      </p>
                    </div>
                    
                    <div className="relative">
                      <div 
                        className={`relative w-14 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors
                          ${destinationBasketData.saleDestination ? 'bg-red-200' : 'bg-green-200'}`}
                        onClick={() => setDestinationBasketData({
                          ...destinationBasketData,
                          saleDestination: !destinationBasketData.saleDestination,
                          // Se cambiamo da vendita a FLUPSY, ripuliamo i campi di vendita
                          ...(destinationBasketData.saleDestination ? {
                            saleClient: "",
                            saleDate: new Date()
                          } : {})
                        })}
                      >
                        <div 
                          className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300 ${
                            destinationBasketData.saleDestination ? 'translate-x-7' : ''
                          }`}
                        />
                      </div>
                      <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium">
                        {destinationBasketData.saleDestination ? 'Vendita' : 'FLUPSY'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Mostra i campi per FLUPSY o per la vendita a seconda della selezione */}
                  {destinationBasketData.saleDestination ? (
                    // Form per la vendita
                    <div className="mt-4 space-y-3">
                      <div>
                        <Label htmlFor="saleClient" className="block mb-1">Cliente</Label>
                        <Input
                          id="saleClient"
                          value={destinationBasketData.saleClient}
                          onChange={(e) => setDestinationBasketData({
                            ...destinationBasketData,
                            saleClient: e.target.value
                          })}
                          placeholder="Nome cliente"
                          className="w-full"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="saleDate" className="block mb-1">Data Vendita</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              {destinationBasketData.saleDate ? (
                                formatDate(destinationBasketData.saleDate)
                              ) : (
                                <span>Seleziona una data</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={destinationBasketData.saleDate}
                              onSelect={(date) => {
                                if (date) {
                                  setDestinationBasketData({
                                    ...destinationBasketData,
                                    saleDate: date
                                  });
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  ) : (
                    // Form per il posizionamento nel FLUPSY
                    <div className="mt-4">
                      <Label htmlFor="positionId" className="block mb-1">Posizione nel FLUPSY</Label>
                      <Select
                        value={destinationBasketData.positionId}
                        onValueChange={(value) => setDestinationBasketData({
                          ...destinationBasketData,
                          positionId: value
                        })}
                      >
                        <SelectTrigger id="positionId" className="w-full">
                          <SelectValue placeholder="Seleziona una posizione" />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingPositions ? (
                            <div className="flex justify-center py-2">
                              <Spinner size="sm" />
                            </div>
                          ) : availablePositions?.length ? (
                            availablePositions
                              .map(position => {
                                // Crea un ID combinato per la posizione nel formato "flupsyId-row-position"
                                const positionId = `${position.flupsyId}-${position.row}-${position.position}`;
                                
                                return (
                                  <SelectItem key={positionId} value={positionId}>
                                    <div className="grid grid-cols-12 w-full items-center gap-1">
                                      {/* Nome FLUPSY */}
                                      <div className="col-span-8 truncate">
                                        {position.flupsyName}
                                      </div>
                                      
                                      {/* Posizione */}
                                      <div className="col-span-4 text-right font-mono">
                                        {position.row}{position.position}
                                      </div>
                                    </div>
                                  </SelectItem>
                                );
                              })
                          ) : (
                            <SelectItem disabled value="none">
                              Nessuna posizione disponibile
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDestinationDialogOpen(false);
                setEditingBasketId(null);
              }}
            >
              Annulla
            </Button>
            <Button 
              onClick={handleSaveEditedPendingBasket}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Aggiornamento in corso..." : "Salva Modifiche"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}