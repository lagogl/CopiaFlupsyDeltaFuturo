import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { Plus, Package, FileText, Download, Eye, CheckCircle, Check, ChevronsUpDown, Calculator, Truck, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import AdvancedSalesConfigTab from "./AdvancedSalesConfigTab";

interface SaleOperation {
  operationId: number;
  basketId: number;
  date: string;
  animalCount: number;
  totalWeight: number;
  animalsPerKg: number;
  sizeCode: string;
  sizeName: string;
  basketPhysicalNumber: number;
  processed: boolean;
}

interface Customer {
  id: number;
  externalId: string;
  name: string;
  businessName: string;
  vatNumber: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
}

interface BagConfiguration {
  sizeCode: string;
  animalCount: number;
  originalWeight: number;
  weightLoss: number;
  wastePercentage: number;
  originalAnimalsPerKg: number;
  notes?: string;
  allocations: {
    sourceOperationId: number;
    sourceBasketId: number;
    allocatedAnimals: number;
    allocatedWeight: number;
    sourceAnimalsPerKg: number;
    sourceSizeCode: string;
  }[];
}

interface BasketSupply {
  basketId: number;
  basketPhysicalNumber: number;
  operationId: number;
  sizeCode: string;
  sizeName: string;
  totalAnimals: number;
  totalWeightKg: number;
  animalsPerKg: number;
}

export default function AdvancedSales() {
  const [activeTab, setActiveTab] = useState("operations");
  const [selectedOperations, setSelectedOperations] = useState<number[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [manualCustomer, setManualCustomer] = useState({ name: "", details: "" });
  const [useManualCustomer, setUseManualCustomer] = useState(false);
  const [saleDate, setSaleDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [notes, setNotes] = useState("");
  const [showBagConfig, setShowBagConfig] = useState(false);
  const [currentSaleId, setCurrentSaleId] = useState<number | null>(null);
  const [bagConfigs, setBagConfigs] = useState<BagConfiguration[]>([]);
  const [baseSupplyByBasket, setBaseSupplyByBasket] = useState<Record<number, BasketSupply>>({});
  const [openCustomerCombobox, setOpenCustomerCombobox] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Calcola animali allocati per cestello in tempo reale
  const allocatedByBasket = useMemo(() => {
    const allocated: Record<number, number> = {};
    bagConfigs.forEach(bag => {
      bag.allocations.forEach(alloc => {
        allocated[alloc.sourceBasketId] = (allocated[alloc.sourceBasketId] || 0) + alloc.allocatedAnimals;
      });
    });
    return allocated;
  }, [bagConfigs]);

  // Calcola animali rimanenti per cestello
  const remainingByBasket = useMemo(() => {
    const remaining: Record<number, number> = {};
    Object.entries(baseSupplyByBasket).forEach(([basketId, supply]) => {
      const allocated = allocatedByBasket[parseInt(basketId)] || 0;
      remaining[parseInt(basketId)] = supply.totalAnimals - allocated;
    });
    return remaining;
  }, [baseSupplyByBasket, allocatedByBasket]);

  // Query per operazioni di vendita disponibili
  const { data: availableOperations, isLoading: loadingOperations } = useQuery({
    queryKey: ['/api/advanced-sales/operations'],
    queryFn: () => apiRequest('/api/advanced-sales/operations?processed=false')
  });

  // Query per clienti
  const { data: customers, isLoading: loadingCustomers } = useQuery({
    queryKey: ['/api/advanced-sales/customers'],
    queryFn: () => apiRequest('/api/advanced-sales/customers')
  });

  // Query per vendite avanzate esistenti
  const { data: salesData, isLoading: loadingSales } = useQuery({
    queryKey: ['/api/advanced-sales'],
    queryFn: () => apiRequest('/api/advanced-sales')
  });

  // Mutation per creare vendita
  const createSaleMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/advanced-sales', 'POST', data),
    onSuccess: (response) => {
      toast({ title: "Successo", description: "Vendita avanzata creata con successo" });
      setCurrentSaleId(response.sale.id);
      setActiveTab("config");
      queryClient.invalidateQueries({ queryKey: ['/api/advanced-sales'] });
      
      // Cattura disponibilità cestelli
      const supply: Record<number, BasketSupply> = {};
      response.operations.forEach((op: SaleOperation) => {
        supply[op.basketId] = {
          basketId: op.basketId,
          basketPhysicalNumber: op.basketPhysicalNumber,
          operationId: op.operationId,
          sizeCode: op.sizeCode,
          sizeName: op.sizeName,
          totalAnimals: op.animalCount,
          totalWeightKg: op.totalWeight,
          animalsPerKg: op.animalsPerKg
        };
      });
      setBaseSupplyByBasket(supply);
      
      // Inizializza con un sacco vuoto
      setBagConfigs([]);
    },
    onError: (error: any) => {
      toast({ 
        title: "Errore", 
        description: error.message || "Errore nella creazione della vendita",
        variant: "destructive" 
      });
    }
  });

  // Mutation per configurare sacchi
  const configureBagsMutation = useMutation({
    mutationFn: ({ saleId, bags }: { saleId: number; bags: BagConfiguration[] }) => 
      apiRequest(`/api/advanced-sales/${saleId}/bags`, 'POST', { bags }),
    onSuccess: () => {
      toast({ title: "Successo", description: "Configurazione sacchi completata" });
      queryClient.invalidateQueries({ queryKey: ['/api/advanced-sales'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Errore", 
        description: error.message || "Errore nella configurazione dei sacchi",
        variant: "destructive" 
      });
    }
  });

  // Mutation per aggiornare stato vendita
  const updateStatusMutation = useMutation({
    mutationFn: ({ saleId, status }: { saleId: number; status: string }) =>
      apiRequest(`/api/advanced-sales/${saleId}/status`, 'PATCH', { status }),
    onSuccess: () => {
      toast({ title: "Successo", description: "Stato vendita aggiornato" });
      queryClient.invalidateQueries({ queryKey: ['/api/advanced-sales'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Errore", 
        description: error.message || "Errore nell'aggiornamento dello stato",
        variant: "destructive" 
      });
    }
  });

  // Carica sacchi esistenti quando si seleziona una vendita
  useEffect(() => {
    if (currentSaleId && activeTab === "config") {
      apiRequest(`/api/advanced-sales/${currentSaleId}`)
        .then((response: any) => {
          // Carica sacchi esistenti
          if (response.bags && response.bags.length > 0) {
            const loadedBags: BagConfiguration[] = response.bags.map((bag: any) => ({
              sizeCode: bag.sizeCode,
              animalCount: bag.animalCount,
              originalWeight: bag.originalWeight,
              weightLoss: bag.weightLoss || 0,
              wastePercentage: bag.wastePercentage || 0,
              originalAnimalsPerKg: bag.originalAnimalsPerKg,
              notes: bag.notes || "",
              allocations: bag.allocations.map((alloc: any) => ({
                sourceOperationId: alloc.sourceOperationId,
                sourceBasketId: alloc.sourceBasketId,
                allocatedAnimals: alloc.allocatedAnimals,
                allocatedWeight: alloc.allocatedWeight,
                sourceAnimalsPerKg: alloc.sourceAnimalsPerKg,
                sourceSizeCode: alloc.sourceSizeCode
              }))
            }));
            setBagConfigs(loadedBags);
          } else {
            setBagConfigs([]);
          }

          // Carica operazioni disponibili
          if (response.operations && response.operations.length > 0) {
            const supply: Record<number, BasketSupply> = {};
            response.operations.forEach((op: any) => {
              supply[op.basketId] = {
                basketId: op.basketId,
                basketPhysicalNumber: op.basketPhysicalNumber,
                operationId: op.operationId,
                sizeCode: "", // Non disponibile in questo endpoint
                sizeName: "",
                totalAnimals: op.originalAnimals,
                totalWeightKg: op.originalWeight / 1000,
                animalsPerKg: op.originalAnimalsPerKg
              };
            });
            setBaseSupplyByBasket(supply);
          }
        })
        .catch((error: any) => {
          console.error("Errore nel caricamento dei sacchi:", error);
          toast({
            title: "Errore",
            description: "Impossibile caricare i dettagli della vendita",
            variant: "destructive"
          });
        });
    }
  }, [currentSaleId, activeTab]);

  const handleOperationSelect = (operationId: number, checked: boolean) => {
    if (checked) {
      setSelectedOperations(prev => [...prev, operationId]);
    } else {
      setSelectedOperations(prev => prev.filter(id => id !== operationId));
    }
  };

  const handleCreateSale = () => {
    if (selectedOperations.length === 0) {
      toast({
        title: "Errore",
        description: "Seleziona almeno un'operazione di vendita",
        variant: "destructive"
      });
      return;
    }

    const customerData = useManualCustomer 
      ? { name: manualCustomer.name, details: manualCustomer.details }
      : selectedCustomer;

    createSaleMutation.mutate({
      operationIds: selectedOperations,
      customerData,
      saleDate,
      notes
    });
  };

  // Aggiunge un nuovo sacco
  const addBag = (basketId: number, animalCount: number, netWeightKg: number, identifier?: string, section?: string) => {
    const supply = baseSupplyByBasket[basketId];
    if (!supply) return;

    // Validazione: verifica che ci siano abbastanza animali disponibili
    const remaining = remainingByBasket[basketId] || 0;
    if (animalCount > remaining) {
      toast({
        title: "Errore",
        description: `Solo ${remaining.toLocaleString()} animali disponibili nel cestello #${supply.basketPhysicalNumber}`,
        variant: "destructive"
      });
      return;
    }

    const originalWeightGrams = netWeightKg * 1000;
    
    const newBag: BagConfiguration = {
      sizeCode: supply.sizeCode,
      animalCount,
      originalWeight: originalWeightGrams,
      weightLoss: 0,
      wastePercentage: 2,
      originalAnimalsPerKg: supply.animalsPerKg,
      notes: [identifier, section].filter(Boolean).join(' - ') || undefined,
      allocations: [{
        sourceOperationId: supply.operationId,
        sourceBasketId: basketId,
        allocatedAnimals: animalCount,
        allocatedWeight: originalWeightGrams,
        sourceAnimalsPerKg: supply.animalsPerKg,
        sourceSizeCode: supply.sizeCode
      }]
    };

    setBagConfigs([...bagConfigs, newBag]);
    toast({ title: "Successo", description: "Sacco aggiunto" });
  };

  // Rimuove un sacco
  const removeBag = (bagIndex: number) => {
    const newConfigs = [...bagConfigs];
    newConfigs.splice(bagIndex, 1);
    setBagConfigs(newConfigs);
  };

  // Clona un sacco
  const cloneBag = (bagIndex: number) => {
    const bag = bagConfigs[bagIndex];
    const basketId = bag.allocations[0].sourceBasketId;
    const remaining = remainingByBasket[basketId] || 0;
    
    if (bag.animalCount > remaining) {
      toast({
        title: "Errore",
        description: `Solo ${remaining.toLocaleString()} animali disponibili per clonare questo sacco`,
        variant: "destructive"
      });
      return;
    }

    setBagConfigs([...bagConfigs, { ...bag }]);
    toast({ title: "Successo", description: "Sacco clonato" });
  };

  // Aggiorna un campo del sacco
  const updateBag = (bagIndex: number, updates: Partial<BagConfiguration>) => {
    const newConfigs = [...bagConfigs];
    newConfigs[bagIndex] = { ...newConfigs[bagIndex], ...updates };
    
    // Se cambiano gli animali, aggiorna anche l'allocazione
    if (updates.animalCount !== undefined) {
      newConfigs[bagIndex].allocations[0].allocatedAnimals = updates.animalCount;
    }
    
    setBagConfigs(newConfigs);
  };

  const handleWeightLoss = (bagIndex: number, weightLossKg: number) => {
    const maxLossKg = 1.5; // kg
    const actualLossKg = Math.min(weightLossKg, maxLossKg);
    // FIX: Converti la perdita in grammi
    const actualLossGrams = actualLossKg * 1000;
    
    const newConfigs = [...bagConfigs];
    newConfigs[bagIndex].weightLoss = actualLossGrams; // salva in grammi
    
    // Ricalcola animals per kg con limite 5%
    // originalWeight è già in grammi, sottrai la perdita in grammi
    const newWeightGrams = newConfigs[bagIndex].originalWeight - actualLossGrams;
    const newAnimalsPerKg = newConfigs[bagIndex].animalCount / (newWeightGrams / 1000);
    const maxVariation = newConfigs[bagIndex].originalAnimalsPerKg * 0.05;
    
    if (Math.abs(newAnimalsPerKg - newConfigs[bagIndex].originalAnimalsPerKg) <= maxVariation) {
      // Aggiorna solo se entro il limite del 5%
      setBagConfigs(newConfigs);
    } else {
      toast({
        title: "Attenzione",
        description: "La perdita di peso supera il limite del 5% di variazione degli animali/kg",
        variant: "destructive"
      });
    }
  };

  const saveBagConfiguration = () => {
    if (!currentSaleId || bagConfigs.length === 0) return;

    configureBagsMutation.mutate({
      saleId: currentSaleId,
      bags: bagConfigs
    });
  };

  const handleGeneratePDF = (saleId: number) => {
    // Apre il PDF in una nuova tab usando pdfkit
    const link = document.createElement('a');
    link.href = `/api/advanced-sales/${saleId}/report.pdf`;
    link.target = '_blank';
    link.click();
  };

  const handleDownloadPDF = (saleId: number) => {
    window.open(`/api/advanced-sales/${saleId}/download-pdf`, '_blank');
  };

  const handleUpdateStatus = (saleId: number, status: string) => {
    updateStatusMutation.mutate({ saleId, status });
  };

  const generateDDTMutation = useMutation({
    mutationFn: async (saleId: number) => {
      return await apiRequest(`/api/advanced-sales/${saleId}/generate-ddt`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/advanced-sales'] });
      toast({
        title: "Successo",
        description: "DDT generato con successo",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore nella generazione del DDT",
        variant: "destructive"
      });
    }
  });

  const handleGenerateDDT = (saleId: number) => {
    generateDDTMutation.mutate(saleId);
  };

  const sendDDTToFICMutation = useMutation({
    mutationFn: async (ddtId: number) => {
      return await apiRequest(`/api/ddt/${ddtId}/send-to-fic`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/advanced-sales'] });
      toast({
        title: "Successo",
        description: "DDT inviato con successo a Fatture in Cloud",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore nell'invio del DDT a Fatture in Cloud",
        variant: "destructive"
      });
    }
  });

  const handleSendDDTToFIC = (ddtId: number) => {
    sendDDTToFICMutation.mutate(ddtId);
  };

  const handleDownloadDDTPDF = (ddtId: number) => {
    window.open(`/api/ddt/${ddtId}/pdf`, '_blank');
  };

  const handleOpenReport = (saleId: number) => {
    window.open(`/api/advanced-sales/${saleId}/report.pdf`, '_blank');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestione Vendite Avanzate</h1>
          <p className="text-muted-foreground">
            Configura sacchi personalizzati e genera rapporti di vendita dettagliati
          </p>
        </div>
        <Button 
          onClick={() => setActiveTab("new")}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Nuova Vendita
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="operations" className="gap-2">
            <Package className="h-4 w-4" />
            Operazioni
          </TabsTrigger>
          <TabsTrigger value="new" className="gap-2">
            <Plus className="h-4 w-4" />
            Nuova Vendita
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2" disabled={!currentSaleId}>
            <Calculator className="h-4 w-4" />
            Configurazione
          </TabsTrigger>
          <TabsTrigger value="sales" className="gap-2">
            <FileText className="h-4 w-4" />
            Vendite
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Operazioni di Vendita Disponibili</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingOperations ? (
                <div>Caricamento operazioni...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Seleziona</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Cestello</TableHead>
                      <TableHead>Taglia</TableHead>
                      <TableHead>Animali</TableHead>
                      <TableHead>Peso (kg)</TableHead>
                      <TableHead>Animali/kg</TableHead>
                      <TableHead>Stato</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableOperations?.operations?.map((op: SaleOperation) => (
                      <TableRow key={op.operationId}>
                        <TableCell>
                          <Checkbox
                            checked={selectedOperations.includes(op.operationId)}
                            onCheckedChange={(checked) => 
                              handleOperationSelect(op.operationId, checked as boolean)
                            }
                            disabled={op.processed}
                          />
                        </TableCell>
                        <TableCell>{format(new Date(op.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>#{op.basketPhysicalNumber}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{op.sizeCode}</Badge>
                        </TableCell>
                        <TableCell>{op.animalCount?.toLocaleString()}</TableCell>
                        <TableCell>{op.totalWeight ? (op.totalWeight / 1000).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}</TableCell>
                        <TableCell>{op.animalsPerKg?.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={op.processed ? "secondary" : "default"}>
                            {op.processed ? "Processata" : "Disponibile"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="new" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Crea Nuova Vendita Avanzata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Operazioni Selezionate</Label>
                <div className="text-sm text-muted-foreground">
                  {selectedOperations.length} operazioni selezionate
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cliente</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={useManualCustomer}
                    onCheckedChange={(checked) => setUseManualCustomer(checked === true)}
                  />
                  <span className="text-sm">Inserimento manuale cliente</span>
                </div>
                
                {useManualCustomer ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="Nome cliente"
                      value={manualCustomer.name}
                      onChange={(e) => setManualCustomer(prev => ({ ...prev, name: e.target.value }))}
                    />
                    <Textarea
                      placeholder="Dettagli aziendali (opzionale)"
                      value={manualCustomer.details}
                      onChange={(e) => setManualCustomer(prev => ({ ...prev, details: e.target.value }))}
                    />
                  </div>
                ) : (
                  <Popover open={openCustomerCombobox} onOpenChange={setOpenCustomerCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openCustomerCombobox}
                        className="w-full justify-between"
                        data-testid="button-select-customer"
                      >
                        {selectedCustomer
                          ? `${selectedCustomer.name} - ${selectedCustomer.businessName}`
                          : "Seleziona cliente dall'anagrafica"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Cerca cliente..." data-testid="input-search-customer" />
                        <CommandList>
                          <CommandEmpty>Nessun cliente trovato.</CommandEmpty>
                          <CommandGroup>
                            {customers?.customers?.map((customer: Customer) => (
                              <CommandItem
                                key={customer.id}
                                value={`${customer.name} ${customer.vatNumber || ''}`.toLowerCase()}
                                onSelect={() => {
                                  setSelectedCustomer(customer);
                                  setOpenCustomerCombobox(false);
                                }}
                                data-testid={`item-customer-${customer.id}`}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    selectedCustomer?.id === customer.id ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">{customer.name}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {customer.vatNumber ? `P.IVA ${customer.vatNumber}` : 'Nessuna P.IVA'}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="saleDate">Data Vendita</Label>
                <Input
                  id="saleDate"
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Note</Label>
                <Textarea
                  id="notes"
                  placeholder="Note aggiuntive per la vendita"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <Button 
                onClick={handleCreateSale}
                disabled={selectedOperations.length === 0 || createSaleMutation.isPending}
                className="w-full"
              >
                {createSaleMutation.isPending ? "Creazione..." : "Crea Vendita"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <AdvancedSalesConfigTab
            baseSupplyByBasket={baseSupplyByBasket}
            bagConfigs={bagConfigs}
            remainingByBasket={remainingByBasket}
            allocatedByBasket={allocatedByBasket}
            onAddBag={addBag}
            onRemoveBag={removeBag}
            onCloneBag={cloneBag}
            onUpdateBag={updateBag}
            onSave={saveBagConfiguration}
            onGeneratePDF={() => currentSaleId && handleGeneratePDF(currentSaleId)}
            isSaving={configureBagsMutation.isPending}
            currentSaleId={currentSaleId}
          />
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Vendite Avanzate</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSales ? (
                <div>Caricamento vendite...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numero</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Sacchi</TableHead>
                      <TableHead>Animali</TableHead>
                      <TableHead>Peso (kg)</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData?.sales?.map((sale: any) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">{sale.saleNumber}</TableCell>
                        <TableCell>{sale.customerName || "N/A"}</TableCell>
                        <TableCell>{format(new Date(sale.saleDate), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{sale.totalBags || 0}</TableCell>
                        <TableCell>{sale.totalAnimals?.toLocaleString() || 0}</TableCell>
                        <TableCell>{sale.totalWeight ? (sale.totalWeight / 1000).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}</TableCell>
                        <TableCell>
                          <Badge variant={
                            sale.status === 'completed' ? 'default' : 
                            sale.status === 'confirmed' ? 'secondary' : 'outline'
                          }>
                            {sale.status === 'completed' ? 'Completata' :
                             sale.status === 'confirmed' ? 'Confermata' : 'Bozza'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setCurrentSaleId(sale.id);
                                setActiveTab("config");
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Dettagli
                            </Button>
                            
                            {sale.totalBags > 0 && (
                              <>
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  onClick={() => handleGeneratePDF(sale.id)}
                                  className="bg-blue-600 hover:bg-blue-700"
                                  title="Genera PDF configurazione sacchi"
                                  data-testid={`button-generate-pdf-${sale.id}`}
                                >
                                  <FileText className="h-4 w-4 mr-1" />
                                  PDF
                                </Button>

                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleOpenReport(sale.id)}
                                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                                  title="Visualizza report vendita completo"
                                  data-testid={`button-report-pdf-${sale.id}`}
                                >
                                  <FileSpreadsheet className="h-4 w-4 mr-1" />
                                  Report
                                </Button>
                              </>
                            )}

                            {sale.pdfPath && (
                              <Button 
                                variant="secondary" 
                                size="sm"
                                onClick={() => handleDownloadPDF(sale.id)}
                                data-testid={`button-download-pdf-${sale.id}`}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            )}

                            {sale.status === 'confirmed' && sale.totalBags > 0 && (
                              <>
                                {sale.ddtStatus === 'nessuno' && (
                                  <Button 
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleGenerateDDT(sale.id)}
                                    disabled={generateDDTMutation.isPending}
                                    className="bg-green-600 hover:bg-green-700"
                                    title="Genera Documento di Trasporto"
                                    data-testid={`button-generate-ddt-${sale.id}`}
                                  >
                                    <Truck className="h-4 w-4 mr-1" />
                                    Genera DDT
                                  </Button>
                                )}

                                {sale.ddtStatus === 'locale' && sale.ddtId && (
                                  <>
                                    <Button 
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDownloadDDTPDF(sale.ddtId!)}
                                      className="border-blue-600 text-blue-600 hover:bg-blue-50"
                                      title="Scarica PDF DDT"
                                      data-testid={`button-download-ddt-pdf-${sale.id}`}
                                    >
                                      <FileText className="h-4 w-4 mr-1" />
                                      PDF DDT
                                    </Button>
                                    
                                    <Button 
                                      variant="default"
                                      size="sm"
                                      onClick={() => handleSendDDTToFIC(sale.ddtId!)}
                                      disabled={sendDDTToFICMutation.isPending}
                                      className="bg-purple-600 hover:bg-purple-700"
                                      title="Invia DDT a Fatture in Cloud"
                                      data-testid={`button-send-ddt-fic-${sale.id}`}
                                    >
                                      <Truck className="h-4 w-4 mr-1" />
                                      Invia a FIC
                                    </Button>
                                  </>
                                )}

                                {sale.ddtStatus === 'inviato' && sale.ddtId && (
                                  <>
                                    <Badge variant="default" className="bg-green-600">
                                      DDT Inviato
                                    </Badge>
                                    <Button 
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleDownloadDDTPDF(sale.ddtId!)}
                                      className="border-blue-600 text-blue-600 hover:bg-blue-50"
                                      title="Scarica PDF DDT"
                                      data-testid={`button-download-ddt-pdf-${sale.id}`}
                                    >
                                      <FileText className="h-4 w-4 mr-1" />
                                      PDF DDT
                                    </Button>
                                  </>
                                )}
                              </>
                            )}

                            {sale.status === 'draft' && (
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => handleUpdateStatus(sale.id, 'confirmed')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Conferma
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}