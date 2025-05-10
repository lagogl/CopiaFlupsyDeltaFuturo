import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
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
import { Check, Plus, X, Edit, Trash2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

// Definizione del tipo per un'unità Flupsy
interface Flupsy {
  id: number;
  name: string;
  location?: string;
  description?: string;
  active: boolean;
  maxPositions: number;
  productionCenter?: string;
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
  const [newFlupsy, setNewFlupsy] = useState({
    name: "",
    location: "",
    description: "",
    active: true,
    maxPositions: 10,
    productionCenter: ""
  });

  // Fetching FLUPSY units
  const { data: flupsys = [], isLoading } = useQuery<Flupsy[]>({
    queryKey: ['/api/flupsys'],
    select: (data: Flupsy[]) => data || []
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

  return (
    <div className="container mx-auto py-8">
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
                    value={editingFlupsy.location || ''}
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
                    value={editingFlupsy.description || ''}
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
                    value={editingFlupsy.productionCenter || ''}
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
                  {updateMutation.isPending ? "Aggiornamento..." : "Aggiorna FLUPSY"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

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
                <div className="mt-2 space-y-1">
                  {flupsy.location && (
                    <div className="text-sm">
                      <span className="font-semibold text-blue-600 dark:text-blue-400">Posizione:</span> {flupsy.location}
                    </div>
                  )}
                  <div className="text-sm">
                    <span className="font-semibold text-green-600 dark:text-green-400">Centro:</span> {flupsy.productionCenter || 'Non specificato'}
                  </div>
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
                  <Link 
                    href="/baskets" 
                    onClick={() => localStorage.setItem('selectedFlupsyId', String(flupsy.id))}
                    className="text-primary hover:underline"
                  >
                    Visualizza Cestelli
                  </Link>
                  <Link 
                    href="/cycles" 
                    onClick={() => localStorage.setItem('selectedCycleFlupsyId', String(flupsy.id))}
                    className="text-primary hover:underline"
                  >
                    Visualizza Cicli
                  </Link>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 flex justify-between">
                <div className="text-xs text-muted-foreground">
                  ID: {flupsy.id}
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 px-2 flex items-center gap-1"
                    onClick={() => handleEdit(flupsy)}
                  >
                    <Edit className="h-3 w-3" /> Modifica
                  </Button>
                  
                  {(user?.role === 'admin' || user?.role === 'user') && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-8 px-2 flex items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                        onClick={() => handlePopulateFlupsy(flupsy)}
                      >
                        <Plus className="h-3 w-3" /> Popola FLUPSY
                      </Button>
                      
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="h-8 px-2 flex items-center gap-1"
                        onClick={() => handleDelete(flupsy)}
                      >
                        <Trash2 className="h-3 w-3" /> Elimina
                      </Button>
                    </>
                  )}
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
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center text-destructive">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Conferma eliminazione
            </DialogTitle>
            <DialogDescription>
              {deletingFlupsy && (
                <span>
                  Stai per eliminare l'unità FLUPSY <strong>{deletingFlupsy.name}</strong> (ID: {deletingFlupsy.id}) e tutte le ceste associate.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-md mb-4">
              <p className="text-sm font-medium">Attenzione!</p>
              <p className="text-sm mt-1">Questa operazione eliminerà:</p>
              <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                <li>L'unità FLUPSY selezionata</li>
                <li>Tutte le ceste associate a questa unità</li>
              </ul>
              <p className="text-sm mt-2">L'operazione non può essere completata se ci sono cicli attivi nelle ceste associate.</p>
            </div>
            
            {deleteError && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md mb-4">
                <p className="text-sm font-medium">Errore:</p>
                <p className="text-sm mt-1">{deleteError}</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Annulla
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Eliminazione in corso..." : "Elimina FLUPSY"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Populate FLUPSY Dialog */}
      <Dialog open={isPopulateDialogOpen} onOpenChange={setIsPopulateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center text-green-600">
              <Plus className="h-5 w-5 mr-2" />
              Popola FLUPSY
            </DialogTitle>
            <DialogDescription>
              {populatingFlupsy && (
                <span>
                  Stai per popolare automaticamente l'unità FLUPSY <strong>{populatingFlupsy.name}</strong> (ID: {populatingFlupsy.id}) creando ceste in tutte le posizioni libere.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-md mb-4">
              <p className="text-sm font-medium">Informazioni</p>
              <p className="text-sm mt-1">Questa operazione:</p>
              <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                <li>Creerà nuove ceste in tutte le posizioni libere del FLUPSY</li>
                <li>Assegnerà automaticamente numeri fisici univoci alle nuove ceste</li>
                <li>Non modificherà le ceste già esistenti nel FLUPSY</li>
              </ul>
              <p className="text-sm mt-2">Le nuove ceste saranno pronte per l'uso in operazioni successive.</p>
            </div>
            
            {populateResult && (
              <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-md mb-4">
                <p className="text-sm font-medium">Risultato:</p>
                <p className="text-sm mt-1">{populateResult}</p>
              </div>
            )}
            
            {populateError && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md mb-4">
                <p className="text-sm font-medium">Errore:</p>
                <p className="text-sm mt-1">{populateError}</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsPopulateDialogOpen(false)}
              disabled={populateMutation.isPending}
            >
              {populateResult ? "Chiudi" : "Annulla"}
            </Button>
            {!populateResult && (
              <Button
                type="button"
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                onClick={handleConfirmPopulate}
                disabled={populateMutation.isPending}
              >
                {populateMutation.isPending ? "Creazione in corso..." : "Crea Ceste"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}