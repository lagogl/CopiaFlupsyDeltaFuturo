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
  // CAMPI OBBLIGATORI che devono essere compilati
  lotId: number | null;           // Lotto - OBBLIGATORIO per tutte le operazioni
  animalCount: number | null;
  totalWeight: number | null;
  animalsPerKg: number | null;
  deadCount: number | null;
  notes: string;
  // Campi specifici per misura (IDENTICI AL MODULO OPERATIONS)
  liveAnimals?: number | null;     // Animali vivi nel campione - OBBLIGATORIO per misura
  sampleWeight?: number | null;    // Peso campione in grammi - OBBLIGATORIO per misura
  totalSample?: number | null;     // Totale campione (liveAnimals + deadCount) - CALCOLATO
  sizeId?: number | null;          // Taglia - OBBLIGATORIO per operazione misura
  // Campi calcolati (IDENTICI AL MODULO OPERATIONS)
  mortalityRate?: number | null;
  status: 'editing' | 'saving' | 'saved' | 'error';
  errors?: string[];
  // Dati aggiuntivi cesta
  currentSize?: string;
  averageWeight?: number;
  lastOperationDate?: string;
  lastOperationType?: string;
}

// Tipi operazione per il modulo Spreadsheet (SOLO per ceste già attive - NO prima-attivazione)
const operationTypeLabels = {
  'peso': 'Peso',
  'misura': 'Misura',
  'pulizia': 'Pulizia',
  'trattamento': 'Trattamento',
  'vagliatura': 'Vagliatura',
  'vendita': 'Vendita',
  'selezione-vendita': 'Selezione Vendita',
  'cessazione': 'Cessazione'
  // NOTA: 'prima-attivazione' non è inclusa perché questo modulo è solo per ceste già attive
};

export default function SpreadsheetOperations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  
  const [selectedFlupsyId, setSelectedFlupsyId] = useState<number | null>(null);
  const [selectedOperationType, setSelectedOperationType] = useState<string>('misura');
  const [operationDate, setOperationDate] = useState(new Date().toISOString().split('T')[0]);
  const [operationRows, setOperationRows] = useState<OperationRowData[]>([]);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  
  // Stati per il nuovo sistema di editing inline
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editingForm, setEditingForm] = useState<{
    basketId: number;
    type: string;
    sampleWeight?: number;
    liveAnimals?: number;
    deadCount?: number;
    totalWeight?: number;
    animalCount?: number;
    notes?: string;
  } | null>(null);
  const [editingPosition, setEditingPosition] = useState<{top: number, left: number} | null>(null);

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
          // CAMPI OBBLIGATORI con valori predefiniti validi
          lotId: ((lots as any[]) || [])[0]?.id || null,  // Lotto predefinito (primo disponibile)
          animalCount: lastOp?.animalCount || 10000,
          totalWeight: lastOp?.totalWeight || 1000,
          animalsPerKg: lastOp?.animalsPerKg || 100,
          deadCount: 0, // Sempre inizializza a 0 per evitare errori null
          mortalityRate: 0, // Inizializza mortalità a 0
          notes: '',
          // Campi specifici per misura (IDENTICI AL MODULO OPERATIONS)
          liveAnimals: selectedOperationType === 'misura' ? 50 : null,  // Animali vivi nel campione
          sampleWeight: (selectedOperationType === 'misura' || selectedOperationType === 'peso') ? 100 : null,  // Peso campione in grammi
          totalSample: selectedOperationType === 'misura' ? 50 : null,  // Totale campione (calcolato automaticamente)
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
  // Gestione doppio click per editing inline
  const handleDoubleClick = (basketId: number, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const row = operationRows.find(r => r.basketId === basketId);
    
    if (!row) return;
    
    setEditingRow(basketId);
    setEditingPosition({
      top: rect.top + window.scrollY,
      left: rect.left + window.scrollX
    });
    
    // Inizializza form vuoto per creare una NUOVA operazione
    // (la riga originale non viene modificata)
    setEditingForm({
      basketId: row.basketId,
      type: selectedOperationType,
      sampleWeight: undefined,
      liveAnimals: undefined,
      deadCount: undefined,
      totalWeight: undefined,
      animalCount: undefined,
      notes: ''
    });
  };

  // Chiude il form di editing
  const closeEditingForm = () => {
    setEditingRow(null);
    setEditingForm(null);
    setEditingPosition(null);
  };

  // Salva i dati dal form di editing e crea nuova riga
  const saveEditingForm = async () => {
    if (!editingForm) return;

    const originalRow = operationRows.find(r => r.basketId === editingForm.basketId);
    if (!originalRow) return;

    // Crea una nuova riga con i dati compilati
    const newRow = { 
      ...originalRow,
      ...editingForm,
      type: selectedOperationType,
      date: operationDate, // Usa la data dal controllo in alto
      status: 'editing' as const,
      errors: [],
      isNewRow: true  // Marca questa come nuova riga modificabile
    };
    
    // Applica calcoli automatici per misura
    if (selectedOperationType === 'misura') {
      const liveAnimals = newRow.liveAnimals || 0;
      const deadCount = newRow.deadCount || 0;
      const sampleWeight = newRow.sampleWeight || 0;
      const totalWeight = newRow.totalWeight || 0;
      
      const totalSample = liveAnimals + deadCount;
      newRow.totalSample = totalSample;
      
      // Calcola animalCount (OBBLIGATORIO per il server) 
      // Per operazioni di misura, animalCount rappresenta il numero totale stimato di animali nel cestello
      if (sampleWeight > 0 && liveAnimals > 0 && totalWeight > 0) {
        // Stima il numero totale di animali: (animali vivi nel campione / peso campione) * peso totale cestello
        newRow.animalCount = Math.round((liveAnimals / sampleWeight) * totalWeight);
      }
      
      if (totalSample > 0) {
        newRow.mortalityRate = Math.round((deadCount / totalSample) * 100 * 100) / 100;
      }
      
      if (sampleWeight > 0 && liveAnimals > 0) {
        const animalsPerKgValue = Math.round((liveAnimals / sampleWeight) * 1000);
        newRow.animalsPerKg = animalsPerKgValue;
        
        // Calcola automaticamente la taglia usando la stessa logica del modulo Operazioni
        if (sizes && sizes.length > 0) {
          const { findSizeByAnimalsPerKg } = await import("@/lib/utils");
          const selectedSize = findSizeByAnimalsPerKg(animalsPerKgValue, sizes);
          if (selectedSize) {
            newRow.sizeId = selectedSize.id;
            console.log(`Taglia calcolata automaticamente: ${selectedSize.code} (ID: ${selectedSize.id})`);
          }
        }
      }
    }

    // Trova l'indice della riga originale
    const originalIndex = operationRows.findIndex(r => r.basketId === editingForm.basketId);
    
    // Inserisci la nuova riga subito dopo la riga originale
    setOperationRows(prev => {
      const newArray = [...prev];
      newArray.splice(originalIndex + 1, 0, newRow);
      return newArray;
    });

    // Salva automaticamente se abilitato
    if (autoSaveEnabled) {
      // Prepara i dati dell'operazione seguendo la stessa logica di saveRow
      const basket = eligibleBaskets.find(b => b.id === newRow.basketId);
      if (basket) {
        const isPrimaAttivazione = newRow.type === 'prima-attivazione';
        
        const operationData = {
          basketId: newRow.basketId,
          cycleId: isPrimaAttivazione ? null : basket.currentCycleId,
          type: newRow.type,
          date: newRow.date,
          sizeId: newRow.type === 'misura' ? newRow.sizeId : null,
          sgrId: null,
          lotId: newRow.lotId || ((lots as any[]) || [])[0]?.id || 1,
          animalCount: newRow.animalCount || null,
          totalWeight: newRow.totalWeight || null,
          animalsPerKg: newRow.animalsPerKg || null,
          deadCount: newRow.deadCount !== null && newRow.deadCount !== undefined ? newRow.deadCount : 0,
          mortalityRate: newRow.mortalityRate || null,
          notes: newRow.notes || null,
          ...(newRow.type === 'misura' && {
            liveAnimals: newRow.liveAnimals,
            sampleWeight: newRow.sampleWeight,
            totalSample: newRow.totalSample
          })
        };
        
        saveOperationMutation.mutate(operationData);
      }
    }

    closeEditingForm();
  };

  const updateCell = (basketId: number, field: keyof OperationRowData, value: any) => {
    setOperationRows(prev => prev.map(row => {
      if (row.basketId !== basketId) return row;
      
      const updatedRow = { 
        ...row, 
        [field]: value, 
        status: 'editing',
        errors: []
      };
      
      // Calcoli automatici per operazioni di misura (IDENTICI AL MODULO OPERATIONS)
      if (selectedOperationType === 'misura') {
        const deadCount = field === 'deadCount' ? value : row.deadCount || 0;
        const liveAnimals = field === 'liveAnimals' ? value : row.liveAnimals || 0;
        const sampleWeight = field === 'sampleWeight' ? value : row.sampleWeight || 0;
        
        // 1. Calcola totalSample (liveAnimals + deadCount)
        const totalSample = liveAnimals + deadCount;
        updatedRow.totalSample = totalSample;
        
        // 2. Calcola mortalityRate (deadCount / totalSample * 100)
        if (totalSample > 0) {
          const mortalityRate = (deadCount / totalSample) * 100;
          updatedRow.mortalityRate = Math.round(mortalityRate * 100) / 100; // Arrotonda a 2 decimali
        } else {
          updatedRow.mortalityRate = 0;
        }
        
        // 3. Calcola animalsPerKg (liveAnimals / sampleWeight * 1000)
        if (sampleWeight > 0 && liveAnimals > 0) {
          const animalsPerKg = Math.round((liveAnimals / sampleWeight) * 1000);
          if (!isNaN(animalsPerKg) && isFinite(animalsPerKg)) {
            updatedRow.animalsPerKg = animalsPerKg;
          }
        }
      }
      
      return updatedRow;
    }));
  };

  // Validazione di una riga seguendo lo schema database e le regole del modulo Operations
  const validateRow = (row: OperationRowData): string[] => {
    const errors: string[] = [];
    
    // Validazioni di base sempre richieste
    if (!row.basketId) {
      errors.push('Cestello richiesto');
    }
    
    if (!row.type) {
      errors.push('Tipo operazione richiesto');
    }
    
    // LOTTO SEMPRE OBBLIGATORIO per tutte le operazioni
    if (!row.lotId) {
      errors.push('Lotto obbligatorio');
    }
    
    // Verifica che il tipo sia valido secondo operationTypes enum
    const validTypes = ["prima-attivazione", "pulizia", "vagliatura", "trattamento", "misura", "vendita", "selezione-vendita", "cessazione", "peso", "selezione-origine"];
    if (row.type && !validTypes.includes(row.type)) {
      errors.push(`Tipo operazione non valido: ${row.type}`);
    }
    
    if (!row.date) {
      errors.push('Data richiesta');
    }
    
    // Validazione formato data (deve essere YYYY-MM-DD)
    if (row.date && !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
      errors.push('Formato data non valido (richiesto YYYY-MM-DD)');
    }
    
    // Validazioni specifiche per tipo operazione (come nel modulo Operations standard)
    if (row.type === 'peso') {
      if (!row.totalWeight || row.totalWeight <= 0) {
        errors.push('Peso totale richiesto per operazione peso');
      }
      if (!row.sampleWeight || row.sampleWeight <= 0) {
        errors.push('Peso campione richiesto per operazione peso');
      }
    }
    
    if (row.type === 'misura') {
      // VALIDAZIONI IDENTICHE AL MODULO OPERATIONS
      if (!row.sizeId) {
        errors.push('Taglia richiesta per operazione misura');
      }
      if (!row.sampleWeight || row.sampleWeight <= 0) {
        errors.push('Peso campione richiesto per operazione misura');
      }
      if (!row.liveAnimals || row.liveAnimals <= 0) {
        errors.push('Numero animali vivi richiesto per operazione misura');
      }
      if (!row.totalWeight || row.totalWeight <= 0) {
        errors.push('Peso totale richiesto per operazione misura');
      }
      if (row.deadCount === null || row.deadCount === undefined || row.deadCount < 0) {
        errors.push('Numero animali morti richiesto per operazione misura');
      }
    }
    
    // Validazione per prima-attivazione (richiede numero animali)
    if (row.type === 'prima-attivazione') {
      if (!row.animalCount || row.animalCount <= 0) {
        errors.push('Numero animali richiesto per prima attivazione');
      }
    }
    
    // Validazioni numeriche per campi opzionali
    if (row.animalCount && (row.animalCount < 0 || !Number.isInteger(row.animalCount))) {
      errors.push('Numero animali deve essere un intero positivo');
    }
    
    if (row.totalWeight && row.totalWeight < 0) {
      errors.push('Peso totale deve essere positivo');
    }
    
    if (row.animalsPerKg && (row.animalsPerKg < 0 || !Number.isInteger(row.animalsPerKg))) {
      errors.push('Animali per kg deve essere un intero positivo');
    }
    
    if (row.deadCount && (row.deadCount < 0 || !Number.isInteger(row.deadCount))) {
      errors.push('Numero morti deve essere un intero positivo');
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
    
    // Gestione speciale per operazioni di prima-attivazione (come nel modulo Operations standard)
    const isPrimaAttivazione = row.type === 'prima-attivazione';
    const isVendita = row.type === 'vendita' || row.type === 'selezione-vendita';
    const requiresLot = isPrimaAttivazione;
    
    // Prepara i dati dell'operazione seguendo ESATTAMENTE lo schema shared/schema.ts
    const operationData = {
      // CAMPI OBBLIGATORI secondo lo schema operations
      basketId: row.basketId,                                    // integer basket_id NOT NULL
      // cycleId è NOT NULL nello schema, ma il backend di direct-operations gestisce le eccezioni per prima-attivazione
      cycleId: isPrimaAttivazione ? null : basket.currentCycleId, // Per prima-attivazione, il backend crea il ciclo
      type: row.type,                                           // text type (enum operationTypes) NOT NULL 
      date: row.date,                                           // date NOT NULL (formato YYYY-MM-DD)
      
      // CAMPI OPZIONALI secondo lo schema operations  
      sizeId: row.type === 'misura' ? row.sizeId : null,       // integer size_id (nullable)
      sgrId: null,                                              // integer sgr_id (nullable)
      // lotId è sempre richiesto per operazioni su ceste attive (FISSO IL BUG: era null!)
      lotId: row.lotId || ((lots as any[]) || [])[0]?.id || 1, // integer lot_id (obbligatorio per operazioni normali)
      animalCount: row.animalCount || null,                     // integer animal_count (nullable)
      totalWeight: row.totalWeight || null,                     // real total_weight (nullable, in grams)
      animalsPerKg: row.animalsPerKg || null,                  // integer animals_per_kg (nullable)
      deadCount: row.deadCount !== null && row.deadCount !== undefined ? row.deadCount : 0, // integer dead_count (default 0)
      mortalityRate: row.mortalityRate || null,                 // real mortality_rate (nullable) - calcolato automaticamente o inserito manualmente
      notes: row.notes || null,                                 // text notes (nullable)
      
      // CAMPI NON INCLUSI (gestiti dal backend o omessi per insert)
      // id: omesso (auto-generato)
      // averageWeight: omesso (calcolato dal backend)
      // metadata: omesso (gestito dal backend per API esterne)
      
      // CAMPI SPECIFICI PER OPERAZIONE MISURA (IDENTICI AL MODULO OPERATIONS)
      ...(row.type === 'misura' && {
        liveAnimals: row.liveAnimals,     // Numero animali vivi nel campione
        sampleWeight: row.sampleWeight,   // Peso campione in grammi
        totalSample: row.totalSample      // Totale campione (liveAnimals + deadCount)
      })
    };
    
    console.log('📋 Spreadsheet: Schema-compliant operation data:', {
      ...operationData,
      isSpecialType: { isPrimaAttivazione, isVendita, requiresLot },
      basketState: basket.state,
      hasActiveCycle: basket.currentCycleId != null
    });
    
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
                {/* Header tabella compatto con TUTTE le colonne necessarie */}
                <div className="grid border-b bg-gray-100 text-xs font-medium text-gray-700 sticky top-0 z-10" style={{
                  gridTemplateColumns: selectedOperationType === 'misura' 
                    ? '80px 40px 60px 70px 60px 60px 80px 1fr 1fr 1fr 80px 80px 60px 70px 80px 2fr 60px' 
                    : selectedOperationType === 'peso'
                    ? '80px 40px 60px 70px 60px 60px 1fr 1fr 1fr 80px 2fr 60px'
                    : '80px 40px 60px 70px 60px 60px 1fr 1fr 1fr 2fr 60px'
                }}>
                  <div className="px-2 py-1.5 border-r bg-white sticky left-0 z-20 shadow-r">Cesta</div>
                  <div className="px-1 py-1.5 border-r text-center">Stato</div>
                  <div className="px-1 py-1.5 border-r text-xs">Taglia</div>
                  <div className="px-1 py-1.5 border-r text-xs">P.Med(g)</div>
                  <div className="px-1 py-1.5 border-r text-xs">Ult.Op</div>
                  {/* COLONNA LOTTO - OBBLIGATORIO */}
                  <div className="px-1 py-1.5 border-r text-xs bg-yellow-50">Lotto*</div>
                  {/* COLONNA TAGLIA - OBBLIGATORIO PER MISURA */}
                  {selectedOperationType === 'misura' && (
                    <div className="px-1 py-1.5 border-r text-xs bg-yellow-50">Taglia*</div>
                  )}
                  <div className="px-2 py-1.5 border-r">Animali</div>
                  <div className="px-2 py-1.5 border-r">Peso Tot (g)</div>
                  <div className="px-2 py-1.5 border-r">Anim/kg</div>
                  {/* PESO CAMPIONE per operazioni peso e misura */}
                  {(selectedOperationType === 'peso' || selectedOperationType === 'misura') && (
                    <div className="px-1 py-1.5 border-r bg-yellow-50">P.Camp*</div>
                  )}
                  {/* ANIMALI VIVI solo per misura */}
                  {selectedOperationType === 'misura' && (
                    <div className="px-1 py-1.5 border-r bg-yellow-50">Vivi*</div>
                  )}
                  {/* ANIMALI MORTI per misura */}
                  {selectedOperationType === 'misura' && (
                    <div className="px-1 py-1.5 border-r bg-yellow-50">Morti*</div>
                  )}
                  {/* TOTALE CAMPIONE per misura */}
                  {selectedOperationType === 'misura' && (
                    <div className="px-1 py-1.5 border-r">Tot.Camp.</div>
                  )}
                  {/* MORTALITÀ PERCENTUALE per misura */}
                  {selectedOperationType === 'misura' && (
                    <div className="px-1 py-1.5 border-r">Mortalità%</div>
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
                    style={{
                      gridTemplateColumns: selectedOperationType === 'misura' 
                        ? '80px 40px 60px 70px 60px 60px 80px 1fr 1fr 1fr 80px 80px 60px 70px 80px 2fr 60px' 
                        : selectedOperationType === 'peso'
                        ? '80px 40px 60px 70px 60px 60px 1fr 1fr 1fr 80px 2fr 60px'
                        : '80px 40px 60px 70px 60px 60px 1fr 1fr 1fr 2fr 60px'
                    }}
                  >
                    {/* Colonna cestello fissa */}
                    <div 
                      className="px-2 py-1 border-r flex items-center font-medium text-gray-700 bg-white sticky left-0 z-10 shadow-r cursor-pointer hover:bg-blue-50 transition-colors"
                      onDoubleClick={(e) => handleDoubleClick(row.basketId, e)}
                      title="Doppio click per modificare operazione"
                    >
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
                      <span className="truncate">
                        {(row as any).isNewRow && row.sizeId ? 
                          ((sizes as any[]) || []).find((size: any) => size.id === row.sizeId)?.code || row.currentSize 
                          : row.currentSize}
                      </span>
                    </div>

                    <div className="px-1 py-1 border-r flex items-center text-xs text-gray-600">
                      <span className="truncate">
                        {(row as any).isNewRow && row.animalCount && row.totalWeight ? 
                          `${Math.round((row.totalWeight / row.animalCount) * 100) / 100}g`
                          : `${row.averageWeight}g`}
                      </span>
                    </div>

                    <div className="px-1 py-1 border-r flex items-center text-xs text-gray-500">
                      <span className="truncate" title={`${row.lastOperationType} - ${row.lastOperationDate}`}>
                        {(row as any).isNewRow && row.date ? 
                          new Date(row.date).toLocaleDateString('it-IT', {month: '2-digit', day: '2-digit'})
                          : row.lastOperationDate ? new Date(row.lastOperationDate).toLocaleDateString('it-IT', {month: '2-digit', day: '2-digit'}) : '-'}
                      </span>
                    </div>

                    {/* CAMPO LOTTO - OBBLIGATORIO */}
                    <div className="px-1 py-1 border-r bg-yellow-50">
                      <select
                        value={row.lotId || ''}
                        onChange={(e) => updateCell(row.basketId, 'lotId', Number(e.target.value))}
                        className={`w-full h-6 px-1 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded ${
                          (row as any).isNewRow ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
                        }`}
                        disabled={!(row as any).isNewRow}
                        required
                      >
                        <option value="">-</option>
                        {((lots as any[]) || []).map((lot: any) => (
                          <option key={lot.id} value={lot.id}>
                            L{lot.id}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* CAMPO TAGLIA - OBBLIGATORIO PER MISURA */}
                    {selectedOperationType === 'misura' && (
                      <div className="px-1 py-1 border-r bg-yellow-50">
                        <select
                          value={row.sizeId || ''}
                          onChange={(e) => updateCell(row.basketId, 'sizeId', Number(e.target.value))}
                          className={`w-full h-6 px-1 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded ${
                            (row as any).isNewRow ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
                          }`}
                          disabled={!(row as any).isNewRow}
                          required
                        >
                          <option value="">-</option>
                          {((sizes as any[]) || []).map((size: any) => (
                            <option key={size.id} value={size.id}>
                              {size.code}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Campi editabili */}
                    <div className="px-1 py-1 border-r">
                      <input
                        type="number"
                        value={row.animalCount || ''}
                        onChange={(e) => updateCell(row.basketId, 'animalCount', Number(e.target.value))}
                        className={`w-full h-6 px-2 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded ${
                          (row as any).isNewRow ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
                        }`}
                        disabled={!(row as any).isNewRow}
                        min="0"
                        placeholder="0"
                      />
                    </div>

                    <div className="px-1 py-1 border-r">
                      <input
                        type="number"
                        value={row.totalWeight || ''}
                        onChange={(e) => updateCell(row.basketId, 'totalWeight', Number(e.target.value))}
                        className={`w-full h-6 px-2 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded ${
                          (row as any).isNewRow ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
                        }`}
                        disabled={!(row as any).isNewRow}
                        min="0"
                        placeholder="0"
                      />
                    </div>

                    <div className="px-1 py-1 border-r">
                      <input
                        type="number"
                        value={row.animalsPerKg || ''}
                        onChange={(e) => updateCell(row.basketId, 'animalsPerKg', Number(e.target.value))}
                        className={`w-full h-6 px-2 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded ${
                          (row as any).isNewRow ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
                        }`}
                        disabled={!(row as any).isNewRow}
                        min="0"
                        placeholder="0"
                      />
                    </div>

                    {/* PESO CAMPIONE per operazioni peso e misura */}
                    {(selectedOperationType === 'peso' || selectedOperationType === 'misura') && (
                      <div className="px-1 py-1 border-r bg-yellow-50">
                        <input
                          type="number"
                          value={row.sampleWeight || ''}
                          onChange={(e) => updateCell(row.basketId, 'sampleWeight', Number(e.target.value))}
                          className={`w-full h-6 px-1 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded ${
                            (row as any).isNewRow ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
                          }`}
                          disabled={!(row as any).isNewRow}
                          min="0"
                          placeholder="0"
                          required
                        />
                      </div>
                    )}

                    {/* ANIMALI VIVI solo per misura */}
                    {selectedOperationType === 'misura' && (
                      <div className="px-1 py-1 border-r bg-yellow-50">
                        <input
                          type="number"
                          value={row.liveAnimals || ''}
                          onChange={(e) => updateCell(row.basketId, 'liveAnimals', Number(e.target.value))}
                          className={`w-full h-6 px-1 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded ${
                            (row as any).isNewRow ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
                          }`}
                          disabled={!(row as any).isNewRow}
                          min="0"
                          placeholder="0"
                          required
                        />
                      </div>
                    )}

                    {/* ANIMALI MORTI per misura */}
                    {selectedOperationType === 'misura' && (
                      <div className="px-1 py-1 border-r bg-yellow-50">
                        <input
                          type="number"
                          value={row.deadCount !== null && row.deadCount !== undefined ? row.deadCount : 0}
                          onChange={(e) => updateCell(row.basketId, 'deadCount', Number(e.target.value) || 0)}
                          className={`w-full h-6 px-1 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded ${
                            (row as any).isNewRow ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
                          }`}
                          disabled={!(row as any).isNewRow}
                          min="0"
                          placeholder="0"
                          required
                        />
                      </div>
                    )}

                    {/* TOTALE CAMPIONE per misura */}
                    {selectedOperationType === 'misura' && (
                      <div className="px-1 py-1 border-r">
                        <input
                          type="number"
                          value={row.totalSample || ''}
                          readOnly
                          className="w-full h-6 px-1 text-xs border-0 bg-gray-100 text-gray-600 rounded"
                          placeholder="Auto"
                        />
                      </div>
                    )}

                    {/* MORTALITÀ PERCENTUALE per misura */}
                    {selectedOperationType === 'misura' && (
                      <div className="px-1 py-1 border-r">
                        <input
                          type="number"
                          value={row.mortalityRate ? row.mortalityRate.toFixed(2) : ''}
                          readOnly
                          className="w-full h-6 px-1 text-xs border-0 bg-gray-100 text-gray-600 rounded"
                          placeholder="Auto"
                        />
                      </div>
                    )}

                    <div className="px-1 py-1 border-r">
                      <input
                        value={row.notes}
                        onChange={(e) => updateCell(row.basketId, 'notes', e.target.value)}
                        className={`w-full h-6 px-2 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded ${
                          (row as any).isNewRow ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
                        }`}
                        disabled={!(row as any).isNewRow}
                        placeholder="Note..."
                      />
                    </div>

                    <div className="px-1 py-1 flex items-center justify-center">
                      <button
                        onClick={() => saveRow(row.basketId)}
                        disabled={row.status === 'saving' || row.status === 'saved' || !(row as any).isNewRow}
                        className={`h-6 w-6 flex items-center justify-center text-xs rounded transition-colors ${
                          (row as any).isNewRow 
                            ? 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed' 
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
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

      {/* Form popup per editing inline */}
      {editingRow !== null && editingForm && editingPosition && (
        <>
          {/* Overlay per chiudere il popup */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={closeEditingForm}
          />
          
          {/* Form popup */}
          <div 
            className="fixed z-50 bg-white rounded-lg shadow-xl border-2 border-blue-500 p-4 min-w-96"
            style={{ 
              top: editingPosition.top - 50, 
              left: Math.min(editingPosition.left, window.innerWidth - 400)
            }}
          >
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Modifica Operazione - Cestello {editingForm.basketId}
              </h3>
              <p className="text-sm text-gray-600">
                Causale: <span className="font-medium">{selectedOperationType}</span>
              </p>
            </div>

            <div className="space-y-3">
              {/* Campi specifici per tipo di operazione */}
              {selectedOperationType === 'misura' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Peso campione (g) *
                    </label>
                    <input
                      type="number"
                      value={editingForm.sampleWeight || ''}
                      onChange={(e) => setEditingForm({...editingForm, sampleWeight: Number(e.target.value)})}
                      className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Animali vivi *
                      </label>
                      <input
                        type="number"
                        value={editingForm.liveAnimals || ''}
                        onChange={(e) => setEditingForm({...editingForm, liveAnimals: Number(e.target.value)})}
                        className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Animali morti *
                      </label>
                      <input
                        type="number"
                        value={editingForm.deadCount !== undefined ? editingForm.deadCount : ''}
                        onChange={(e) => setEditingForm({...editingForm, deadCount: Number(e.target.value)})}
                        className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Peso totale (g) *
                    </label>
                    <input
                      type="number"
                      value={editingForm.totalWeight || ''}
                      onChange={(e) => setEditingForm({...editingForm, totalWeight: Number(e.target.value)})}
                      className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      required
                    />
                  </div>
                </>
              )}

              {selectedOperationType === 'peso' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Numero animali *
                      </label>
                      <input
                        type="number"
                        value={editingForm.animalCount || ''}
                        onChange={(e) => setEditingForm({...editingForm, animalCount: Number(e.target.value)})}
                        className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Peso campione (g) *
                      </label>
                      <input
                        type="number"
                        value={editingForm.sampleWeight || ''}
                        onChange={(e) => setEditingForm({...editingForm, sampleWeight: Number(e.target.value)})}
                        className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Peso totale (g) *
                    </label>
                    <input
                      type="number"
                      value={editingForm.totalWeight || ''}
                      onChange={(e) => setEditingForm({...editingForm, totalWeight: Number(e.target.value)})}
                      className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                      required
                    />
                  </div>
                </>
              )}

              {(selectedOperationType === 'pulizia' || selectedOperationType === 'trattamento' || selectedOperationType === 'vagliatura') && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Numero animali *
                  </label>
                  <input
                    type="number"
                    value={editingForm.animalCount || ''}
                    onChange={(e) => setEditingForm({...editingForm, animalCount: Number(e.target.value)})}
                    className="w-full h-8 px-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Note
                </label>
                <textarea
                  value={editingForm.notes || ''}
                  onChange={(e) => setEditingForm({...editingForm, notes: e.target.value})}
                  className="w-full h-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Inserisci note opzionali..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-4 pt-3 border-t border-gray-200">
              <button
                onClick={closeEditingForm}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Annulla
              </button>
              <button
                onClick={saveEditingForm}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Salva e Aggiungi Riga
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}