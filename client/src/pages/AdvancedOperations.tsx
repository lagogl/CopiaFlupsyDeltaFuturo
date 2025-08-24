import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RefreshCw, Plus, FileText, Table, Eye, Edit, Copy, Trash2, TrendingUp, AlertTriangle } from "lucide-react";
import AdvancedOperationForm from "@/components/AdvancedOperationForm";
import { format } from "date-fns";
import { it } from "date-fns/locale";

// PageHeader component importato
const PageHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center space-x-4 mb-6">
    {children}
    <div className="flex items-center ml-auto">
      <img 
        src="/logo-mito.png" 
        alt="MITO SRL" 
        className="h-8 opacity-70"
        onError={(e) => {
          e.currentTarget.style.display = 'none';
        }}
      />
    </div>
  </div>
);

interface AdvancedOperationsProps {}

export default function AdvancedOperations({}: AdvancedOperationsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedOperation, setSelectedOperation] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch operations
  const { data: operations = [], isLoading: isLoadingOperations, error: operationsError } = useQuery({
    queryKey: ['/api/operations'],
    queryFn: () => fetch('/api/operations?includeAll=true&pageSize=1000').then(res => res.json()),
  });

  // Fetch related data for display
  const { data: baskets } = useQuery({
    queryKey: ['/api/baskets'],
  });

  const { data: flupsys } = useQuery({
    queryKey: ['/api/flupsys'],
  });

  const { data: cycles } = useQuery({
    queryKey: ['/api/cycles'],
  });

  const { data: lots } = useQuery({
    queryKey: ['/api/lots'],
  });

  // Handle form submission
  const handleSubmit = async (values: any) => {
    try {
      console.log("📝 ADVANCED OPERATIONS: Submitting operation", values);

      // Prepare the operation data
      const operationData = {
        ...values,
        date: values.date instanceof Date ? values.date.toISOString().split('T')[0] : values.date,
        animalsPerKg: values.animalsPerKg ? Number(values.animalsPerKg) : null,
        totalWeight: values.totalWeight ? Number(values.totalWeight) : null,
        animalCount: values.animalCount ? Number(values.animalCount) : null,
        deadCount: values.deadCount ? Number(values.deadCount) : null,
        sampleWeight: values.sampleWeight ? Number(values.sampleWeight) : null,
        liveAnimals: values.liveAnimals ? Number(values.liveAnimals) : null,
        averageWeight: values.averageWeight ? Number(values.averageWeight) : null,
        mortalityRate: values.mortalityRate ? Number(values.mortalityRate) : null,
      };

      const response = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(operationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Errore durante la creazione dell\'operazione');
      }

      const result = await response.json();
      console.log("✅ ADVANCED OPERATIONS: Operation created", result);

      // Success feedback
      toast({
        title: "Operazione registrata",
        description: "L'operazione è stata registrata con successo.",
        duration: 3000,
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cycles'] });

      // Close dialog
      setIsDialogOpen(false);

    } catch (error: any) {
      console.error("❌ ADVANCED OPERATIONS: Error submitting operation", error);
      toast({
        title: "Errore",
        description: error.message || "Errore durante la registrazione dell'operazione",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  // Handle operation deletion
  const handleDelete = async (operationId: number) => {
    try {
      const response = await fetch(`/api/operations/${operationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Errore durante l\'eliminazione');
      }

      toast({
        title: "Operazione eliminata",
        description: "L'operazione è stata eliminata con successo.",
      });

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
      setIsDeleteDialogOpen(false);
      setSelectedOperation(null);

    } catch (error: any) {
      toast({
        title: "Errore",
        description: error.message || "Errore durante l'eliminazione",
        variant: "destructive",
      });
    }
  };

  // Get operation type badge
  const getOperationTypeBadge = (type: string) => {
    let bgColor = 'bg-blue-100 text-blue-800';
    
    switch (type) {
      case 'prima-attivazione':
        bgColor = 'bg-purple-100 text-purple-800';
        break;
      case 'pulizia':
        bgColor = 'bg-cyan-100 text-cyan-800';
        break;
      case 'vagliatura':
        bgColor = 'bg-indigo-100 text-indigo-800';
        break;
      case 'trattamento':
        bgColor = 'bg-amber-100 text-amber-800';
        break;
      case 'misura':
        bgColor = 'bg-blue-100 text-blue-800';
        break;
      case 'vendita':
      case 'selezione-vendita':
        bgColor = 'bg-green-100 text-green-800';
        break;
      default:
        bgColor = 'bg-gray-100 text-gray-800';
    }
    
    const displayType = type
      .split('-')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor}`}>
      {displayType}
    </span>;
  };

  // Get size badge
  const getSizeBadge = (size: any) => {
    if (!size) return <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">-</span>;
    
    let bgColor = 'bg-blue-100 text-blue-800';
    if (size.code?.startsWith('TP-')) {
      const num = parseInt(size.code.substring(3));
      if (num <= 500) {
        bgColor = 'bg-purple-100 text-purple-800';
      } else if (num <= 600) {
        bgColor = 'bg-blue-100 text-blue-800';
      } else if (num <= 800) {
        bgColor = 'bg-indigo-100 text-indigo-800';
      } else if (num <= 1000) {
        bgColor = 'bg-red-100 text-red-800';
      } else if (num <= 3000) {
        bgColor = 'bg-green-100 text-green-800';
      } else if (num <= 6000) {
        bgColor = 'bg-yellow-100 text-yellow-800';
      } else if (num <= 10000) {
        bgColor = 'bg-orange-100 text-orange-800';
      } else {
        bgColor = 'bg-black text-white';
      }
    }
    
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${bgColor}`}>
      {size.code}
    </span>;
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <PageHeader>
        <h1 className="text-3xl font-bold text-gray-900">🚀 Operazioni Avanzate</h1>
        <p className="text-gray-600 mt-1">Sistema di registrazione operazioni con analytics lotti integrati</p>
      </PageHeader>

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
            <TrendingUp className="h-3 w-3 mr-1" />
            Analytics Integrati
          </Badge>
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            Layout Ottimizzato
          </Badge>
        </div>

        <div className="flex items-center space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Aggiorna dati</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Nuova Operazione
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">🚀 Registra Nuova Operazione Avanzata</DialogTitle>
                <DialogDescription>
                  Utilizza il modulo avanzato con analytics lotti integrati per una registrazione più informata
                </DialogDescription>
              </DialogHeader>
              
              <div className="mt-4">
                <AdvancedOperationForm
                  onSubmit={handleSubmit}
                  onCancel={() => setIsDialogOpen(false)}
                  isLoading={false}
                />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Operations List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Registro Operazioni
          </CardTitle>
          <CardDescription>
            Operazioni registrate tramite il sistema avanzato con tracciabilità completa
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingOperations ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-500 mt-2">Caricamento operazioni...</p>
            </div>
          ) : operationsError ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-8 w-8 mx-auto text-red-400" />
              <p className="text-red-500 mt-2">Errore nel caricamento delle operazioni</p>
            </div>
          ) : !operations || operations.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-8 w-8 mx-auto text-gray-400" />
              <p className="text-gray-500 mt-2">Nessuna operazione registrata</p>
              <p className="text-sm text-gray-400">Clicca su "Nuova Operazione" per iniziare</p>
            </div>
          ) : (
            <div className="space-y-4">
              {operations.slice(0, 20).map((operation: any) => (
                <div
                  key={operation.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className="text-sm font-medium text-gray-900">
                          #{operation.id} - {format(new Date(operation.date), 'dd/MM/yyyy', { locale: it })}
                        </div>
                        {getOperationTypeBadge(operation.type)}
                        {operation.size && getSizeBadge(operation.size)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">FLUPSY:</span>
                          <div className="font-medium">
                            {operation.basket?.flupsyName || '-'}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Cestello:</span>
                          <div className="font-medium">
                            {operation.basket ? `${operation.basket.row}-${operation.basket.position}` : '-'}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Lotto:</span>
                          <div className="font-medium">
                            {operation.lot?.supplierLotNumber || '-'}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Animali:</span>
                          <div className="font-medium">
                            {operation.animalCount?.toLocaleString() || '-'}
                          </div>
                        </div>
                      </div>

                      {operation.notes && (
                        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          {operation.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 ml-4">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Visualizza dettagli</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Duplica operazione</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-800 hover:bg-red-100"
                              onClick={() => {
                                setSelectedOperation(operation);
                                setIsDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Elimina operazione</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>
              ))}

              {operations.length > 20 && (
                <div className="text-center py-4">
                  <Button variant="outline">
                    Carica altre operazioni
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma eliminazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare questa operazione? Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedOperation && handleDelete(selectedOperation.id)}
            >
              Elimina
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}