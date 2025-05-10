import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Check, Plus, X, Edit, Trash2, AlertTriangle, Fish, LayoutGrid, Table2, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import FlupsyTableView from "@/components/flupsy/FlupsyTableView";

// Definizione del tipo per un'unità Flupsy
interface Flupsy {
  id: number;
  name: string;
  location?: string;
  description?: string;
  active: boolean;
  maxPositions: number;
  productionCenter?: string;
  // Statistiche
  totalBaskets?: number;
  activeBaskets?: number;
  availableBaskets?: number;
  freePositions?: number;
  totalAnimals?: number;
  sizeDistribution?: Record<string, number>;
}

export default function Flupsys() {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPopulateDialogOpen, setIsPopulateDialogOpen] = useState(false);
  const [editingFlupsy, setEditingFlupsy] = useState<Flupsy | null>(null);
  const [deletingFlupsy, setDeletingFlupsy] = useState<Flupsy | null>(null);
  const [populatingFlupsy, setPopulatingFlupsy] = useState<Flupsy | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [populateError, setPopulateError] = useState<string | null>(null);
  const [populateResult, setPopulateResult] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [newFlupsy, setNewFlupsy] = useState({
    name: "",
    location: "",
    description: "",
    active: true,
    maxPositions: 10,
    productionCenter: ""
  });

  // Aggiornamento dell'interfaccia per includere le statistiche aggiuntive
  interface EnhancedFlupsy extends Flupsy {
    totalBaskets?: number;
    activeBaskets?: number;
    availableBaskets?: number;
    freePositions?: number;
  }
  
  // Fetching FLUPSY units with additional statistics
  const { data: flupsys = [], isLoading } = useQuery<EnhancedFlupsy[]>({
    queryKey: ['/api/flupsys'],
    queryFn: async () => {
      const response = await fetch('/api/flupsys?includeStats=true');
      if (!response.ok) {
        throw new Error('Errore nel caricamento dei FLUPSY');
      }
      return response.json();
    },
    select: (data: EnhancedFlupsy[]) => data || []
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
        active: true,
        maxPositions: 10,
        productionCenter: ""
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

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newFlupsy);
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

  // Handling edit button click
  const handleEdit = (flupsy: Flupsy) => {
    setEditingFlupsy(flupsy);
    setIsEditDialogOpen(true);
  };

  // Edit FLUPSY mutation
  const updateMutation = useMutation({
    mutationFn: (updatedFlupsy: Flupsy) => apiRequest({
      url: `/api/flupsys/${updatedFlupsy.id}`,
      method: 'PATCH',
      body: updatedFlupsy
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/flupsys'] });
      setIsEditDialogOpen(false);
      setEditingFlupsy(null);
      toast({
        title: "Success",
        description: "FLUPSY unit updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update FLUPSY unit",
        variant: "destructive",
      });
    }
  });
  
  // Delete FLUPSY mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest({
      url: `/api/flupsys/${id}`,
      method: 'DELETE'
    }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/flupsys'] });
      setIsDeleteDialogOpen(false);
      setDeletingFlupsy(null);
      setDeleteError(null);
      toast({
        title: "Eliminazione completata",
        description: data.message || "Unità FLUPSY eliminata con successo",
        variant: "success",
      });
    },
    onError: (error: any) => {
      // Utilizza direttamente la proprietà responseMessage che abbiamo aggiunto in queryClient
      // o ricorre al fallback sulle proprietà standard
      const errorMessage = 
        // @ts-ignore - Usiamo la proprietà personalizzata che abbiamo aggiunto
        error.responseMessage || 
        // @ts-ignore - Controlliamo anche la proprietà data.message
        (error.data && error.data.message) || 
        // Fallback al messaggio standard
        error.message || 
        "Errore durante l'eliminazione";
      
      console.log("Errore completo:", error);
      console.log("Messaggio di errore estratto:", errorMessage);
      
      setDeleteError(errorMessage);
      toast({
        title: "Errore",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });
  
  // Populate FLUPSY mutation
  const populateMutation = useMutation({
    mutationFn: (id: number) => apiRequest({
      url: `/api/flupsys/${id}/populate`,
      method: 'POST'
    }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/flupsys'] });
      queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      
      setPopulateResult(data.message || "FLUPSY popolato con successo");
      setPopulateError(null);
      
      toast({
        title: "Operazione completata",
        description: data.message || "FLUPSY popolato con successo",
        variant: "success",
      });
    },
    onError: (error: any) => {
      // Utilizza direttamente la proprietà responseMessage che abbiamo aggiunto in queryClient
      // o ricorre al fallback sulle proprietà standard
      const errorMessage = 
        // @ts-ignore - Usiamo la proprietà personalizzata che abbiamo aggiunto
        error.responseMessage || 
        // @ts-ignore - Controlliamo anche la proprietà data.message
        (error.data && error.data.message) || 
        // Fallback al messaggio standard
        error.message || 
        "Errore durante il popolamento del FLUPSY";
      
      console.log("Errore completo:", error);
      console.log("Messaggio di errore estratto:", errorMessage);
      
      setPopulateError(errorMessage);
      setPopulateResult(null);
      toast({
        title: "Errore",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });
  
  // Handling delete button click
  const handleDelete = (flupsy: Flupsy) => {
    setDeletingFlupsy(flupsy);
    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };
  
  // Handle confirm delete
  const handleConfirmDelete = () => {
    if (deletingFlupsy) {
      deleteMutation.mutate(deletingFlupsy.id);
    }
  };
  
  // Handling populate button click
  const handlePopulateFlupsy = (flupsy: Flupsy) => {
    setPopulatingFlupsy(flupsy);
    setPopulateError(null);
    setPopulateResult(null);
    setIsPopulateDialogOpen(true);
  };
  
  // Handle confirm populate
  const handleConfirmPopulate = () => {
    if (populatingFlupsy) {
      populateMutation.mutate(populatingFlupsy.id);
    }
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

  // Handle edit form submission
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFlupsy) {
      updateMutation.mutate(editingFlupsy);
    }
  };

  // Handle edit input change
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (editingFlupsy) {
      setEditingFlupsy(prev => prev ? { ...prev, [name]: value } : null);
    }
  };

  // Handle edit switch change
  const handleEditSwitchChange = (checked: boolean) => {
    if (editingFlupsy) {
      setEditingFlupsy(prev => prev ? { ...prev, active: checked } : null);
    }
  };

  // Funzione per renderizzare le statistiche delle taglie come barre orizzontali
  const renderSizeDistribution = (sizeDistribution: Record<string, number>) => {
    if (!sizeDistribution || Object.keys(sizeDistribution).length === 0) {
      return <p className="text-sm text-gray-500 mt-2">Nessun dato di taglia disponibile</p>;
    }

    // Calcola il totale per le percentuali
    const total = Object.values(sizeDistribution).reduce((sum, count) => sum + Number(count), 0);
    
    // Ordina le taglie per conteggio (dalla più alta alla più bassa)
    const sortedSizes = Object.entries(sizeDistribution)
      .sort(([, countA], [, countB]) => Number(countB) - Number(countA))
      .slice(0, 5); // Mostra solo le prime 5 taglie più numerose
    
    return (
      <div className="space-y-2 mt-2">
        {sortedSizes.map(([size, count]) => {
          const percentage = total > 0 ? (Number(count) / total) * 100 : 0;
          
          return (
            <div key={size} className="flex flex-col">
              <div className="flex justify-between text-xs mb-1">
                <span>{size}</span>
                <span className="font-medium">{percentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-cyan-500 h-2 rounded-full" 
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Unità FLUPSY</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted rounded-md p-1 mr-2">
            <Button
              variant={viewMode === 'cards' ? "secondary" : "ghost"} 
              size="sm"
              className="h-8 px-2"
              onClick={() => setViewMode('cards')}
            >
              <LayoutGrid className="h-4 w-4 mr-1" />
              Card
            </Button>
            <Button
              variant={viewMode === 'table' ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2"
              onClick={() => setViewMode('table')}
            >
              <Table2 className="h-4 w-4 mr-1" />
              Tabella
            </Button>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center">
                <Plus className="mr-2 h-4 w-4" /> Aggiungi Unità FLUPSY
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Nuova Unità FLUPSY</DialogTitle>
                  <DialogDescription>
                    Aggiungi una nuova unità FLUPSY al sistema.
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
                    <Label htmlFor="maxPositions" className="text-right">
                      Posizioni max
                    </Label>
                    <Input
                      id="maxPositions"
                      name="maxPositions"
                      type="number"
                      min="10"
                      max="20"
                      value={newFlupsy.maxPositions}
                      onChange={(e) => setNewFlupsy({...newFlupsy, maxPositions: Number(e.target.value)})}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="productionCenter" className="text-right">
                      Centro di Produzione
                    </Label>
                    <Input
                      id="productionCenter"
                      name="productionCenter"
                      value={newFlupsy.productionCenter}
                      onChange={handleChange}
                      className="col-span-3"
                      placeholder="es. Chioggia, Taranto, ecc."
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
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Annulla
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creazione..." : "Crea FLUPSY"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit FLUPSY Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          {editingFlupsy && (
            <form onSubmit={handleEditSubmit}>
              <DialogHeader>
                <DialogTitle>Modifica Unità FLUPSY</DialogTitle>
                <DialogDescription>
                  Modifica i dettagli dell'unità FLUPSY {editingFlupsy.name}.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-name" className="text-right">
                    Nome*
                  </Label>
                  <Input
                    id="edit-name"
                    name="name"
                    value={editingFlupsy.name}
                    onChange={handleEditChange}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-location" className="text-right">
                    Posizione
                  </Label>
                  <Input
                    id="edit-location"
                    name="location"
                    value={editingFlupsy.location || ""}
                    onChange={handleEditChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-description" className="text-right">
                    Descrizione
                  </Label>
                  <Textarea
                    id="edit-description"
                    name="description"
                    value={editingFlupsy.description || ""}
                    onChange={handleEditChange}
                    className="col-span-3"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-maxPositions" className="text-right">
                    Posizioni max
                  </Label>
                  <Input
                    id="edit-maxPositions"
                    name="maxPositions"
                    type="number"
                    min="10"
                    max="20"
                    value={editingFlupsy.maxPositions}
                    onChange={(e) => setEditingFlupsy({...editingFlupsy, maxPositions: Number(e.target.value)})}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-productionCenter" className="text-right">
                    Centro di Produzione
                  </Label>
                  <Input
                    id="edit-productionCenter"
                    name="productionCenter"
                    value={editingFlupsy.productionCenter || ""}
                    onChange={handleEditChange}
                    className="col-span-3"
                    placeholder="es. Chioggia, Taranto, ecc."
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-active" className="text-right">
                    Attivo
                  </Label>
                  <div className="flex items-center col-span-3">
                    <Switch
                      id="edit-active"
                      checked={editingFlupsy.active}
                      onCheckedChange={handleEditSwitchChange}
                    />
                    <span className="ml-2">
                      {editingFlupsy.active ? "Sì" : "No"}
                    </span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Aggiornamento..." : "Salva Modifiche"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Conferma Eliminazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare l'unità FLUPSY "{deletingFlupsy?.name}"?
              Questa azione non può essere annullata e rimuoverà anche tutti i cestelli associati.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
              <div className="flex items-start">
                <div className="py-1">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </div>
                <div className="ml-3">
                  <p className="font-medium">Errore durante l'eliminazione</p>
                  <p className="text-sm">{deleteError}</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-4 mt-4">
            <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Annulla
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Eliminazione..." : "Elimina"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Populate FLUPSY Dialog */}
      <Dialog open={isPopulateDialogOpen} onOpenChange={setIsPopulateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Popola FLUPSY</DialogTitle>
            <DialogDescription>
              Questa operazione creerà automaticamente cestelli per tutte le posizioni libere nell'unità FLUPSY "{populatingFlupsy?.name}".
            </DialogDescription>
          </DialogHeader>
          {populateError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 mt-0.5" />
                <div className="ml-3">
                  <p className="font-medium">Errore</p>
                  <p className="text-sm">{populateError}</p>
                </div>
              </div>
            </div>
          )}
          {populateResult && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative" role="alert">
              <div className="flex">
                <Check className="h-5 w-5 mt-0.5" />
                <div className="ml-3">
                  <p className="font-medium">Completato</p>
                  <p className="text-sm">{populateResult}</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-4 mt-4">
            <Button type="button" variant="outline" onClick={() => setIsPopulateDialogOpen(false)}>
              Chiudi
            </Button>
            {!populateResult && (
              <Button 
                type="button" 
                variant="default" 
                onClick={handleConfirmPopulate}
                disabled={populateMutation.isPending}
              >
                {populateMutation.isPending ? "Popolamento..." : "Popola FLUPSY"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {viewMode === 'table' ? (
        <FlupsyTableView 
          flupsys={flupsys} 
          userRole={user?.role}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onPopulate={handlePopulateFlupsy}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flupsys && flupsys.length > 0 ? (
            flupsys.map((flupsy) => (
              <Card key={flupsy.id} className={`overflow-hidden ${!flupsy.active ? 'bg-muted/30 border-muted' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center">
                        <span>{flupsy.name}</span>
                        {flupsy.totalAnimals && flupsy.totalAnimals > 0 && (
                          <Badge variant="secondary" className="ml-2 flex items-center gap-1 bg-cyan-100 text-cyan-900 dark:bg-cyan-900 dark:text-cyan-100">
                            <Fish className="h-3 w-3" /> 
                            {flupsy.totalAnimals.toLocaleString()}
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {flupsy.location ? flupsy.location : 'Nessuna posizione specificata'}
                        {flupsy.productionCenter && ` - ${flupsy.productionCenter}`}
                      </CardDescription>
                    </div>
                    <Badge variant={flupsy.active ? "default" : "secondary"}>
                      {flupsy.active ? "Attivo" : "Inattivo"}
                    </Badge>
                  </div>
                  {flupsy.description && (
                    <p className="text-sm mt-2 text-muted-foreground">{flupsy.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Cestelli</p>
                        <p className="text-2xl font-bold">{flupsy.totalBaskets || 0}/{flupsy.maxPositions}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Cestelli Attivi</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{flupsy.activeBaskets || 0}</p>
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Posizioni Libere</p>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 rounded-full" 
                          style={{ 
                            width: `${((flupsy.maxPositions - (flupsy.totalBaskets || 0)) / flupsy.maxPositions) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <p className="text-sm mt-1 text-green-600 dark:text-green-400 font-medium">
                        {flupsy.maxPositions - (flupsy.totalBaskets || 0)} posizioni disponibili
                      </p>
                    </div>
                    
                    {flupsy.sizeDistribution && Object.keys(flupsy.sizeDistribution).length > 0 && (
                      <div className="pt-2">
                        <p className="text-sm font-medium text-muted-foreground">Distribuzione Taglie</p>
                        {renderSizeDistribution(flupsy.sizeDistribution)}
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between pt-0">
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm" className="w-24">
                      <Link to={`/flupsys/${flupsy.id}`}>
                        Dettagli
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="w-28">
                      <Link to={`/flupsys/${flupsy.id}/positions`}>
                        Posizioni
                      </Link>
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(flupsy)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    {(user?.role === 'admin' || user?.role === 'user') && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100/50 dark:text-emerald-500 dark:hover:text-emerald-400 dark:hover:bg-emerald-900/20"
                          onClick={() => handlePopulateFlupsy(flupsy)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:text-red-700 hover:bg-red-100/50 dark:text-red-500 dark:hover:text-red-400 dark:hover:bg-red-900/20"
                          onClick={() => handleDelete(flupsy)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="col-span-full flex items-center justify-center p-8 border rounded-lg">
              <div className="text-center">
                <p className="text-lg font-medium text-muted-foreground">Nessuna unità FLUPSY trovata</p>
                <p className="text-sm text-muted-foreground mt-1">Aggiungi una nuova unità FLUPSY per iniziare</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}