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

export default function SelectionDetailPage() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addSourceDialogOpen, setAddSourceDialogOpen] = useState(false);
  const [addDestinationDialogOpen, setAddDestinationDialogOpen] = useState(false);
  const [cancelConfirmDialogOpen, setCancelConfirmDialogOpen] = useState(false);
  const [completeConfirmDialogOpen, setCompleteConfirmDialogOpen] = useState(false);
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

  // Calcola i totali della selezione
  const calculateTotals = () => {
    if (!sourceBaskets || !destinationBaskets) return null;

    const sourceTotals = {
      basketCount: sourceBaskets.length,
      totalAnimals: sourceBaskets.reduce(
        (sum: number, basket: SelectionSourceBasket) => sum + (basket.animalCount || 0),
        0
      ),
    };

    const destinationTotals = {
      basketCount: destinationBaskets.length,
      totalAnimals: destinationBaskets.reduce(
        (sum: number, basket: SelectionDestinationBasket) => sum + (basket.animalCount || 0),
        0
      ),
    };

    const remainingAnimals = sourceTotals.totalAnimals - destinationTotals.totalAnimals;

    return {
      sourceTotals,
      destinationTotals,
      remainingAnimals,
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

  // Gestisce l'aggiunta di un cestello destinazione
  const handleAddDestinationBasket = async () => {
    if (!destinationBasketData.basketId) {
      toast({
        title: "Errore",
        description: "Seleziona un cestello valido",
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
      // Nota: Il server si aspetta un array di cestelli di destinazione
      const response = await fetch(`/api/selections/${id}/destination-baskets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          {
            basketId: parseInt(destinationBasketData.basketId),
            positionFlupsyId: destinationBasketData.positionFlupsyId 
              ? parseInt(destinationBasketData.positionFlupsyId) 
              : null,
            position: destinationBasketData.positionRow 
              ? `${destinationBasketData.positionRow}${destinationBasketData.positionNumber}`
              : null,
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
              : null
          }
        ]),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore nell'aggiunta del cestello destinazione");
      }

      await response.json();
      
      toast({
        title: "Cestello aggiunto",
        description: "Cestello destinazione aggiunto con successo",
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
      refetchDestinationBaskets();
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

  // Completa la selezione
  const handleCompleteSelection = async () => {
    try {
      const response = await fetch(`/api/selections/${id}/complete`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Errore nel completamento della selezione");
      }

      toast({
        title: "Selezione completata",
        description: "La selezione è stata completata con successo",
      });
      
      setCompleteConfirmDialogOpen(false);
      refetchSelection();
    } catch (error) {
      console.error("Errore:", error);
      toast({
        title: "Errore",
        description: "Si è verificato un errore durante il completamento della selezione",
        variant: "destructive",
      });
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

  // Ottiene lo stato della selezione
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

  // Se la selezione non esiste, mostra un messaggio di errore
  if (!selection) {
    return (
      <EmptyState
        icon={<AlertCircle className="h-12 w-12 text-destructive" />}
        title="Selezione non trovata"
        description="La selezione richiesta non è stata trovata nel database"
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
              { label: "Selezione", href: "/selection" },
              { label: `Selezione #${selection.selectionNumber}`, href: `/selection/${id}` },
            ]}
          />
          <div className="flex items-center">
            <PageHeading
              title={`Selezione #${selection.selectionNumber}`}
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
                Annulla Selezione
              </Button>
              
              <Button
                onClick={() => setCompleteConfirmDialogOpen(true)}
                disabled={
                  selection.status !== "draft" || 
                  !sourceBaskets?.length || 
                  !destinationBaskets?.length ||
                  (totals && totals.remainingAnimals > 0)
                }
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Completa Selezione
              </Button>
            </>
          )}
          
          <Button variant="outline" onClick={() => navigate("/selection")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna all'elenco
          </Button>
        </div>
      </div>

      {/* Informazioni sulla selezione */}
      <Card>
        <CardHeader>
          <CardTitle>Dettagli Selezione</CardTitle>
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
                  Animali Rimanenti
                </h3>
                <p className={`text-xl font-bold ${totals.remainingAnimals > 0 && selection.status === "draft" ? "text-amber-600" : totals.remainingAnimals === 0 ? "text-green-600" : ""}`}>
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
                          ? "Questa selezione è stata completata con successo."
                          : selection.status === "cancelled"
                          ? "Questa selezione è stata annullata."
                          : totals.remainingAnimals > 0
                          ? `Ci sono ancora ${formatNumberWithCommas(totals.remainingAnimals)} animali da distribuire nelle ceste di destinazione.`
                          : totals.remainingAnimals === 0 && totals.destinationTotals.basketCount > 0
                          ? "Tutti gli animali sono stati distribuiti nelle ceste di destinazione. La selezione può essere completata."
                          : totals.sourceTotals.basketCount === 0
                          ? "Non sono state ancora aggiunte ceste di origine."
                          : "Aggiungi ceste di destinazione per completare la selezione."}
                      </p>
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
                          <Badge className={`font-mono ${sourceBasket.size?.sizeCode ? getSizeColorClass(sourceBasket.size.sizeCode) : ''}`}>
                            {sourceBasket.size?.sizeCode || "N/A"}
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
                  description="Non sono state ancora aggiunte ceste di origine a questa selezione"
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
              ) : destinationBaskets?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cesta</TableHead>
                      <TableHead>Destinazione</TableHead>
                      <TableHead>Taglia</TableHead>
                      <TableHead className="text-right">Animali</TableHead>
                      <TableHead>Animali/Kg</TableHead>
                      {selection.status === "draft" && <TableHead></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {destinationBaskets.map((destBasket: SelectionDestinationBasket) => (
                      <TableRow key={destBasket.id}>
                        <TableCell className="font-medium">
                          #{destBasket.basket.physicalNumber}
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
                          <Badge className="font-mono">
                            {destBasket.size?.code || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatNumberWithCommas(destBasket.animalCount || 0)}
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatNumberWithCommas(destBasket.animalsPerKg || 0)}
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
            <div className="space-y-2">
              <Label htmlFor="basketId">Cesta</Label>
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
                  ) : availableBaskets?.filter(b => b.state === "active" && b.cycleId)?.length ? (
                    availableBaskets
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
                                      : getSizeColorClass(sizeCode)
                                  }`}
                                >
                                  {isReferenceSize ? "★ " : ""}{sizeCode}{isReferenceSize ? " ★" : ""}
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
              Crea una nuova cesta di destinazione per la selezione
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
                          const alreadyAdded = destinationBaskets?.some(
                            destBasket => destBasket.basketId === basket.basketId
                          );
                          return !alreadyAdded;
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
                          {availablePositions.map((position) => (
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
              Sì, annulla selezione
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
              Sei sicuro di voler completare questa selezione?
              Questa azione chiuderà tutti i cicli collegati alle ceste di origine
              e creerà nuovi cicli per le ceste di destinazione.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCompleteConfirmDialogOpen(false)}
            >
              No, non ancora
            </Button>
            <Button 
              onClick={handleCompleteSelection}
            >
              Sì, completa selezione
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}