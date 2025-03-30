import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Check, Plus, X, Edit, Loader2 } from "lucide-react";
import { useWebSocketMessage, sendWebSocketMessage } from "@/lib/websocket";
import { WebSocketIndicator } from "@/components/WebSocketIndicator";

export default function Flupsys() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedFlupsyId, setSelectedFlupsyId] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newFlupsy, setNewFlupsy] = useState({
    name: "",
    location: "",
    description: "",
    active: true
  });
  
  // Stato per indicare se siamo connessi al WebSocket
  const [wsConnected, setWsConnected] = useState(false);
  
  // Gestisci messaggi WebSocket per gli aggiornamenti
  const flupsyUpdateHandler = useCallback((data: any) => {
    // Invalida la query per ricaricare i dati dopo un aggiornamento
    queryClient.invalidateQueries({ queryKey: ['/api/flupsys'] });
    
    // Se stiamo aggiornando, considera l'operazione completata
    setIsUpdating(false);
    
    // Chiudi il dialog se aperto
    if (isEditMode && isDialogOpen) {
      setIsDialogOpen(false);
      setIsEditMode(false);
      setSelectedFlupsyId(null);
    }
  }, [isEditMode, isDialogOpen]);
  
  // Gestisci errori dal WebSocket
  const errorHandler = useCallback((data: any) => {
    toast({
      title: "Errore",
      description: data?.message || "Si è verificato un errore durante l'aggiornamento",
      variant: "destructive",
    });
    setIsUpdating(false);
  }, []);
  
  // Registrati per messaggi di aggiornamento FLUPSY
  const { connected } = useWebSocketMessage('flupsy_updated', flupsyUpdateHandler);
  
  // Registrati per messaggi di errore
  useWebSocketMessage('error', errorHandler);
  
  // Aggiorna lo stato della connessione WebSocket
  useEffect(() => {
    setWsConnected(connected);
  }, [connected]);

  // Fetching FLUPSY units
  const { data: flupsys, isLoading } = useQuery({
    queryKey: ['/api/flupsys'],
    select: (data) => data
  });

  // Create FLUPSY mutation
  const createMutation = useMutation({
    mutationFn: (newFlupsy: any) => apiRequest({
      url: '/api/flupsys',
      method: 'POST',
      body: newFlupsy
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/flupsys'] });
      setIsDialogOpen(false);
      setNewFlupsy({
        name: "",
        location: "",
        description: "",
        active: true
      });
      toast({
        title: "Success",
        description: "FLUPSY unit created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create FLUPSY unit",
        variant: "destructive",
      });
    }
  });

  // Funzione per aprire il dialog di modifica
  const openEditDialog = (flupsy: any) => {
    setIsEditMode(true);
    setSelectedFlupsyId(flupsy.id);
    setNewFlupsy({
      name: flupsy.name || "",
      location: flupsy.location || "",
      description: flupsy.description || "",
      active: flupsy.active
    });
    setIsDialogOpen(true);
  };
  
  // Funzione per aggiornare un FLUPSY via WebSocket
  const handleUpdate = () => {
    if (!selectedFlupsyId) return;
    
    // Verifica la connessione WebSocket
    if (!wsConnected) {
      toast({
        title: "Errore di connessione",
        description: "Non sei connesso al server in tempo reale. Ricarica la pagina e riprova.",
        variant: "destructive",
      });
      return;
    }
    
    setIsUpdating(true);
    
    // Invia l'aggiornamento via WebSocket
    const success = sendWebSocketMessage('update_flupsy', {
      id: selectedFlupsyId,
      data: newFlupsy
    });
    
    if (!success) {
      toast({
        title: "Errore di invio",
        description: "Impossibile inviare l'aggiornamento. Riprova più tardi.",
        variant: "destructive",
      });
      setIsUpdating(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditMode) {
      handleUpdate();
    } else {
      createMutation.mutate(newFlupsy);
    }
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewFlupsy(prev => ({ ...prev, [name]: value }));
  };

  // Handle switch change
  const handleSwitchChange = (checked: boolean) => {
    setNewFlupsy(prev => ({ ...prev, active: checked }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-lg">Caricamento unità FLUPSY...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <WebSocketIndicator />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Unità FLUPSY</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center">
              <Plus className="mr-2 h-4 w-4" /> Aggiungi Unità FLUPSY
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{isEditMode ? "Modifica Unità FLUPSY" : "Nuova Unità FLUPSY"}</DialogTitle>
                <DialogDescription>
                  {isEditMode 
                    ? "Modifica i dettagli dell'unità FLUPSY selezionata."
                    : "Aggiungi una nuova unità FLUPSY al sistema."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Nome*
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={newFlupsy.name}
                    onChange={handleChange}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="location" className="text-right">
                    Posizione
                  </Label>
                  <Input
                    id="location"
                    name="location"
                    value={newFlupsy.location}
                    onChange={handleChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Descrizione
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={newFlupsy.description}
                    onChange={handleChange}
                    className="col-span-3"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="active" className="text-right">
                    Attivo
                  </Label>
                  <div className="flex items-center col-span-3">
                    <Switch
                      id="active"
                      checked={newFlupsy.active}
                      onCheckedChange={handleSwitchChange}
                    />
                    <span className="ml-2">
                      {newFlupsy.active ? "Sì" : "No"}
                    </span>
                  </div>
                </div>
                
                {/* Mostra l'indicatore WebSocket solo in modalità di modifica */}
                {isEditMode && (
                  <div className="flex items-center justify-end gap-2 col-span-4 mt-2">
                    <div className={`w-3 h-3 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-xs font-medium">
                      {wsConnected ? 'Connesso al server' : 'Non connesso al server'}
                    </span>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsDialogOpen(false);
                    if (isEditMode) {
                      setIsEditMode(false);
                      setSelectedFlupsyId(null);
                    }
                  }}
                >
                  Annulla
                </Button>
                
                {isEditMode ? (
                  <Button 
                    type="submit" 
                    disabled={isUpdating || !wsConnected}
                    variant="default"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 
                        Aggiornamento...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" /> 
                        Salva Modifiche
                      </>
                    )}
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 
                        Creazione...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" /> 
                        Crea FLUPSY
                      </>
                    )}
                  </Button>
                )}
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {flupsys && flupsys.length > 0 ? (
          flupsys.map((flupsy: any) => (
            <Card key={flupsy.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{flupsy.name}</CardTitle>
                  <Badge variant={flupsy.active ? "default" : "secondary"}>
                    {flupsy.active ? "Attivo" : "Inattivo"}
                  </Badge>
                </div>
                <div className="mt-2">
                  {flupsy.location && (
                    <div className="text-sm">
                      <span className="font-semibold text-blue-600 dark:text-blue-400">Posizione:</span> {flupsy.location}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {flupsy.description && (
                  <div className="text-sm mt-1">
                    <span className="font-semibold text-amber-600 dark:text-amber-400">Descrizione:</span> {flupsy.description}
                  </div>
                )}
                <Separator className="my-4" />
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <a href={`/baskets?flupsyId=${flupsy.id}`} className="text-primary hover:underline">
                    Visualizza Cestelli
                  </a>
                  <a href={`/cycles?flupsyId=${flupsy.id}`} className="text-primary hover:underline">
                    Visualizza Cicli
                  </a>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 flex justify-between">
                <div className="text-xs text-muted-foreground">
                  ID: {flupsy.id}
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 px-2 flex items-center"
                    onClick={() => openEditDialog(flupsy)}
                  >
                    <Edit className="h-3 w-3 mr-1" /> Modifica
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-3 flex flex-col items-center justify-center p-8 border border-dashed rounded-lg">
            <div className="text-4xl mb-4">🏝️</div>
            <h3 className="text-xl font-medium mb-2">Nessuna unità FLUPSY trovata</h3>
            <p className="text-muted-foreground text-center mb-4">
              Aggiungi la tua prima unità FLUPSY per iniziare a gestire i tuoi cestelli e cicli.
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Aggiungi Unità FLUPSY
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}