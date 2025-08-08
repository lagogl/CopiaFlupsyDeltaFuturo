import React, { useState, useEffect, useRef } from "react";
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

// Tipi operazione per il modulo Spreadsheet (SOLO Misura e Peso)
const operationTypeOptions = [
  { value: 'misura', label: 'Misura', color: 'blue', icon: '📏' },
  { value: 'peso', label: 'Peso', color: 'green', icon: '⚖️' }
];

export default function SpreadsheetOperations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  
  const [selectedFlupsyId, setSelectedFlupsyId] = useState<number | null>(null);
  const [selectedOperationType, setSelectedOperationType] = useState<string>('misura');
  const [operationDate, setOperationDate] = useState(new Date().toISOString().split('T')[0]);
  const [operationRows, setOperationRows] = useState<OperationRowData[]>([]);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  
  // Stati per sistema Undo e salvataggio singolo
  const [originalRows, setOriginalRows] = useState<OperationRowData[]>([]);  // Backup per Undo
  const [savedRows, setSavedRows] = useState<Set<number>>(new Set());       // IDs righe già salvate
  const [sessionId] = useState<string>(() => Date.now().toString());       // ID sessione per tracking
  
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
    date?: string;
    lotId?: number;
  } | null>(null);
  const [editingPosition, setEditingPosition] = useState<{top: number, left: number} | null>(null);

  // Validazione campi obbligatori per il form popup
  const validateEditingForm = (): boolean => {
    if (!editingForm) return false;
    
    // Campi sempre obbligatori
    if (!editingForm.basketId || !editingForm.type || !editingForm.date || !editingForm.lotId) {
      return false;
    }
    
    // Validazioni specifiche per tipo operazione
    if (selectedOperationType === 'misura') {
      // Per misura: peso campione, animali vivi, morti, peso totale sono obbligatori
      if (!editingForm.sampleWeight || editingForm.sampleWeight <= 0) return false;
      if (!editingForm.liveAnimals || editingForm.liveAnimals <= 0) return false;
      if (editingForm.deadCount === null || editingForm.deadCount === undefined) return false;
      if (!editingForm.totalWeight || editingForm.totalWeight <= 0) return false;
    }
    
    if (selectedOperationType === 'peso') {
      // Per peso: solo peso totale è obbligatorio (numero animali viene preso dall'operazione precedente)
      if (!editingForm.totalWeight || editingForm.totalWeight <= 0) return false;
    }
    
    if (['pulizia', 'trattamento', 'vagliatura'].includes(selectedOperationType)) {
      // Per altre operazioni: almeno il numero animali è obbligatorio
      if (!editingForm.animalCount || editingForm.animalCount <= 0) return false;
    }
    
    return true;
  };

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
      
      // Aggiorna lo stato della riga e traccia come salvata
      setOperationRows(prev => prev.map(row => 
        row.basketId === basketId 
          ? { ...row, status: 'saved', errors: [] }
          : row
      ));
      
      // Segna la riga come già salvata singolarmente
      setSavedRows(prev => new Set(prev).add(basketId));
      
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
        const sizesArray = Array.isArray(sizes) ? sizes : [];
        
        // Calcola taglia corrente basandosi sulla logica del modulo Inventory
        const basketOperations = ((operations as any[]) || []).filter((op: any) => op.basketId === basket.id);
        const lastOperationWithAnimalsPerKg = basketOperations
          .filter((op: any) => op.animalsPerKg && op.animalsPerKg > 0)
          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        
        // Funzione per trovare la taglia basata su animalsPerKg (stessa logica di Inventory)
        const findSizeFromAnimalsPerKg = (animalsPerKg: number): any => {
          return sizesArray.find((size: any) => 
            size.minAnimalsPerKg !== null && 
            size.maxAnimalsPerKg !== null &&
            animalsPerKg >= size.minAnimalsPerKg && 
            animalsPerKg <= size.maxAnimalsPerKg
          );
        };
        
        const currentSize = lastOperationWithAnimalsPerKg?.animalsPerKg ? 
          findSizeFromAnimalsPerKg(lastOperationWithAnimalsPerKg.animalsPerKg)?.code || 'N/A' 
          : 'N/A';
        
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
          sizeId: selectedOperationType === 'misura' ? sizesArray[0]?.id : null,
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
      // Salva backup originale per sistema Undo
      setOriginalRows([...newRows]);
      // Reset righe salvate per nuova sessione
      setSavedRows(new Set());
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
    
    // Inizializza form con tutti i campi necessari per creare una NUOVA operazione
    // (la riga originale non viene modificata)
    const initData: any = {
      basketId: row.basketId,
      type: selectedOperationType,
      date: operationDate, // Usa la data selezionata nei controlli
      lotId: ((lots as any[]) || [])[0]?.id || 1, // Usa il primo lotto disponibile
      sampleWeight: undefined,
      liveAnimals: undefined,
      deadCount: undefined,
      totalWeight: undefined,
      animalCount: undefined,
      notes: ''
    };
    
    // Per operazioni PESO: inizializza animalCount con valore dell'operazione precedente (non modificabile)
    if (selectedOperationType === 'peso') {
      initData.animalCount = row.animalCount; // Usa il valore precedente, non modificabile
    }
    
    setEditingForm(initData);
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
        const sizesArray = Array.isArray(sizes) ? sizes : [];
        if (sizesArray.length > 0) {
          const { findSizeByAnimalsPerKg } = await import("@/lib/utils");
          const selectedSize = findSizeByAnimalsPerKg(animalsPerKgValue, sizesArray);
          if (selectedSize) {
            newRow.sizeId = selectedSize.id;
            console.log(`Taglia calcolata automaticamente: ${selectedSize.code} (ID: ${selectedSize.id})`);
          }
        }
      }
    }
    
    // Applica calcoli automatici per peso
    if (selectedOperationType === 'peso') {
      const animalCount = newRow.animalCount || 0; // Numero animali dell'operazione precedente (fisso)
      const totalWeight = newRow.totalWeight || 0; // Peso totale della cesta (nuovo)
      
      if (animalCount > 0 && totalWeight > 0) {
        // Calcola peso medio: peso_totale ÷ numero_animali
        const averageWeight = totalWeight / animalCount;
        newRow.averageWeight = Math.round(averageWeight * 100) / 100;
        
        // Calcola animali/kg: 1000 ÷ peso_medio
        const animalsPerKgValue = Math.round(1000 / averageWeight);
        newRow.animalsPerKg = animalsPerKgValue;
        
        // Calcola automaticamente la taglia basandosi sui nuovi animali/kg
        const sizesArray = Array.isArray(sizes) ? sizes : [];
        if (sizesArray.length > 0) {
          const { findSizeByAnimalsPerKg } = await import("@/lib/utils");
          const selectedSize = findSizeByAnimalsPerKg(animalsPerKgValue, sizesArray);
          if (selectedSize) {
            newRow.sizeId = selectedSize.id;
            console.log(`Taglia calcolata automaticamente per operazione peso: ${selectedSize.code} (ID: ${selectedSize.id})`);
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

    // NON salvare automaticamente nel database - solo popolare la riga
    // Il salvataggio avviene solo quando si preme il pulsante verde nella riga

    closeEditingForm();
  };

  const updateCell = (basketId: number, field: keyof OperationRowData, value: any) => {
    setOperationRows(prev => prev.map(row => {
      if (row.basketId !== basketId) return row;
      
      const updatedRow: OperationRowData = { 
        ...row, 
        [field]: value, 
        status: 'editing' as const,
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
      
      // Calcoli automatici per operazioni di peso
      if (selectedOperationType === 'peso') {
        const animalCount = row.animalCount || 0; // Numero animali fisso dall'operazione precedente
        const totalWeight = field === 'totalWeight' ? value : row.totalWeight || 0;
        
        if (animalCount > 0 && totalWeight > 0) {
          // Calcola peso medio: peso_totale ÷ numero_animali
          const averageWeight = totalWeight / animalCount;
          updatedRow.averageWeight = Math.round(averageWeight * 100) / 100;
          
          // Calcola animali/kg: 1000 ÷ peso_medio
          const animalsPerKg = Math.round(1000 / averageWeight);
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

  // **NUOVE FUNZIONI SISTEMA UNDO E SALVATAGGIO SINGOLO**
  
  // Undo singolo: riporta una riga specifica allo stato originale  
  const undoRow = (basketId: number) => {
    const originalRow = originalRows.find(r => r.basketId === basketId);
    if (!originalRow) return;
    
    setOperationRows(prev => prev.map(row => 
      row.basketId === basketId 
        ? { ...originalRow, status: 'editing' as const }
        : row
    ));
    
    // Rimuovi dalla lista salvate
    setSavedRows(prev => {
      const newSet = new Set(prev);
      newSet.delete(basketId);
      return newSet;
    });
    
    toast({
      title: "Undo completato",
      description: `Cestello #${originalRow.physicalNumber} ripristinato allo stato originale`,
    });
  };
  
  // Salva singola riga
  const saveSingleRow = async (basketId: number) => {
    const row = operationRows.find(r => r.basketId === basketId);
    if (!row) return;
    
    const errors = validateRow(row);
    if (errors.length > 0) {
      toast({
        title: "Impossibile salvare",
        description: `Errori: ${errors.join(', ')}`,
        variant: "destructive"
      });
      return;
    }
    
    await saveRow(basketId);
  };
  
  // Undo generale: rimuove tutte le nuove righe della sessione
  const undoAllNewRows = () => {
    // Rimuovi tutte le righe che hanno la proprietà isNewRow
    setOperationRows(prev => prev.filter((row: any) => !row.isNewRow));
    
    // Reset anche le righe originali ai valori iniziali
    setOperationRows(prev => prev.map(row => {
      const original = originalRows.find(o => o.basketId === row.basketId);
      return original ? { ...original, status: 'editing' as const } : row;
    }));
    
    // Reset righe salvate
    setSavedRows(new Set());
    
    toast({
      title: "Undo generale completato",
      description: "Tutte le operazioni della sessione sono state annullate",
    });
  };

  // Salva SOLO le nuove operazioni create nella sessione corrente (esclude righe originali)
  const saveAllRows = async () => {
    console.log('🔄 Spreadsheet: Inizio salvataggio SOLO nuove operazioni della sessione');
    console.log('📊 Spreadsheet: Righe totali:', operationRows.length);
    
    // Prima filtra SOLO le righe che sono state create nella sessione corrente (isNewRow = true)
    const newRowsInSession = operationRows.filter((row: any) => row.isNewRow === true);
    console.log('🆕 Spreadsheet: Nuove righe create nella sessione:', newRowsInSession.length);
    
    if (newRowsInSession.length === 0) {
      console.log('ℹ️ Spreadsheet: Nessuna nuova operazione creata nella sessione');
      toast({
        title: "Nessuna nuova operazione da salvare",
        description: "Non sono state create nuove operazioni in questa sessione. Usa il doppio click per creare nuove operazioni.",
      });
      return;
    }
    
    // Poi filtra per validità e stato
    const validNewRows = newRowsInSession.filter(row => {
      const errors = validateRow(row);
      if (errors.length > 0) {
        console.warn('⚠️ Spreadsheet: Nuova riga non valida basketId:', row.basketId, 'errori:', errors);
      }
      return errors.length === 0;
    });
    
    console.log('✅ Spreadsheet: Nuove righe valide trovate:', validNewRows.length);
    
    // Filtra quelle ancora da salvare (editing e non già salvate)
    const unsavedNewRows = validNewRows.filter(row => 
      row.status === 'editing' && !savedRows.has(row.basketId)
    );
    
    console.log('📝 Spreadsheet: Nuove righe da salvare (editing e non già salvate):', unsavedNewRows.length);
    console.log('📋 Spreadsheet: Righe già salvate singolarmente:', Array.from(savedRows));
    
    if (unsavedNewRows.length === 0) {
      console.log('ℹ️ Spreadsheet: Tutte le nuove righe sono già state salvate o contengono errori');
      toast({
        title: "Nessuna operazione da salvare",
        description: "Tutte le nuove operazioni sono già salvate o contengono errori",
      });
      return;
    }
    
    // Mostra un messaggio di conferma con il numero di operazioni da salvare
    toast({
      title: "Salvataggio in corso...",
      description: `Salvando ${unsavedNewRows.length} nuove operazioni create nella sessione`,
    });
    
    for (const row of unsavedNewRows) {
      console.log('🔄 Spreadsheet: Salvando nuova riga basketId:', row.basketId, 'cestello:', row.physicalNumber);
      await saveRow(row.basketId);
    }
    
    console.log('✅ Spreadsheet: Salvataggio di tutte le nuove operazioni completato');
    
    toast({
      title: "Salvataggio completato",
      description: `${unsavedNewRows.length} nuove operazioni salvate con successo`,
    });
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
            <div className="flex gap-1">
              {operationTypeOptions.map((option) => (
                <label
                  key={option.value}
                  className={`
                    flex items-center gap-1 px-3 py-1 rounded-md cursor-pointer transition-all text-xs font-medium
                    border-2 min-w-0
                    ${
                      selectedOperationType === option.value
                        ? option.color === 'blue'
                          ? 'bg-blue-500 text-white border-blue-500 shadow-md transform scale-105'
                          : 'bg-green-500 text-white border-green-500 shadow-md transform scale-105'
                        : option.color === 'blue'
                          ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                          : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="operationType"
                    value={option.value}
                    checked={selectedOperationType === option.value}
                    onChange={(e) => setSelectedOperationType(e.target.value)}
                    className="sr-only"
                  />
                  <span className="text-sm">{option.icon}</span>
                  <span className="whitespace-nowrap">{option.label}</span>
                </label>
              ))}
            </div>
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
              onClick={undoAllNewRows}
              className="h-8 px-3 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 flex items-center gap-1 transition-colors"
              title="Annulla tutte le nuove righe della sessione"
            >
              <RotateCcw className="h-3 w-3" />
              Undo Generale
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
              {((flupsys as any[]) || []).find((f: any) => f.id === selectedFlupsyId)?.name} - {operationTypeOptions.find(opt => opt.value === selectedOperationType)?.label}
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
                {/* Header tabella compatto con larghezze esatte per allineamento perfetto */}
                <div className="flex border-b bg-gray-100 text-xs font-medium text-gray-700 sticky top-0 z-10" style={{fontSize: '10px'}}>
                  <div style={{width: '70px'}} className="px-2 py-1.5 border-r bg-white sticky left-0 z-20 shadow-r">Cesta</div>
                  <div style={{width: '40px'}} className="px-1 py-1.5 border-r text-center">Stato</div>
                  <div style={{width: '80px'}} className="px-1 py-1.5 border-r">Taglia</div>
                  <div style={{width: '60px'}} className="px-1 py-1.5 border-r">P.Med(g)</div>
                  <div style={{width: '50px'}} className="px-1 py-1.5 border-r">Ult.Op</div>
                  {/* COLONNA LOTTO - OBBLIGATORIO */}
                  <div style={{width: '50px'}} className="px-1 py-1.5 border-r bg-yellow-50">Lotto*</div>
                  <div style={{width: '70px'}} className="px-1 py-1.5 border-r">Animali</div>
                  <div style={{width: '80px'}} className="px-1 py-1.5 border-r">Peso Tot (g)</div>
                  <div style={{width: '65px'}} className="px-1 py-1.5 border-r">Anim/kg</div>
                  {/* PESO CAMPIONE per operazioni peso e misura */}
                  {(selectedOperationType === 'peso' || selectedOperationType === 'misura') && (
                    <div style={{width: '60px'}} className="px-1 py-1.5 border-r bg-yellow-50">P.Camp*</div>
                  )}
                  {/* ANIMALI VIVI solo per misura */}
                  {selectedOperationType === 'misura' && (
                    <div style={{width: '50px'}} className="px-1 py-1.5 border-r bg-yellow-50">Vivi*</div>
                  )}
                  {/* ANIMALI MORTI per misura */}
                  {selectedOperationType === 'misura' && (
                    <div style={{width: '50px'}} className="px-1 py-1.5 border-r bg-yellow-50">Morti*</div>
                  )}
                  {/* TOTALE CAMPIONE per misura */}
                  {selectedOperationType === 'misura' && (
                    <div style={{width: '60px'}} className="px-1 py-1.5 border-r">Tot.Camp.</div>
                  )}
                  {/* MORTALITÀ PERCENTUALE per misura */}
                  {selectedOperationType === 'misura' && (
                    <div style={{width: '65px'}} className="px-1 py-1.5 border-r">Mortalità%</div>
                  )}
                  <div className="flex-1 px-1 py-1.5 border-r" style={{minWidth: '120px'}}>Note</div>
                  <div style={{width: '70px'}} className="px-1 py-1.5 text-center">Azioni</div>
                </div>

              {/* Righe dati compatte */}
              {operationRows.map((row, index) => (
                <React.Fragment key={row.basketId}>
                  <div
                    className={`flex border-b text-xs hover:bg-gray-50 items-center ${
                      row.status === 'error' ? 'bg-red-50' : 
                      row.status === 'saved' ? 'bg-green-50' : 
                      row.status === 'saving' ? 'bg-yellow-50' : 'bg-white'
                    }`}
                  >
                    {/* Colonna cestello fissa */}
                    <div 
                      style={{width: '70px'}}
                      className="px-2 py-1 border-r flex items-center font-medium text-gray-700 bg-white sticky left-0 z-10 shadow-r cursor-pointer hover:bg-blue-50 transition-colors"
                      onDoubleClick={(e) => handleDoubleClick(row.basketId, e)}
                      title="Doppio click per modificare operazione"
                    >
                      #{row.physicalNumber}
                    </div>
                    
                    {/* Stato */}
                    <div style={{width: '40px'}} className="px-1 py-1 border-r flex items-center justify-center">
                      {row.status === 'saving' && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                      {row.status === 'saved' && <CheckCircle2 className="h-3 w-3 text-green-600" />}
                      {row.status === 'error' && <AlertCircle className="h-3 w-3 text-red-600" />}
                      {row.status === 'editing' && <div className="h-2 w-2 rounded-full bg-blue-400" />}
                    </div>

                    {/* Info aggiuntive - Taglia calcolata automaticamente */}
                    <div style={{width: '80px'}} className="px-1 py-1 border-r flex items-center text-xs text-gray-600">
                      <span className="truncate">
                        {(() => {
                          // Per le righe nuove, calcola la taglia basandosi su animalsPerKg
                          if ((row as any).isNewRow && row.animalCount && row.totalWeight) {
                            const calculatedAnimalsPerKg = Math.round((row.animalCount / row.totalWeight) * 1000);
                            const sizesArray = Array.isArray(sizes) ? sizes : [];
                            const matchingSize = sizesArray.find((size: any) => 
                              size.minAnimalsPerKg !== null && 
                              size.maxAnimalsPerKg !== null &&
                              calculatedAnimalsPerKg >= size.minAnimalsPerKg && 
                              calculatedAnimalsPerKg <= size.maxAnimalsPerKg
                            );
                            return matchingSize?.code || 'N/A';
                          }
                          // Per righe esistenti, usa la taglia calcolata nel setup
                          return row.currentSize;
                        })()}
                      </span>
                    </div>

                    <div style={{width: '60px'}} className="px-1 py-1 border-r flex items-center text-xs text-gray-600">
                      <span className="truncate">
                        {(row as any).isNewRow && row.animalCount && row.totalWeight ? 
                          `${Math.round((row.totalWeight / row.animalCount) * 100) / 100}g`
                          : `${row.averageWeight}g`}
                      </span>
                    </div>

                    <div style={{width: '50px'}} className="px-1 py-1 border-r flex items-center text-xs text-gray-500">
                      <span className="truncate" title={`${row.lastOperationType} - ${row.lastOperationDate}`}>
                        {(row as any).isNewRow && row.date ? 
                          new Date(row.date).toLocaleDateString('it-IT', {month: '2-digit', day: '2-digit'})
                          : row.lastOperationDate ? new Date(row.lastOperationDate).toLocaleDateString('it-IT', {month: '2-digit', day: '2-digit'}) : '-'}
                      </span>
                    </div>

                    {/* CAMPO LOTTO - NON MODIFICABILE */}
                    <div style={{width: '50px'}} className="px-1 py-1 border-r bg-gray-100">
                      <div className="w-full h-6 px-1 text-xs text-gray-600 rounded flex items-center">
                        L{row.lotId || '1'}
                      </div>
                    </div>



                    {/* Campi editabili */}
                    <div style={{width: '70px'}} className="px-1 py-1 border-r">
                      <input
                        type="number"
                        value={row.animalCount || ''}
                        onChange={(e) => updateCell(row.basketId, 'animalCount', Number(e.target.value))}
                        className={`w-full h-6 px-1 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded ${
                          (row as any).isNewRow ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
                        }`}
                        disabled={!(row as any).isNewRow}
                        min="0"
                        placeholder="0"
                      />
                    </div>

                    <div style={{width: '80px'}} className="px-1 py-1 border-r">
                      <input
                        type="number"
                        value={row.totalWeight || ''}
                        onChange={(e) => updateCell(row.basketId, 'totalWeight', Number(e.target.value))}
                        className={`w-full h-6 px-1 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded ${
                          (row as any).isNewRow ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
                        }`}
                        disabled={!(row as any).isNewRow}
                        min="0"
                        placeholder="0"
                      />
                    </div>

                    <div style={{width: '65px'}} className="px-1 py-1 border-r">
                      <input
                        type="number"
                        value={row.animalsPerKg || ''}
                        onChange={(e) => updateCell(row.basketId, 'animalsPerKg', Number(e.target.value))}
                        className={`w-full h-6 px-1 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded ${
                          (row as any).isNewRow ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
                        }`}
                        disabled={!(row as any).isNewRow}
                        min="0"
                        placeholder="0"
                      />
                    </div>

                    {/* PESO CAMPIONE per operazioni peso e misura */}
                    {(selectedOperationType === 'peso' || selectedOperationType === 'misura') && (
                      <div style={{width: '60px'}} className="px-1 py-1 border-r bg-yellow-50">
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
                      <div style={{width: '50px'}} className="px-1 py-1 border-r bg-yellow-50">
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
                      <div style={{width: '50px'}} className="px-1 py-1 border-r bg-yellow-50">
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
                      <div style={{width: '60px'}} className="px-1 py-1 border-r">
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
                      <div style={{width: '65px'}} className="px-1 py-1 border-r">
                        <input
                          type="number"
                          value={row.mortalityRate ? row.mortalityRate.toFixed(2) : ''}
                          readOnly
                          className="w-full h-6 px-1 text-xs border-0 bg-gray-100 text-gray-600 rounded"
                          placeholder="Auto"
                        />
                      </div>
                    )}

                    <div className="flex-1 px-1 py-1 border-r" style={{minWidth: '120px'}}>
                      <input
                        value={row.notes}
                        onChange={(e) => updateCell(row.basketId, 'notes', e.target.value)}
                        className={`w-full h-6 px-1 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded ${
                          (row as any).isNewRow ? 'bg-white' : 'bg-gray-100 cursor-not-allowed'
                        }`}
                        disabled={!(row as any).isNewRow}
                        placeholder="Note..."
                      />
                    </div>

                    <div style={{width: '70px'}} className="px-1 py-1 border-r flex items-center justify-center gap-1 min-h-[28px]">
                      {/* Pulsanti Salva e Undo solo per righe create (nuove) */}
                      {(row as any).isNewRow ? (
                        <>
                          {/* Pulsante Salva Singolo */}
                          <button
                            onClick={() => saveSingleRow(row.basketId)}
                            disabled={row.status === 'saving' || row.status === 'saved' || savedRows.has(row.basketId)}
                            className={`h-5 w-5 flex items-center justify-center text-xs rounded transition-colors ${
                              row.status === 'saved' || savedRows.has(row.basketId)
                                ? 'bg-green-500 text-white cursor-not-allowed' 
                                : row.status === 'saving'
                                ? 'bg-yellow-500 text-white cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                            title="Salva operazione singolarmente"
                          >
                            {row.status === 'saving' ? (
                              <Loader2 className="h-2 w-2 animate-spin" />
                            ) : row.status === 'saved' || savedRows.has(row.basketId) ? (
                              <CheckCircle2 className="h-2 w-2" />
                            ) : (
                              <Save className="h-2 w-2" />
                            )}
                          </button>
                          
                          {/* Pulsante Undo Singolo */}
                          <button
                            onClick={() => undoRow(row.basketId)}
                            disabled={row.status === 'saving'}
                            className="h-5 w-5 flex items-center justify-center text-xs rounded bg-orange-500 text-white hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                            title="Annulla modifiche per questa riga"
                          >
                            <RotateCcw className="h-2 w-2" />
                          </button>
                        </>
                      ) : (
                        // Per righe originali, mostra solo lo stato senza azioni
                        <div className="text-xs text-gray-500">Originale</div>
                      )}
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
                </React.Fragment>
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

      {/* Form popup stile Excel per editing inline */}
      {editingRow !== null && editingForm && editingPosition && (
        <>
          {/* Overlay molto trasparente per mantenere visibilità */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-5 z-40"
            onClick={closeEditingForm}
          />
          
          {/* Form popup responsive - desktop a lato, mobile fullscreen */}
          <div 
            className="fixed z-50 rounded border shadow-2xl 
                       md:max-w-[600px] md:min-w-[500px]
                       max-md:inset-x-2 max-md:w-auto max-md:max-w-none max-md:min-w-0
                       max-md:top-4 max-md:bottom-4 max-md:overflow-y-auto"
            style={{ 
              // Desktop: posizionato a lato destro
              top: window.innerWidth >= 768 ? Math.max(10, editingPosition.top - 20) : undefined,
              right: window.innerWidth >= 768 ? Math.max(10, 50) : undefined,
              
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(3px)',
              border: '2px solid #3b82f6'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                saveEditingForm();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                closeEditingForm();
              }
            }}
            tabIndex={-1}
          >
            {/* Header responsive con indicatori appropriati */}
            <div className="px-3 py-2 md:py-2 max-md:py-3 border-b border-blue-300" style={{backgroundColor: 'rgba(59, 130, 246, 0.15)'}}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                  📝 Cestello #{editingForm.basketId} - {selectedOperationType}
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full max-md:hidden">
                    Riga visibile sotto
                  </span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full md:hidden">
                    Mobile
                  </span>
                </span>
                <button 
                  onClick={closeEditingForm}
                  className="text-gray-500 hover:text-gray-700 text-xl font-bold leading-none 
                           w-6 h-6 md:w-6 md:h-6 max-md:w-8 max-md:h-8 
                           flex items-center justify-center rounded hover:bg-gray-100
                           max-md:text-2xl"
                  title="Chiudi (Esc)"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Layout responsive - desktop inline, mobile stacked */}
            <div className="p-3 md:p-3 max-md:p-4">
              {selectedOperationType === 'misura' && (
                <div className="space-y-4 md:space-y-3">
                  {/* Riga 1: Peso campione e animali - responsive grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-3 items-end">
                    <div>
                      <label className="text-sm md:text-xs text-gray-600 mb-2 md:mb-1 block font-medium">Peso campione (g)</label>
                      <input
                        type="number"
                        value={editingForm.sampleWeight || ''}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          setEditingForm({...editingForm, sampleWeight: value});
                        }}
                        className="w-full h-10 md:h-8 px-3 md:px-2 text-base md:text-sm border rounded 
                                 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-yellow-50
                                 touch-manipulation"
                        min="1"
                        placeholder="100"
                        required
                        autoFocus
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm md:text-xs text-gray-600 mb-2 md:mb-1 block font-medium">Vivi</label>
                      <input
                        type="number"
                        value={editingForm.liveAnimals || ''}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          setEditingForm({...editingForm, liveAnimals: value});
                        }}
                        className="w-full h-10 md:h-8 px-3 md:px-2 text-base md:text-sm border rounded 
                                 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-yellow-50
                                 touch-manipulation"
                        min="1"
                        placeholder="50"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm md:text-xs text-gray-600 mb-2 md:mb-1 block font-medium">Morti</label>
                      <input
                        type="number"
                        value={editingForm.deadCount || ''}
                        onChange={(e) => {
                          const value = Number(e.target.value) || 0;
                          setEditingForm({...editingForm, deadCount: value});
                        }}
                        className="w-full h-10 md:h-8 px-3 md:px-2 text-base md:text-sm border rounded 
                                 focus:outline-none focus:ring-2 focus:ring-blue-400
                                 touch-manipulation"
                        min="0"
                        placeholder="0"
                        required
                      />
                    </div>
                  </div>

                  {/* Riga 2: Calcoli automatici */}
                  <div className="grid grid-cols-4 gap-3 items-end">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Tot. Campione</label>
                      <div className="h-8 px-2 text-sm bg-gray-50 border rounded flex items-center text-gray-700">
                        {(editingForm.liveAnimals || 0) + (editingForm.deadCount || 0) || '-'}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Mortalità %</label>
                      <div className="h-8 px-2 text-sm bg-gray-50 border rounded flex items-center text-gray-700">
                        {((editingForm.liveAnimals || 0) + (editingForm.deadCount || 0)) > 0 
                          ? ((editingForm.deadCount || 0) / ((editingForm.liveAnimals || 0) + (editingForm.deadCount || 0)) * 100).toFixed(1)
                          : '0.0'}%
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Peso Medio (g)</label>
                      <div className="h-8 px-2 text-sm bg-gray-50 border rounded flex items-center text-gray-700">
                        {(editingForm.sampleWeight && editingForm.liveAnimals && editingForm.liveAnimals > 0)
                          ? (editingForm.sampleWeight / editingForm.liveAnimals).toFixed(2)
                          : '-'}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Peso totale (g)</label>
                      <input
                        type="number"
                        value={editingForm.totalWeight || ''}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          setEditingForm({...editingForm, totalWeight: value});
                        }}
                        className="w-full h-8 px-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-400 bg-yellow-50"
                        min="1"
                        placeholder="15000"
                        required
                      />
                    </div>
                  </div>

                  {/* Riga 3: Risultati finali */}
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Tot. Animali Calcolati</label>
                      <div className="h-8 px-2 text-sm bg-blue-50 border-2 border-blue-200 rounded flex items-center font-medium text-blue-800">
                        {(editingForm.totalWeight && editingForm.sampleWeight && editingForm.liveAnimals && editingForm.liveAnimals > 0)
                          ? Math.round((editingForm.totalWeight * editingForm.liveAnimals) / editingForm.sampleWeight)
                          : '-'}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Animali/kg</label>
                      <div className="h-8 px-2 text-sm bg-blue-50 border-2 border-blue-200 rounded flex items-center font-medium text-blue-800">
                        {(editingForm.totalWeight && editingForm.sampleWeight && editingForm.liveAnimals && editingForm.liveAnimals > 0)
                          ? Math.round(((editingForm.totalWeight * editingForm.liveAnimals) / editingForm.sampleWeight) / (editingForm.totalWeight / 1000))
                          : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedOperationType === 'peso' && (
                <div className="space-y-3">
                  {/* Layout per operazione Peso - numero animali fisso, solo peso modificabile */}
                  <div className="grid grid-cols-3 gap-3 items-end">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Numero animali (precedente)</label>
                      <div className="h-8 px-2 text-sm bg-gray-100 border rounded flex items-center text-gray-600">
                        {editingForm.animalCount?.toLocaleString() || '-'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">Non modificabile</div>
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Peso totale (g)</label>
                      <input
                        type="number"
                        value={editingForm.totalWeight || ''}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          setEditingForm({...editingForm, totalWeight: value});
                        }}
                        className="w-full h-8 px-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-400 bg-yellow-50"
                        min="1"
                        placeholder="15000"
                        autoFocus
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Peso Medio (g)</label>
                      <div className="h-8 px-2 text-sm bg-blue-50 border-2 border-blue-200 rounded flex items-center font-medium text-blue-800">
                        {(editingForm.animalCount && editingForm.totalWeight && editingForm.animalCount > 0)
                          ? (editingForm.totalWeight / editingForm.animalCount).toFixed(2)
                          : '-'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Riga 2: Risultati calcolati */}
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Animali/kg</label>
                      <div className="h-8 px-2 text-sm bg-blue-50 border-2 border-blue-200 rounded flex items-center font-medium text-blue-800">
                        {(editingForm.animalCount && editingForm.totalWeight && editingForm.animalCount > 0)
                          ? Math.round(1000 / (editingForm.totalWeight / editingForm.animalCount)).toLocaleString()
                          : '-'}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Taglia (calcolata)</label>
                      <div className="h-8 px-2 text-sm bg-green-50 border-2 border-green-200 rounded flex items-center font-medium text-green-800">
                        {(editingForm.animalCount && editingForm.totalWeight && editingForm.animalCount > 0)
                          ? (() => {
                              const animalsPerKg = Math.round(1000 / (editingForm.totalWeight / editingForm.animalCount));
                              const sizesArray = Array.isArray(sizes) ? sizes : [];
                              const size = sizesArray.find((s: any) => 
                                s.minAnimalsPerKg !== null && 
                                s.maxAnimalsPerKg !== null &&
                                animalsPerKg >= s.minAnimalsPerKg && 
                                animalsPerKg <= s.maxAnimalsPerKg
                              );
                              return size?.code || 'N/A';
                            })()
                          : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {(selectedOperationType === 'pulizia' || selectedOperationType === 'trattamento' || selectedOperationType === 'vagliatura') && (
                <div className="space-y-3">
                  {/* Layout orizzontale per altre operazioni */}
                  <div className="grid grid-cols-2 gap-3 items-end">
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Numero animali</label>
                      <input
                        type="number"
                        value={editingForm.animalCount || ''}
                        onChange={(e) => setEditingForm({...editingForm, animalCount: Number(e.target.value)})}
                        className="w-full h-8 px-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-400 bg-yellow-50"
                        min="1"
                        placeholder="150000"
                        autoFocus
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Note</label>
                      <input
                        type="text"
                        value={editingForm.notes || ''}
                        onChange={(e) => setEditingForm({...editingForm, notes: e.target.value})}
                        className="w-full h-8 px-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                        placeholder="Operazione di routine"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pulsanti responsive - mobile più grandi */}
            <div className="flex justify-between items-center pt-3 md:pt-2 border-t border-gray-200 
                          max-md:flex-col max-md:gap-3">
              <div className="text-xs md:text-xs max-md:text-sm text-gray-500 max-md:text-center">
                <span className="md:hidden">Tocca Salva per confermare • Annulla per chiudere</span>
                <span className="max-md:hidden">Premi Invio per salvare • Esc per annullare</span>
              </div>
              <div className="flex space-x-2 max-md:space-x-0 max-md:gap-3 max-md:w-full">
                <button
                  onClick={closeEditingForm}
                  className="px-3 py-1 md:px-3 md:py-1 max-md:px-4 max-md:py-3 
                           text-xs md:text-xs max-md:text-sm font-medium text-gray-600 bg-gray-100 
                           border rounded hover:bg-gray-200 max-md:flex-1 max-md:h-12 
                           max-md:flex max-md:items-center max-md:justify-center
                           touch-manipulation"
                >
                  Annulla
                </button>
                <button
                  onClick={saveEditingForm}
                  disabled={!validateEditingForm()}
                  className={`px-3 py-1 md:px-3 md:py-1 max-md:px-4 max-md:py-3 
                           text-xs md:text-xs max-md:text-sm font-medium border rounded max-md:flex-1 max-md:h-12 
                           max-md:flex max-md:items-center max-md:justify-center
                           touch-manipulation transition-colors ${
                             validateEditingForm() 
                               ? 'text-white bg-blue-600 hover:bg-blue-700'
                               : 'text-gray-500 bg-gray-300 cursor-not-allowed'
                           }`}
                >
                  ✓ Salva
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}