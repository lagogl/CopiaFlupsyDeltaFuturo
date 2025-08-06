import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Zap,
  Clock,
  CheckCircle,
  ArrowRight,
  Waves,
  Target,
  BarChart3,
  Package,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
// Progress component inline

interface BasketData {
  id: number;
  physicalNumber: number;
  flupsyId: number;
  state: string;
  currentCycleId: number | null;
  flupsyName?: string;
  lastOperation?: any;
}

interface OperationFormData {
  basketId: number;
  cycleId: number;
  type: string;
  date: string;
  animalCount?: number;
  totalWeight?: number;
  sampleWeight?: number;
  liveAnimals?: number;
  deadCount?: number;
  animalsPerKg?: number;
  sizeId?: number;
  notes?: string;
  mortalityRate?: number;
  manualCountAdjustment?: boolean;
}

const operationTypes = [
  {
    id: 'misura',
    label: 'Misura',
    description: 'Operazione di misurazione biologica',
    icon: <BarChart3 className="h-5 w-5" />,
    color: 'bg-blue-500'
  },
  {
    id: 'peso',
    label: 'Peso',
    description: 'Pesatura per monitoraggio crescita',
    icon: <Package className="h-5 w-5" />,
    color: 'bg-green-500'
  },
  {
    id: 'pulizia',
    label: 'Pulizia',
    description: 'Operazione di pulizia cestelli',
    icon: <Waves className="h-5 w-5" />,
    color: 'bg-cyan-500'
  },
  {
    id: 'vagliatura',
    label: 'Vagliatura',
    description: 'Selezione e screening',
    icon: <Target className="h-5 w-5" />,
    color: 'bg-orange-500'
  }
];

export default function QuickWizard() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFlupsyId, setSelectedFlupsyId] = useState<number | null>(null);
  const [selectedOperationType, setSelectedOperationType] = useState<string>('');
  const [eligibleBaskets, setEligibleBaskets] = useState<BasketData[]>([]);
  const [currentBasketIndex, setCurrentBasketIndex] = useState(0);
  const [operationData, setOperationData] = useState<Record<number, OperationFormData>>({});
  const [completedBaskets, setCompletedBaskets] = useState<number[]>([]);

  // Fetch FLUPSY data
  const { data: flupsys } = useQuery({
    queryKey: ['/api/flupsys'],
  });

  // Fetch baskets based on selected FLUPSY
  const { data: baskets, refetch: refetchBaskets } = useQuery({
    queryKey: ['/api/baskets', selectedFlupsyId],
    enabled: !!selectedFlupsyId,
  });

  // Fetch operations for context
  const { data: operations } = useQuery({
    queryKey: ['/api/operations'],
  });

  // Fetch sizes for auto-selection
  const { data: sizes } = useQuery({
    queryKey: ['/api/sizes'],
  });

  // Submit operation mutation
  const submitOperationMutation = useMutation({
    mutationFn: (data: OperationFormData) => apiRequest({
      url: '/api/operations',
      method: 'POST',
      body: data
    }),
    onSuccess: (data, variables) => {
      setCompletedBaskets(prev => [...prev, variables.basketId]);
      toast({
        title: "Operazione salvata",
        description: `Operazione completata per cestello #${eligibleBaskets.find(b => b.id === variables.basketId)?.physicalNumber}`,
      });
      
      // Invalida cache
      queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cycles'] });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Errore durante il salvataggio",
        variant: "destructive"
      });
    }
  });

  // Filter eligible baskets based on operation type
  useEffect(() => {
    if (!baskets || !selectedOperationType) {
      setEligibleBaskets([]);
      return;
    }

    const filtered = baskets.filter((basket: any) => {
      // Solo cestelli attivi per la maggior parte delle operazioni
      if (selectedOperationType !== 'prima-attivazione' && basket.state !== 'active') {
        return false;
      }
      
      // Per prima attivazione, solo cestelli disponibili
      if (selectedOperationType === 'prima-attivazione' && basket.state !== 'available') {
        return false;
      }

      return true;
    });

    // Enrichi con dati ultima operazione
    const enriched = filtered.map((basket: any) => {
      const lastOp = operations?.find((op: any) => 
        op.basketId === basket.id && op.cycleId === basket.currentCycleId
      );
      
      return {
        ...basket,
        lastOperation: lastOp,
        flupsyName: flupsys?.find((f: any) => f.id === basket.flupsyId)?.name
      };
    });

    setEligibleBaskets(enriched);
    setCurrentBasketIndex(0);
  }, [baskets, selectedOperationType, operations, flupsys]);

  // Pre-populate operation data with intelligent defaults
  const initializeOperationData = (basket: BasketData) => {
    if (operationData[basket.id]) return; // Already initialized

    const lastOp = basket.lastOperation;
    const baseData: OperationFormData = {
      basketId: basket.id,
      cycleId: basket.currentCycleId!,
      type: selectedOperationType,
      date: new Date().toISOString(),
      deadCount: 0,
      manualCountAdjustment: false
    };

    // Intelligent pre-population based on operation type and history
    if (lastOp) {
      if (selectedOperationType === 'peso') {
        baseData.animalCount = lastOp.animalCount;
        baseData.animalsPerKg = lastOp.animalsPerKg;
      } else if (selectedOperationType === 'misura') {
        baseData.sizeId = lastOp.sizeId;
        baseData.liveAnimals = lastOp.liveAnimals || 50;
        baseData.sampleWeight = lastOp.sampleWeight || 100;
      }
    }

    setOperationData(prev => ({
      ...prev,
      [basket.id]: baseData
    }));
  };

  const currentBasket = eligibleBaskets[currentBasketIndex];
  const currentData = currentBasket ? operationData[currentBasket.id] : null;

  const updateCurrentData = (updates: Partial<OperationFormData>) => {
    if (!currentBasket) return;
    
    setOperationData(prev => ({
      ...prev,
      [currentBasket.id]: {
        ...prev[currentBasket.id],
        ...updates
      }
    }));
  };

  const nextBasket = () => {
    if (currentBasketIndex < eligibleBaskets.length - 1) {
      setCurrentBasketIndex(prev => prev + 1);
    }
  };

  const previousBasket = () => {
    if (currentBasketIndex > 0) {
      setCurrentBasketIndex(prev => prev - 1);
    }
  };

  const submitCurrentOperation = async () => {
    if (!currentBasket || !currentData) return;

    // Initialize data if not already done
    initializeOperationData(currentBasket);
    
    try {
      await submitOperationMutation.mutateAsync(currentData);
      
      // Move to next basket if available
      if (currentBasketIndex < eligibleBaskets.length - 1) {
        nextBasket();
      }
    } catch (error) {
      // Error handled by mutation
    }
  };

  const isFormValid = () => {
    if (!currentData) return false;
    
    switch (selectedOperationType) {
      case 'peso':
        return currentData.totalWeight && currentData.totalWeight > 0;
      case 'misura':
        return currentData.liveAnimals && currentData.sampleWeight && 
               currentData.liveAnimals > 0 && currentData.sampleWeight > 0;
      default:
        return true;
    }
  };

  // Initialize operation data when basket changes
  useEffect(() => {
    if (currentBasket) {
      initializeOperationData(currentBasket);
    }
  }, [currentBasket]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Waves className="h-5 w-5" />
                Seleziona FLUPSY
              </CardTitle>
              <CardDescription>
                Scegli l'unità FLUPSY su cui lavorare
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select onValueChange={(value) => setSelectedFlupsyId(Number(value))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleziona FLUPSY" />
                </SelectTrigger>
                <SelectContent>
                  {flupsys?.map((flupsy: any) => (
                    <SelectItem key={flupsy.id} value={flupsy.id.toString()}>
                      {flupsy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        );

      case 2:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Tipo di Operazione
              </CardTitle>
              <CardDescription>
                Seleziona il tipo di operazione da eseguire su tutti i cestelli idonei
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {operationTypes.map((type) => (
                  <Button
                    key={type.id}
                    variant={selectedOperationType === type.id ? "default" : "outline"}
                    className={`h-auto p-4 flex-col gap-2 ${
                      selectedOperationType === type.id ? type.color : ''
                    }`}
                    onClick={() => setSelectedOperationType(type.id)}
                  >
                    {type.icon}
                    <div className="text-center">
                      <div className="font-semibold">{type.label}</div>
                      <div className="text-xs opacity-70">{type.description}</div>
                    </div>
                  </Button>
                ))}
              </div>
              
              {eligibleBaskets.length > 0 && (
                <div className="mt-4 p-3 bg-green-50 rounded-md">
                  <p className="text-sm text-green-700">
                    <CheckCircle className="h-4 w-4 inline mr-1" />
                    Trovati {eligibleBaskets.length} cestelli idonei per l'operazione "{operationTypes.find(t => t.id === selectedOperationType)?.label}"
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 3:
        if (!currentBasket) {
          return (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">Nessun cestello disponibile per questa operazione</p>
              </CardContent>
            </Card>
          );
        }

        return (
          <div className="space-y-4">
            {/* Progress indicator */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    Cestello #{currentBasket.physicalNumber}
                  </CardTitle>
                  <Badge variant="outline">
                    {currentBasketIndex + 1} di {eligibleBaskets.length}
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all" 
                    style={{ width: `${((currentBasketIndex + 1) / eligibleBaskets.length) * 100}%` }}
                  />
                </div>
              </CardHeader>
            </Card>

            {/* Operation form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {operationTypes.find(t => t.id === selectedOperationType)?.icon}
                  {operationTypes.find(t => t.id === selectedOperationType)?.label}
                </CardTitle>
                <CardDescription>
                  FLUPSY: {currentBasket.flupsyName} | Ciclo: {currentBasket.currentCycleId}
                  {completedBaskets.includes(currentBasket.id) && (
                    <Badge className="ml-2 bg-green-500">Completato</Badge>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Form fields based on operation type */}
                {selectedOperationType === 'peso' && (
                  <>
                    <div>
                      <label className="text-sm font-medium">Peso Totale (grammi)</label>
                      <Input
                        type="number"
                        placeholder="Inserisci peso totale"
                        value={currentData?.totalWeight || ''}
                        onChange={(e) => updateCurrentData({ 
                          totalWeight: e.target.value ? Number(e.target.value) : undefined 
                        })}
                      />
                    </div>
                    {currentData?.animalCount && (
                      <div className="text-sm text-gray-600">
                        Conteggio animali: {currentData.animalCount.toLocaleString('it-IT')}
                        {currentData.animalsPerKg && (
                          <span className="ml-2">({currentData.animalsPerKg} animali/kg)</span>
                        )}
                      </div>
                    )}
                  </>
                )}

                {selectedOperationType === 'misura' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Animali Vivi</label>
                        <Input
                          type="number"
                          placeholder="50"
                          value={currentData?.liveAnimals || ''}
                          onChange={(e) => updateCurrentData({ 
                            liveAnimals: e.target.value ? Number(e.target.value) : undefined 
                          })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Peso Campione (g)</label>
                        <Input
                          type="number"
                          placeholder="100"
                          value={currentData?.sampleWeight || ''}
                          onChange={(e) => updateCurrentData({ 
                            sampleWeight: e.target.value ? Number(e.target.value) : undefined 
                          })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Animali Morti</label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={currentData?.deadCount || ''}
                        onChange={(e) => updateCurrentData({ 
                          deadCount: e.target.value ? Number(e.target.value) : 0 
                        })}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="text-sm font-medium">Note (opzionale)</label>
                  <Textarea
                    placeholder="Aggiungi note per questa operazione"
                    value={currentData?.notes || ''}
                    onChange={(e) => updateCurrentData({ notes: e.target.value })}
                    rows={2}
                  />
                </div>

                {/* Navigation and actions */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={previousBasket}
                    disabled={currentBasketIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Precedente
                  </Button>

                  <div className="flex gap-2">
                    <Button
                      onClick={submitCurrentOperation}
                      disabled={!isFormValid() || submitOperationMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {submitOperationMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-1" />
                      )}
                      Salva
                    </Button>

                    <Button
                      variant="outline"
                      onClick={nextBasket}
                      disabled={currentBasketIndex === eligibleBaskets.length - 1}
                    >
                      Successivo
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between text-sm">
                  <span>Progressi:</span>
                  <span>{completedBaskets.length} di {eligibleBaskets.length} completati</span>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceedToStep = (step: number) => {
    switch (step) {
      case 2:
        return selectedFlupsyId !== null;
      case 3:
        return selectedOperationType !== '' && eligibleBaskets.length > 0;
      default:
        return true;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Zap className="h-6 w-6 text-orange-500" />
          Inserimento Rapido
        </h1>
        <p className="text-gray-600">
          Wizard intelligente per inserimento rapido di operazioni multiple
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= step
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {step}
            </div>
            {step < 3 && (
              <div
                className={`w-12 h-0.5 ${
                  currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="mb-8">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
          disabled={currentStep === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Indietro
        </Button>

        <div className="flex gap-2">
          {currentStep < 3 && (
            <Button
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={!canProceedToStep(currentStep + 1)}
            >
              Avanti
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          
          {currentStep === 3 && completedBaskets.length === eligibleBaskets.length && eligibleBaskets.length > 0 && (
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                toast({
                  title: "Operazioni completate!",
                  description: `Tutte le ${completedBaskets.length} operazioni sono state salvate con successo.`,
                });
                // Reset wizard
                setCurrentStep(1);
                setSelectedFlupsyId(null);
                setSelectedOperationType('');
                setCompletedBaskets([]);
                setOperationData({});
              }}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Termina Wizard
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}