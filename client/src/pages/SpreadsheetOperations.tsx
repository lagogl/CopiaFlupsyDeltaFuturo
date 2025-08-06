import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { createDirectOperation } from "@/lib/operations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import useIsMobile from "@/hooks/use-mobile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save, RotateCcw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import "../styles/spreadsheet.css";

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
  // Dati aggiuntivi cesta
  currentSize?: string;
  averageWeight?: number;
  lastOperationDate?: string;
  lastOperationType?: string;
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
  const isMobile = useIsMobile();
  
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

  // Mutation per salvare operazioni - USA LA STESSA LOGICA DEL MODULO OPERATIONS STANDARD
  const saveOperationMutation = useMutation({
    mutationFn: async (operationData: any) => {
      console.log('🔄 Spreadsheet: Inviando operazione con route diretta:', operationData);
      
      // Recupera informazioni sulla cesta (stessa logica del modulo Operations)
      const basket = ((baskets as any[]) || []).find((b: any) => b.id === operationData.basketId);
      console.log('📦 Spreadsheet: Cestello trovato:', basket);
      
      // Determina il tipo di operazione
      const isPrimaAttivazione = operationData.type === 'prima-attivazione';
      const isVendita = operationData.type === 'vendita' || operationData.type === 'selezione-vendita';
      console.log('🔍 Spreadsheet: Tipo operazione:', { isPrimaAttivazione, isVendita, type: operationData.type });
      
      // Determina stato cestello
      const isBasketAvailable = basket?.state === 'available';
      const isBasketActive = basket?.state === 'active';
      console.log('📋 Spreadsheet: Stato cestello:', { isBasketAvailable, isBasketActive, state: basket?.state });
      
      try {
        // USA LA FUNZIONE createDirectOperation ESATTAMENTE COME IL MODULO OPERATIONS STANDARD
        const response = await createDirectOperation(operationData);
        console.log('✅ Spreadsheet: Operazione creata con successo:', response);
        return response;
      } catch (error) {
        console.error('❌ Spreadsheet: Errore durante createDirectOperation:', error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
      console.log('✅ Spreadsheet: Success callback - operazione salvata:', data);
      const basketId = variables.basketId;
      
      // Aggiorna lo stato della riga
      setOperationRows(prev => prev.map(row => 
        row.basketId === basketId 
          ? { ...row, status: 'saved', errors: [] }
          : row
      ));
      
      // Invalida le stesse cache del modulo Operations standard
      queryClient.invalidateQueries({ queryKey: ['/api/operations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/baskets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cycles'] });
      
      // Toast di successo
      const basket = ((baskets as any[]) || []).find((b: any) => b.id === basketId);
      toast({
        title: "Operazione completata",
        description: `Operazione registrata per cestello #${basket?.physicalNumber || basketId}`,
      });
    },
    onError: (error: any, variables) => {
      console.error('❌ Spreadsheet: Error callback:', error, variables);
      const basketId = variables.basketId;
      
      // Aggiorna lo stato della riga con errore
      setOperationRows(prev => prev.map(row => 
        row.basketId === basketId 
          ? { ...row, status: 'error', errors: [error.message || 'Errore durante il salvataggio'] }
          : row
      ));
      
      // Toast di errore
      toast({
        title: "Errore",
        description: error.message || "Si è verificato un errore durante la registrazione dell'operazione",
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
        const currentSize = ((sizes as any[]) || []).find((size: any) => size.id === lastOp?.sizeId)?.code || 'N/A';
        const averageWeight = lastOp?.animalCount && lastOp?.totalWeight ? 
          Math.round((lastOp.totalWeight / lastOp.animalCount) * 100) / 100 : 0;
        
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
          errors: [],
          // Dati aggiuntivi cesta
          currentSize,
          averageWeight,
          lastOperationDate: lastOp?.date,
          lastOperationType: lastOp?.type
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
    console.log('🔄 Spreadsheet: Tentativo salvataggio riga basketId:', basketId);
    
    const row = operationRows.find(r => r.basketId === basketId);
    if (!row) {
      console.error('❌ Spreadsheet: Riga non trovata per basketId:', basketId);
      return;
    }
    
    const errors = validateRow(row);
    if (errors.length > 0) {
      console.warn('⚠️ Spreadsheet: Errori validazione:', errors);
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
    if (!basket) {
      console.error('❌ Spreadsheet: Cestello non trovato per basketId:', basketId);
      return;
    }
    
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
    
    console.log('📦 Spreadsheet: Dati operazione preparati:', operationData);
    
    try {
      await saveOperationMutation.mutateAsync(operationData);
      console.log('✅ Spreadsheet: Riga salvata con successo');
    } catch (error) {
      console.error('❌ Spreadsheet: Errore salvataggio riga:', error);
    }
  };

  // Salva tutte le righe valide
  const saveAllRows = async () => {
    console.log('🔄 Spreadsheet: Inizio salvataggio di tutte le righe');
    console.log('📊 Spreadsheet: Righe totali:', operationRows.length);
    
    const validRows = operationRows.filter(row => {
      const errors = validateRow(row);
      if (errors.length > 0) {
        console.warn('⚠️ Spreadsheet: Riga non valida basketId:', row.basketId, 'errori:', errors);
      }
      return errors.length === 0;
    });
    
    console.log('✅ Spreadsheet: Righe valide trovate:', validRows.length);
    
    const editingRows = validRows.filter(row => row.status === 'editing');
    console.log('📝 Spreadsheet: Righe da salvare (editing):', editingRows.length);
    
    if (editingRows.length === 0) {
      console.log('ℹ️ Spreadsheet: Nessuna riga da salvare');
      toast({
        title: "Nessuna operazione da salvare",
        description: "Tutte le righe sono già salvate o contengono errori",
      });
      return;
    }
    
    for (const row of editingRows) {
      console.log('🔄 Spreadsheet: Salvando riga basketId:', row.basketId);
      await saveRow(row.basketId);
    }
    
    console.log('✅ Spreadsheet: Salvataggio completato');
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
    <div className="container mx-auto py-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Spreadsheet Operazioni</h1>
          <p className="text-sm text-gray-600">Inserimento rapido a foglio elettronico</p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
            {stats.saved}/{stats.total} salvate
          </div>
          {stats.errors > 0 && (
            <div className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded">
              {stats.errors} errori
            </div>
          )}
        </div>
      </div>

      {/* Controlli compatti */}
      <div className="bg-white border rounded-lg p-3 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <label className="text-xs font-medium text-gray-600 whitespace-nowrap">FLUPSY</label>
            <Select value={selectedFlupsyId?.toString() || ""} onValueChange={(value) => setSelectedFlupsyId(Number(value))}>
              <SelectTrigger className="w-40 h-8 text-xs">
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

          <div className="flex items-center gap-2 min-w-0">
            <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Tipo Operazione</label>
            <Select value={selectedOperationType} onValueChange={setSelectedOperationType}>
              <SelectTrigger className="w-32 h-8 text-xs">
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

          <div className="flex items-center gap-2 min-w-0">
            <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Data</label>
            <input
              type="date"
              value={operationDate}
              onChange={(e) => setOperationDate(e.target.value)}
              className="w-32 h-8 px-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={saveAllRows}
              className="h-8 px-3 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 transition-colors"
            >
              <Save className="h-3 w-3" />
              Salva Tutto
            </button>
            <button
              onClick={resetAllRows}
              className="h-8 px-2 text-xs border border-gray-300 rounded hover:bg-gray-50 flex items-center transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabella spreadsheet compatta */}
      {selectedFlupsyId && operationRows.length > 0 && (
        <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
          {/* Header compatto */}
          <div className="bg-gray-50 border-b px-3 py-2">
            <h3 className="font-medium text-sm">
              {((flupsys as any[]) || []).find((f: any) => f.id === selectedFlupsyId)?.name} - {operationTypeLabels[selectedOperationType as keyof typeof operationTypeLabels]}
            </h3>
          </div>
          
          <div className="relative">
            {/* Indicatore scroll mobile */}
            {isMobile && (
              <div className="absolute top-2 right-2 z-20 bg-blue-600 text-white text-xs px-2 py-1 rounded-full opacity-75 animate-pulse">
                ← Scorri →
              </div>
            )}
            
            <ScrollArea className="w-full">
              <div className="min-w-[1200px]">
                {/* Header tabella compatto con più colonne */}
                <div className="grid border-b bg-gray-100 text-xs font-medium text-gray-700 sticky top-0 z-10" style={{gridTemplateColumns: '80px 40px 60px 70px 60px 1fr 1fr 1fr 80px 80px 2fr 60px'}}>
                  <div className="px-2 py-1.5 border-r bg-white sticky left-0 z-20 shadow-r">Cesta</div>
                  <div className="px-1 py-1.5 border-r text-center">Stato</div>
                  <div className="px-1 py-1.5 border-r text-xs">Taglia</div>
                  <div className="px-1 py-1.5 border-r text-xs">P.Med(g)</div>
                  <div className="px-1 py-1.5 border-r text-xs">Ult.Op</div>
                  <div className="px-2 py-1.5 border-r">Animali</div>
                  <div className="px-2 py-1.5 border-r">Peso Tot (g)</div>
                  <div className="px-2 py-1.5 border-r">Anim/kg</div>
                  {selectedOperationType === 'misura' && (
                    <>
                      <div className="px-1 py-1.5 border-r">Vivi</div>
                      <div className="px-1 py-1.5 border-r">P.Camp</div>
                    </>
                  )}
                  <div className="px-2 py-1.5 border-r">Note</div>
                  <div className="px-1 py-1.5 text-center">Azioni</div>
                </div>

              {/* Righe dati compatte */}
              {operationRows.map((row, index) => (
                <div key={row.basketId}>
                  <div
                    className={`grid border-b text-xs hover:bg-gray-50 ${
                      row.status === 'error' ? 'bg-red-50' : 
                      row.status === 'saved' ? 'bg-green-50' : 
                      row.status === 'saving' ? 'bg-yellow-50' : 'bg-white'
                    }`}
                    style={{gridTemplateColumns: '80px 40px 60px 70px 60px 1fr 1fr 1fr 80px 80px 2fr 60px'}}
                  >
                    {/* Colonna cestello fissa */}
                    <div className="px-2 py-1 border-r flex items-center font-medium text-gray-700 bg-white sticky left-0 z-10 shadow-r">
                      #{row.physicalNumber}
                    </div>
                    
                    {/* Stato */}
                    <div className="px-1 py-1 border-r flex items-center justify-center">
                      {row.status === 'saving' && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                      {row.status === 'saved' && <CheckCircle2 className="h-3 w-3 text-green-600" />}
                      {row.status === 'error' && <AlertCircle className="h-3 w-3 text-red-600" />}
                      {row.status === 'editing' && <div className="h-2 w-2 rounded-full bg-blue-400" />}
                    </div>

                    {/* Info aggiuntive */}
                    <div className="px-1 py-1 border-r flex items-center text-xs text-gray-600">
                      <span className="truncate">{row.currentSize}</span>
                    </div>

                    <div className="px-1 py-1 border-r flex items-center text-xs text-gray-600">
                      <span className="truncate">{row.averageWeight}g</span>
                    </div>

                    <div className="px-1 py-1 border-r flex items-center text-xs text-gray-500">
                      <span className="truncate" title={`${row.lastOperationType} - ${row.lastOperationDate}`}>
                        {row.lastOperationDate ? new Date(row.lastOperationDate).toLocaleDateString('it-IT', {month: '2-digit', day: '2-digit'}) : '-'}
                      </span>
                    </div>

                    {/* Campi editabili */}
                    <div className="px-1 py-1 border-r">
                      <input
                        type="number"
                        value={row.animalCount || ''}
                        onChange={(e) => updateCell(row.basketId, 'animalCount', Number(e.target.value))}
                        className="w-full h-6 px-2 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded"
                        min="0"
                        placeholder="0"
                      />
                    </div>

                    <div className="px-1 py-1 border-r">
                      <input
                        type="number"
                        value={row.totalWeight || ''}
                        onChange={(e) => updateCell(row.basketId, 'totalWeight', Number(e.target.value))}
                        className="w-full h-6 px-2 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded"
                        min="0"
                        placeholder="0"
                      />
                    </div>

                    <div className="px-1 py-1 border-r">
                      <input
                        type="number"
                        value={row.animalsPerKg || ''}
                        onChange={(e) => updateCell(row.basketId, 'animalsPerKg', Number(e.target.value))}
                        className="w-full h-6 px-2 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded"
                        min="0"
                        placeholder="0"
                      />
                    </div>

                    {selectedOperationType === 'misura' && (
                      <>
                        <div className="px-1 py-1 border-r">
                          <input
                            type="number"
                            value={row.liveAnimals || ''}
                            onChange={(e) => updateCell(row.basketId, 'liveAnimals', Number(e.target.value))}
                            className="w-full h-6 px-1 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded"
                            min="0"
                            placeholder="0"
                          />
                        </div>

                        <div className="px-1 py-1 border-r">
                          <input
                            type="number"
                            value={row.sampleWeight || ''}
                            onChange={(e) => updateCell(row.basketId, 'sampleWeight', Number(e.target.value))}
                            className="w-full h-6 px-1 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded"
                            min="0"
                            placeholder="0"
                          />
                        </div>
                      </>
                    )}

                    <div className="px-1 py-1 border-r">
                      <input
                        value={row.notes}
                        onChange={(e) => updateCell(row.basketId, 'notes', e.target.value)}
                        className="w-full h-6 px-2 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded"
                        placeholder="Note..."
                      />
                    </div>

                    <div className="px-1 py-1 flex items-center justify-center">
                      <button
                        onClick={() => saveRow(row.basketId)}
                        disabled={row.status === 'saving' || row.status === 'saved'}
                        className="h-6 w-6 flex items-center justify-center text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                      >
                        {row.status === 'saving' ? (
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        ) : (
                          <Save className="h-2.5 w-2.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Errori inline compatti */}
                  {row.errors && row.errors.length > 0 && (
                    <div className="bg-red-50 border-b">
                      <div className="px-2 py-1 text-xs text-red-600 font-medium">
                        ⚠️ {row.errors.join(', ')}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}

      {/* Messaggio quando non ci sono cestelli */}
      {selectedFlupsyId && operationRows.length === 0 && (
        <div className="bg-gray-50 border border-dashed rounded-lg p-8 text-center">
          <p className="text-sm text-gray-500">
            Nessun cestello attivo trovato per il FLUPSY selezionato
          </p>
        </div>
      )}
    </div>
  );
}