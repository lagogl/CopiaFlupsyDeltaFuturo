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
import { Check, Plus, X, Edit } from "lucide-react";

// Definizione del tipo per un'unità Flupsy
interface Flupsy {
  id: number;
  name: string;
  location?: string;
  description?: string;
  active: boolean;
  maxPositions: number;
}

export default function Flupsys() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingFlupsy, setEditingFlupsy] = useState<Flupsy | null>(null);
  const [newFlupsy, setNewFlupsy] = useState({
    name: "",
    location: "",
    description: "",
    active: true,
    maxPositions: 10
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
        maxPositions: 10
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
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 px-2 flex items-center gap-1"
                    onClick={() => handleEdit(flupsy)}
                  >
                    <Edit className="h-3 w-3" /> Modifica
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