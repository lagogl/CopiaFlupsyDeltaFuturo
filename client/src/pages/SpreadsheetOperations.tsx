import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, RotateCcw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface BasketData {
  id: number;
  physicalNumber: number;
  flupsyId: number;
  currentCycleId: number | null;
  state: string;
  flupsyName?: string;
  cycleStartDate?: string;
  lastOperation?: {
    type: string;
    date: string;
    animalCount?: number;
    totalWeight?: number;
    animalsPerKg?: number;
  };
}

interface OperationRowData {
  basketId: number;
  physicalNumber: number;
  type: string;
  date: string;
  animalCount: number | null;
  totalWeight: number | null;
  animalsPerKg: number | null;
  deadCount: number | null;
  notes: string;
  // Campi specifici per misura
  liveAnimals?: number | null;
  sampleWeight?: number | null;
  sizeId?: number | null;
  // Campi calcolati
  mortalityRate?: number | null;
  status: 'editing' | 'saving' | 'saved' | 'error';
  errors?: string[];
}

const operationTypeLabels = {
  'peso': 'Peso',
  'misura': 'Misura',
  'pulizia': 'Pulizia',
  'trattamento': 'Trattamento',
  'vagliatura': 'Vagliatura'
};

export default function SpreadsheetOperations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedFlupsyId, setSelectedFlupsyId] = useState<number | null>(null);
  const [selectedOperationType, setSelectedOperationType] = useState<string>('peso');
  const [operationDate, setOperationDate] = useState(new Date().toISOString().split('T')[0]);
  const [operationRows, setOperationRows] = useState<OperationRowData[]>([]);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  // Query per recuperare dati
  const { data: flupsys } = useQuery({
    queryKey: ['/api/flupsys'],
  });

  const { data: baskets } = useQuery({
    queryKey: ['/api/baskets'],
  });

  const { data: operations } = useQuery({
    queryKey: ['/api/operations'],
  });

  const { data: sizes } = useQuery({
    queryKey: ['/api/sizes'],
  });

  const { data: lots } = useQuery({
    queryKey: ['/api/lots'],
  });

  // Mutation per salvare operazioni
  const saveOperationMutation = useMutation({
    mutationFn: async (operationData: any) => {
      return apiRequest({
        url: '/api/operations',
        method: 'POST',
        body: operationData
      });
    },
    onSuccess: (data, variables) => {
      const basketId = variables.basketId;
      setOperationRows(prev => prev.map(row => 
        row.basketId === basketId 
          ? { ...row, status: 'saved', errors: [] }
          : row
      ));
      
      // Invalida cache
      queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      
      toast({
        title: "Operazione salvata",
        description: `Cestello #${((operations as any[]) || []).find((op: any) => op.basketId === basketId)?.physicalNumber || basketId}`,
      });
    },
    onError: (error: any, variables) => {
      const basketId = variables.basketId;
      setOperationRows(prev => prev.map(row => 
        row.basketId === basketId 
          ? { ...row, status: 'error', errors: [error.message || 'Errore sconosciuto'] }
          : row
      ));
      
      toast({
        title: "Errore salvataggio",
        description: error.message || "Errore durante il salvataggio",
        variant: "destructive"
      });
    }
  });

  // Prepara i dati dei cestelli per il FLUPSY selezionato
  const eligibleBaskets: BasketData[] = ((baskets as any[]) || [])
    .filter((basket: any) => 
      basket.flupsyId === selectedFlupsyId && 
      basket.state === 'active' && 
      basket.currentCycleId
    )
    .map((basket: any) => {
      const flupsy = ((flupsys as any[]) || []).find((f: any) => f.id === basket.flupsyId);
      const lastOp = ((operations as any[]) || []).filter((op: any) => op.basketId === basket.id)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      return {
        id: basket.id,
        physicalNumber: basket.physicalNumber,
        flupsyId: basket.flupsyId,
        currentCycleId: basket.currentCycleId,
        state: basket.state,
        flupsyName: flupsy?.name,
        lastOperation: lastOp
      };
    })
    .sort((a, b) => a.physicalNumber - b.physicalNumber);

  // Inizializza le righe quando cambiano FLUPSY, tipo operazione o data
  useEffect(() => {
    if (selectedFlupsyId && selectedOperationType && eligibleBaskets.length > 0) {
      const newRows: OperationRowData[] = eligibleBaskets.map(basket => {
        const lastOp = basket.lastOperation;
        
        return {
          basketId: basket.id,
          physicalNumber: basket.physicalNumber,
          type: selectedOperationType,
          date: operationDate,
          animalCount: lastOp?.animalCount || 10000,
          totalWeight: lastOp?.totalWeight || 1000,
          animalsPerKg: lastOp?.animalsPerKg || 100,
          deadCount: 0,
          notes: '',
          // Campi specifici per misura
          liveAnimals: selectedOperationType === 'misura' ? 50 : null,
          sampleWeight: selectedOperationType === 'misura' ? 100 : null,
          sizeId: selectedOperationType === 'misura' ? ((sizes as any[]) || [])[0]?.id : null,
          status: 'editing',
          errors: []
        };
      });
      
      setOperationRows(newRows);
    }
  }, [selectedFlupsyId, selectedOperationType, operationDate, eligibleBaskets.length, sizes]);

  // Aggiorna una singola cella
  const updateCell = (basketId: number, field: keyof OperationRowData, value: any) => {
    setOperationRows(prev => prev.map(row => 
      row.basketId === basketId 
        ? { 
            ...row, 
            [field]: value, 
            status: 'editing',
            errors: []
          }
        : row
    ));
  };

  // Validazione di una riga
  const validateRow = (row: OperationRowData): string[] => {
    const errors: string[] = [];
    
    if (!row.animalCount || row.animalCount <= 0) {
      errors.push('Numero animali richiesto');
    }
    
    if (row.type === 'peso' && (!row.totalWeight || row.totalWeight <= 0)) {
      errors.push('Peso totale richiesto per operazione peso');
    }
    
    if (row.type === 'misura' && (!row.liveAnimals || row.liveAnimals <= 0)) {
      errors.push('Animali vivi campione richiesto per operazione misura');
    }
    
    if (row.type === 'misura' && (!row.sampleWeight || row.sampleWeight <= 0)) {
      errors.push('Peso campione richiesto per operazione misura');
    }
    
    return errors;
  };

  // Salva una singola riga
  const saveRow = async (basketId: number) => {
    const row = operationRows.find(r => r.basketId === basketId);
    if (!row) return;
    
    const errors = validateRow(row);
    if (errors.length > 0) {
      setOperationRows(prev => prev.map(r => 
        r.basketId === basketId 
          ? { ...r, status: 'error', errors }
          : r
      ));
      return;
    }
    
    setOperationRows(prev => prev.map(r => 
      r.basketId === basketId 
        ? { ...r, status: 'saving', errors: [] }
        : r
    ));
    
    const basket = eligibleBaskets.find(b => b.id === basketId);
    if (!basket) return;
    
    const operationData = {
      basketId: row.basketId,
      cycleId: basket.currentCycleId,
      flupsyId: basket.flupsyId,
      lotId: ((lots as any[]) || [])[0]?.id || 1,
      type: row.type,
      date: row.date,
      animalCount: row.animalCount,
      totalWeight: row.totalWeight,
      animalsPerKg: row.animalsPerKg,
      deadCount: row.deadCount || 0,
      notes: row.notes || '',
      // Campi specifici per misura
      ...(row.type === 'misura' && {
        liveAnimals: row.liveAnimals,
        sampleWeight: row.sampleWeight,
        sizeId: row.sizeId
      })
    };
    
    await saveOperationMutation.mutateAsync(operationData);
  };

  // Salva tutte le righe valide
  const saveAllRows = async () => {
    const validRows = operationRows.filter(row => validateRow(row).length === 0);
    
    for (const row of validRows) {
      if (row.status === 'editing') {
        await saveRow(row.basketId);
      }
    }
  };

  // Reset di tutte le righe
  const resetAllRows = () => {
    setOperationRows(prev => prev.map(row => ({
      ...row,
      status: 'editing',
      errors: []
    })));
  };

  // Calcola statistiche
  const stats = {
    total: operationRows.length,
    editing: operationRows.filter(r => r.status === 'editing').length,
    saving: operationRows.filter(r => r.status === 'saving').length,
    saved: operationRows.filter(r => r.status === 'saved').length,
    errors: operationRows.filter(r => r.status === 'error').length
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Spreadsheet Operazioni</h1>
          <p className="text-muted-foreground">Inserimento rapido a foglio elettronico</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {stats.saved}/{stats.total} salvate
          </Badge>
          {stats.errors > 0 && (
            <Badge variant="destructive">
              {stats.errors} errori
            </Badge>
          )}
        </div>
      </div>

      {/* Controlli principali */}
      <Card>
        <CardHeader>
          <CardTitle>Configurazione</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">FLUPSY</label>
              <Select value={selectedFlupsyId?.toString() || ""} onValueChange={(value) => setSelectedFlupsyId(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona FLUPSY" />
                </SelectTrigger>
                <SelectContent>
                  {((flupsys as any[]) || []).map((flupsy: any) => (
                    <SelectItem key={flupsy.id} value={flupsy.id.toString()}>
                      {flupsy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Tipo Operazione</label>
              <Select value={selectedOperationType} onValueChange={setSelectedOperationType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(operationTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Data</label>
              <Input
                type="date"
                value={operationDate}
                onChange={(e) => setOperationDate(e.target.value)}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={saveAllRows} className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                Salva Tutto
              </Button>
              <Button onClick={resetAllRows} variant="outline">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabella spreadsheet */}
      {selectedFlupsyId && operationRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {((flupsys as any[]) || []).find((f: any) => f.id === selectedFlupsyId)?.name} - {operationTypeLabels[selectedOperationType as keyof typeof operationTypeLabels]}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="w-full">
              <div className="min-w-[800px]">
                {/* Header tabella */}
                <div className="grid grid-cols-12 gap-2 p-2 bg-muted rounded-t-lg font-medium text-sm">
                  <div className="col-span-1">Cestello</div>
                  <div className="col-span-1">Stato</div>
                  <div className="col-span-2">Animali</div>
                  <div className="col-span-2">Peso Tot (g)</div>
                  <div className="col-span-2">Anim/kg</div>
                  {selectedOperationType === 'misura' && (
                    <>
                      <div className="col-span-1">Vivi</div>
                      <div className="col-span-1">Peso Camp</div>
                    </>
                  )}
                  <div className="col-span-2">Note</div>
                  <div className="col-span-1">Azioni</div>
                </div>

                {/* Righe dati */}
                {operationRows.map((row, index) => (
                  <div
                    key={row.basketId}
                    className={`grid grid-cols-12 gap-2 p-2 border-b ${
                      row.status === 'error' ? 'bg-red-50' : 
                      row.status === 'saved' ? 'bg-green-50' : 
                      row.status === 'saving' ? 'bg-yellow-50' : 'bg-white'
                    }`}
                  >
                    <div className="col-span-1 flex items-center font-medium">
                      #{row.physicalNumber}
                    </div>
                    
                    <div className="col-span-1 flex items-center">
                      {row.status === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />}
                      {row.status === 'saved' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      {row.status === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
                      {row.status === 'editing' && <div className="h-4 w-4 rounded-full bg-blue-200" />}
                    </div>

                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={row.animalCount || ''}
                        onChange={(e) => updateCell(row.basketId, 'animalCount', Number(e.target.value))}
                        className="h-8"
                        min="0"
                      />
                    </div>

                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={row.totalWeight || ''}
                        onChange={(e) => updateCell(row.basketId, 'totalWeight', Number(e.target.value))}
                        className="h-8"
                        min="0"
                      />
                    </div>

                    <div className="col-span-2">
                      <Input
                        type="number"
                        value={row.animalsPerKg || ''}
                        onChange={(e) => updateCell(row.basketId, 'animalsPerKg', Number(e.target.value))}
                        className="h-8"
                        min="0"
                      />
                    </div>

                    {selectedOperationType === 'misura' && (
                      <>
                        <div className="col-span-1">
                          <Input
                            type="number"
                            value={row.liveAnimals || ''}
                            onChange={(e) => updateCell(row.basketId, 'liveAnimals', Number(e.target.value))}
                            className="h-8"
                            min="0"
                          />
                        </div>

                        <div className="col-span-1">
                          <Input
                            type="number"
                            value={row.sampleWeight || ''}
                            onChange={(e) => updateCell(row.basketId, 'sampleWeight', Number(e.target.value))}
                            className="h-8"
                            min="0"
                          />
                        </div>
                      </>
                    )}

                    <div className="col-span-2">
                      <Input
                        value={row.notes}
                        onChange={(e) => updateCell(row.basketId, 'notes', e.target.value)}
                        className="h-8"
                        placeholder="Note..."
                      />
                    </div>

                    <div className="col-span-1">
                      <Button
                        size="sm"
                        onClick={() => saveRow(row.basketId)}
                        disabled={row.status === 'saving' || row.status === 'saved'}
                        className="h-8 w-full"
                      >
                        {row.status === 'saving' ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                      </Button>
                    </div>

                    {/* Mostra errori */}
                    {row.errors && row.errors.length > 0 && (
                      <div className="col-span-12 text-xs text-red-600 mt-1">
                        {row.errors.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Messaggio quando non ci sono cestelli */}
      {selectedFlupsyId && operationRows.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              Nessun cestello attivo trovato per il FLUPSY selezionato
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}