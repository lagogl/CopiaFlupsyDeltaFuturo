import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Package, FileText, Users, Calculator } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

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

  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      
      // Prepara configurazione sacchi automatica
      autoConfigureBags(response.operations);
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

  const autoConfigureBags = (operations: SaleOperation[]) => {
    // Raggruppa per taglia
    const sizeGroups = operations.reduce((groups, op) => {
      if (!groups[op.sizeCode]) {
        groups[op.sizeCode] = [];
      }
      groups[op.sizeCode].push(op);
      return groups;
    }, {} as Record<string, SaleOperation[]>);

    const configs: BagConfiguration[] = [];

    Object.entries(sizeGroups).forEach(([sizeCode, ops]) => {
      const totalAnimals = ops.reduce((sum, op) => sum + op.animalCount, 0);
      const totalWeight = ops.reduce((sum, op) => sum + op.totalWeight, 0);
      const avgAnimalsPerKg = ops.reduce((sum, op) => sum + op.animalsPerKg, 0) / ops.length;

      // Configurazione automatica: 1 sacco per taglia
      configs.push({
        sizeCode,
        animalCount: totalAnimals,
        originalWeight: totalWeight,
        weightLoss: 0,
        wastePercentage: 2, // 2% default
        originalAnimalsPerKg: avgAnimalsPerKg,
        allocations: ops.map(op => ({
          sourceOperationId: op.operationId,
          sourceBasketId: op.basketId,
          allocatedAnimals: op.animalCount,
          allocatedWeight: op.totalWeight,
          sourceAnimalsPerKg: op.animalsPerKg,
          sourceSizeCode: op.sizeCode
        }))
      });
    });

    setBagConfigs(configs);
  };

  const reallocateAnimals = (sizeIndex: number, animalsPerBag: number) => {
    const config = bagConfigs[sizeIndex];
    const totalAnimals = config.animalCount;
    const numBags = Math.ceil(totalAnimals / animalsPerBag);
    const remainder = totalAnimals % animalsPerBag;

    const newConfigs = [...bagConfigs];
    
    // Rimuovi configurazione esistente per questa taglia
    newConfigs.splice(sizeIndex, 1);

    // Crea nuovi sacchi
    for (let i = 0; i < numBags; i++) {
      let bagAnimals = animalsPerBag;
      
      // Gestione rimanenza secondo le regole del documento
      if (i === numBags - 1 && remainder > 0) {
        if (remainder < animalsPerBag / 2) {
          // Ridistribuisci la rimanenza
          const extraPerBag = Math.floor(remainder / numBags);
          bagAnimals = animalsPerBag + extraPerBag;
        } else {
          bagAnimals = remainder;
        }
      }

      const bagWeight = (bagAnimals / config.originalAnimalsPerKg) * 1000;

      newConfigs.push({
        sizeCode: config.sizeCode,
        animalCount: bagAnimals,
        originalWeight: bagWeight,
        weightLoss: 0,
        wastePercentage: config.wastePercentage,
        originalAnimalsPerKg: config.originalAnimalsPerKg,
        allocations: [{
          sourceOperationId: config.allocations[0].sourceOperationId,
          sourceBasketId: config.allocations[0].sourceBasketId,
          allocatedAnimals: bagAnimals,
          allocatedWeight: bagWeight,
          sourceAnimalsPerKg: config.originalAnimalsPerKg,
          sourceSizeCode: config.sizeCode
        }]
      });
    }

    setBagConfigs(newConfigs);
  };

  const handleWeightLoss = (bagIndex: number, weightLoss: number) => {
    const maxLoss = 1.5; // kg
    const actualLoss = Math.min(weightLoss, maxLoss);
    
    const newConfigs = [...bagConfigs];
    newConfigs[bagIndex].weightLoss = actualLoss;
    
    // Ricalcola animals per kg con limite 5%
    const newWeight = newConfigs[bagIndex].originalWeight - actualLoss;
    const newAnimalsPerKg = newConfigs[bagIndex].animalCount / (newWeight / 1000);
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
                        <TableCell>{op.totalWeight?.toFixed(2)}</TableCell>
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
                    onCheckedChange={setUseManualCustomer}
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
                  <Select onValueChange={(value) => {
                    const customer = customers?.customers?.find((c: Customer) => c.id === parseInt(value));
                    setSelectedCustomer(customer || null);
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona cliente dall'anagrafica" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers?.customers?.map((customer: Customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          {customer.name} - {customer.businessName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
          <Card>
            <CardHeader>
              <CardTitle>Configurazione Sacchi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {bagConfigs.map((config, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Sacco #{index + 1} - {config.sizeCode}</h4>
                    <Badge>{config.animalCount.toLocaleString()} animali</Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Peso Originale (kg)</Label>
                      <Input 
                        type="number" 
                        value={config.originalWeight.toFixed(2)} 
                        readOnly 
                      />
                    </div>
                    <div>
                      <Label>Perdita Peso (max 1.5kg)</Label>
                      <Input
                        type="number"
                        max="1.5"
                        step="0.1"
                        value={config.weightLoss}
                        onChange={(e) => handleWeightLoss(index, parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label>Peso Finale (kg)</Label>
                      <Input 
                        value={(config.originalWeight - config.weightLoss).toFixed(2)} 
                        readOnly 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>% Scarto</Label>
                      <Input
                        type="number"
                        value={config.wastePercentage}
                        onChange={(e) => {
                          const newConfigs = [...bagConfigs];
                          newConfigs[index].wastePercentage = parseFloat(e.target.value) || 0;
                          setBagConfigs(newConfigs);
                        }}
                      />
                    </div>
                    <div>
                      <Label>Animali/kg Finale</Label>
                      <Input 
                        value={(config.animalCount / ((config.originalWeight - config.weightLoss) / 1000)).toLocaleString()} 
                        readOnly 
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Note Sacco</Label>
                    <Input
                      placeholder="Note specifiche per questo sacco"
                      value={config.notes || ""}
                      onChange={(e) => {
                        const newConfigs = [...bagConfigs];
                        newConfigs[index].notes = e.target.value;
                        setBagConfigs(newConfigs);
                      }}
                    />
                  </div>
                </div>
              ))}

              <Button 
                onClick={saveBagConfiguration}
                disabled={configureBagsMutation.isPending}
                className="w-full"
              >
                {configureBagsMutation.isPending ? "Salvataggio..." : "Salva Configurazione"}
              </Button>
            </CardContent>
          </Card>
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
                        <TableCell>{sale.totalWeight?.toFixed(2) || 0}</TableCell>
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
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setCurrentSaleId(sale.id);
                              setActiveTab("config");
                            }}
                          >
                            Visualizza
                          </Button>
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