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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

  // Funzione per badge taglia con colori (identica al Registro Operazioni)
  const getSizeBadgeClasses = (sizeCode: string): string => {
    if (!sizeCode || sizeCode === 'N/A') return 'text-gray-600';
    
    // Gestisce le taglie TP-XXX con colorazione individuale
    if (sizeCode.startsWith('TP-')) {
      // Estrai il numero dalla taglia TP-XXX
      const numStr = sizeCode.substring(3);
      const num = parseInt(numStr);
      
      // Colorazione granulare per distinguere ogni taglia
      if (num <= 500) {
        return 'text-purple-800 font-semibold';  // TP-500 → Viola
      } else if (num <= 600) {
        return 'text-blue-800 font-semibold';      // TP-600 → Blu
      } else if (num <= 800) {
        return 'text-indigo-800 font-semibold';  // TP-800 → Indaco
      } else if (num <= 1000) {
        return 'text-red-800 font-semibold';        // TP-1000 → Rosso
      } else if (num <= 3000) {
        return 'text-green-800 font-semibold';    // TP-2000, TP-3000 → VERDE
      } else if (num <= 6000) {
        return 'text-yellow-800 font-semibold';  // TP-4000, TP-5000, TP-6000 → Giallo
      } else if (num <= 10000) {
        return 'text-orange-800 font-semibold';  // TP-7000, TP-8000, TP-9000, TP-10000 → Arancione
      }
    }
    
    return 'text-gray-600'; // Default per taglie non TP-XXX
  };

  // Funzione per badge colorati con background (per previsioni)
  const getSizeBadgeWithBackground = (sizeCode: string): string => {
    if (!sizeCode || sizeCode === 'N/A') return 'bg-gray-100 text-gray-800';
    
    // Gestisce le taglie TP-XXX con colorazione individuale
    if (sizeCode.startsWith('TP-')) {
      // Estrai il numero dalla taglia TP-XXX
      const numStr = sizeCode.substring(3);
      const num = parseInt(numStr);
      
      // Colorazione granulare per distinguere ogni taglia
      if (num <= 500) {
        return 'bg-purple-100 text-purple-800';  // TP-500 → Viola
      } else if (num <= 600) {
        return 'bg-blue-100 text-blue-800';      // TP-600 → Blu
      } else if (num <= 800) {
        return 'bg-indigo-100 text-indigo-800';  // TP-800 → Indaco
      } else if (num <= 1000) {
        return 'bg-red-100 text-red-800';        // TP-1000 → Rosso
      } else if (num <= 3000) {
        return 'bg-green-100 text-green-800';    // TP-2000, TP-3000 → VERDE
      } else if (num <= 6000) {
        return 'bg-yellow-100 text-yellow-800';  // TP-4000, TP-5000, TP-6000 → Giallo
      } else if (num <= 10000) {
        return 'bg-orange-100 text-orange-800';  // TP-7000, TP-8000, TP-9000, TP-10000 → Arancione
      }
    }
    
    return 'bg-gray-100 text-gray-800'; // Default per taglie non TP-XXX
  };
  
  const [selectedFlupsyId, setSelectedFlupsyId] = useState<number | null>(null);
  const [selectedOperationType, setSelectedOperationType] = useState<string>('peso');
  const [operationDate, setOperationDate] = useState(new Date().toISOString().split('T')[0]);
  const [operationRows, setOperationRows] = useState<OperationRowData[]>([]);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  
  // Stati per previsioni di crescita
  const [targetSizeId, setTargetSizeId] = useState<number | null>(null);
  const [targetDate, setTargetDate] = useState<string>(() => {
    // Imposta di default 4 settimane da oggi
    const date = new Date();
    date.setDate(date.getDate() + 28); // 4 settimane = 28 giorni
    return date.toISOString().split('T')[0];
  });
  const [predictionsEnabled, setPredictionsEnabled] = useState<boolean>(false); // Controlla se calcolare le previsioni
  const [showPredictionPopup, setShowPredictionPopup] = useState<boolean>(false); // Controlla popup previsioni
  const [predictionSummary, setPredictionSummary] = useState<any>(null); // Dati sintesi previsioni
  
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

  // Refs per i campi del form per la navigazione automatica
  const sampleWeightRef = useRef<HTMLInputElement>(null);
  const liveAnimalsRef = useRef<HTMLInputElement>(null);
  const deadCountRef = useRef<HTMLInputElement>(null);
  const totalWeightRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Stati per evidenziazione visiva operazioni associate
  const [hoveredBasketGroup, setHoveredBasketGroup] = useState<number | null>(null);

  // Funzione per navigazione automatica del cursore
  const moveToNextField = (currentField: string, value: any) => {
    // Per operazioni di tipo "misura"
    if (selectedOperationType === 'misura') {
      switch (currentField) {
        case 'sampleWeight':
          if (value && value > 0) {
            setTimeout(() => liveAnimalsRef.current?.focus(), 50);
          }
          break;
        case 'liveAnimals':
          if (value && value > 0) {
            setTimeout(() => deadCountRef.current?.focus(), 50);
          }
          break;
        case 'deadCount':
          if (value !== null && value !== undefined && value >= 0) {
            setTimeout(() => totalWeightRef.current?.focus(), 50);
          }
          break;
        case 'totalWeight':
          if (value && value > 0) {
            setTimeout(() => notesRef.current?.focus(), 50);
          }
          break;
      }
    }
    // Per operazioni di tipo "peso"
    else if (selectedOperationType === 'peso') {
      if (currentField === 'totalWeight' && value && value > 0) {
        setTimeout(() => notesRef.current?.focus(), 50);
      }
    }
  };

  // Funzione per identificare gruppi di righe associate (stesso basketId)
  const getAssociatedRows = (basketId: number): OperationRowData[] => {
    return operationRows.filter(row => row.basketId === basketId);
  };

  // Funzione per determinare se una riga è originale o nuova
  const isOriginalRow = (row: OperationRowData): boolean => {
    return !(row as any).isNewRow;
  };

  // Validazione date per evitare duplicati e date anteriori
  const validateOperationDate = (basketId: number, date: string): { valid: boolean; error?: string } => {
    const basketOperations = ((operations as any[]) || []).filter((op: any) => op.basketId === basketId);
    
    if (basketOperations.length === 0) {
      return { valid: true }; // Nessuna operazione esistente, qualsiasi data è valida
    }
    
    // Ordina per data per trovare l'ultima
    const sortedOperations = basketOperations.sort((a: any, b: any) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA; // Decrescente: più recente prima
    });
    
    const operationDate = new Date(date);
    const lastOperation = sortedOperations[0];
    const lastDate = new Date(lastOperation.date);
    
    // Controllo 1: Data duplicata
    const duplicateDate = basketOperations.find((op: any) => op.date === date);
    if (duplicateDate) {
      const basket = ((baskets as any[]) || []).find((b: any) => b.id === basketId);
      const physicalNumber = basket?.physicalNumber || basketId;
      return { 
        valid: false, 
        error: `Esiste già un'operazione per la cesta ${physicalNumber} nella data ${date}. Ogni cesta può avere massimo una operazione per data.` 
      };
    }
    
    // Controllo 2: Data anteriore all'ultima operazione
    if (operationDate < lastDate) {
      const basket = ((baskets as any[]) || []).find((b: any) => b.id === basketId);
      const physicalNumber = basket?.physicalNumber || basketId;
      return { 
        valid: false, 
        error: `La data ${date} è anteriore all'ultima operazione (${lastOperation.date}) per la cesta ${physicalNumber}. Le operazioni devono essere inserite in ordine cronologico.` 
      };
    }
    
    return { valid: true };
  };

  // Validazione campi obbligatori per il form popup
  const validateEditingForm = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!editingForm) {
      return { valid: false, errors: ['Form non inizializzato'] };
    }
    
    // Campi sempre obbligatori
    if (!editingForm.basketId || !editingForm.type || !editingForm.date || !editingForm.lotId) {
      errors.push('Tutti i campi obbligatori devono essere compilati');
    }
    
    // Validazione date se i campi base sono presenti
    // ⚠️ FIX CRITICO: Usa operationDate (data globale) invece di editingForm.date
    // perché il salvataggio usa operationDate (linea 1169)
    if (editingForm.basketId && operationDate) {
      const dateValidation = validateOperationDate(editingForm.basketId, operationDate);
      if (!dateValidation.valid && dateValidation.error) {
        errors.push(dateValidation.error);
      }
    }
    
    // Validazioni specifiche per tipo operazione
    if (selectedOperationType === 'misura') {
      // Per misura: peso campione, animali vivi, morti, peso totale sono obbligatori
      if (!editingForm.sampleWeight || editingForm.sampleWeight <= 0) {
        errors.push('Peso campione è obbligatorio e deve essere maggiore di 0');
      }
      if (!editingForm.liveAnimals || editingForm.liveAnimals <= 0) {
        errors.push('Numero animali vivi è obbligatorio e deve essere maggiore di 0');
      }
      if (editingForm.deadCount === null || editingForm.deadCount === undefined) {
        errors.push('Numero animali morti è obbligatorio');
      }
      if (!editingForm.totalWeight || editingForm.totalWeight <= 0) {
        errors.push('Peso totale è obbligatorio e deve essere maggiore di 0');
      }
    }
    
    if (selectedOperationType === 'peso') {
      // Per peso: solo peso totale è obbligatorio (numero animali viene preso dall'operazione precedente)
      if (!editingForm.totalWeight || editingForm.totalWeight <= 0) {
        errors.push('Peso totale è obbligatorio e deve essere maggiore di 0');
      }
    }
    
    if (['pulizia', 'trattamento', 'vagliatura'].includes(selectedOperationType)) {
      // Per altre operazioni: almeno il numero animali è obbligatorio
      if (!editingForm.animalCount || editingForm.animalCount <= 0) {
        errors.push('Numero animali è obbligatorio e deve essere maggiore di 0');
      }
    }
    
    return { valid: errors.length === 0, errors };
  };

  // Query per recuperare dati
  const { data: flupsys } = useQuery({
    queryKey: ['/api/flupsys'],
  });

  const { data: baskets } = useQuery({
    queryKey: ['/api/baskets?includeAll=true'],
  });

  // Query operazioni ottimizzata - usa cache e paginazione efficiente
  const { data: operations, isLoading: operationsLoading, error: operationsError } = useQuery({
    queryKey: ['/api/operations', 'spreadsheet'],
    queryFn: () => {
      // Usa cache ottimizzata e paginazione ridotta per performance
      return apiRequest('/api/operations?pageSize=100&sortBy=id&sortOrder=desc');
    },
    staleTime: 120000, // Cache for 2 minuti per performance
    refetchOnWindowFocus: false
  });

  const { data: sizes } = useQuery({
    queryKey: ['/api/sizes'],
  });

  const { data: lots } = useQuery({
    queryKey: ['/api/lots'],
  });

  // Query per dati SGR per calcoli previsioni
  const { data: sgrData } = useQuery({
    queryKey: ['/api/sgr'],
  });

  // Auto-selezione FLUPSY con cestelli attivi
  useEffect(() => {
    if (!selectedFlupsyId && baskets && flupsys && Array.isArray(baskets) && Array.isArray(flupsys)) {
      // Trova il FLUPSY che ha cestelli attivi
      const flupsyWithActiveBaskets = (flupsys as any[]).find((flupsy: any) => 
        (baskets as any[]).some((basket: any) => 
          basket.flupsyId === flupsy.id && 
          basket.state === 'active' && 
          basket.currentCycleId
        )
      );
      
      if (flupsyWithActiveBaskets) {
        setSelectedFlupsyId(flupsyWithActiveBaskets.id);
      } else {
        // Se non ci sono cestelli attivi, prendi il primo FLUPSY con cestelli
        const flupsyWithBaskets = (flupsys as any[]).find((flupsy: any) => 
          (baskets as any[]).some((basket: any) => basket.flupsyId === flupsy.id)
        );
        if (flupsyWithBaskets) {
          setSelectedFlupsyId(flupsyWithBaskets.id);
        }
      }
    }
  }, [baskets, flupsys, selectedFlupsyId]);

  // Mutation per salvare operazioni - USA LA STESSA LOGICA DEL MODULO OPERATIONS STANDARD
  const saveOperationMutation = useMutation({
    mutationFn: async (operationData: any) => {
      try {
        // USA LA FUNZIONE createDirectOperation ESATTAMENTE COME IL MODULO OPERATIONS STANDARD
        const response = await createDirectOperation(operationData);
        return response;
      } catch (error) {
        console.error('❌ Spreadsheet: Errore durante createDirectOperation:', error);
        throw error;
      }
    },
    onSuccess: (data, variables) => {
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
      console.error('❌ Spreadsheet: Error callback:', error.message);
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

  // Debug per verificare errori nelle operazioni (solo errori critici)
  useEffect(() => {
    if (operationsError) {
      console.error('❌ SPREADSHEET: Errore nel caricamento operazioni:', operationsError);
    }
  }, [operationsError]);
  
  // Inizializza le righe quando cambiano FLUPSY, tipo operazione o data
  useEffect(() => {
    // Prepara i dati dei cestelli per il FLUPSY selezionato
    // Include SOLO i cestelli con cicli attivi dal FLUPSY selezionato
    const eligibleBaskets: BasketData[] = ((baskets as any[]) || [])
      .filter((basket: any) => {
        // Il cestello deve appartenere al FLUPSY selezionato
        if (basket.flupsyId !== selectedFlupsyId) return false;
        
        // Il cestello deve avere uno stato attivo
        if (basket.state !== 'active') return false;
        
        // Il cestello deve avere un ciclo attivo (currentCycleId non null)
        return basket.currentCycleId !== null;
      })
      .map((basket: any) => {
        const flupsy = ((flupsys as any[]) || []).find((f: any) => f.id === basket.flupsyId);
        // Recupera TUTTE le operazioni per questa cesta
        const basketOperations = ((operations as any[]) || []).filter((op: any) => op.basketId === basket.id);
        
        // Trova l'operazione di prima-attivazione per determinare il lotto del cestello
        const activationOp = basketOperations.find((op: any) => op.type === 'prima-attivazione');
        
        // Trova l'ultima operazione per altri dati (peso, taglia, etc.)
        const lastOp = basketOperations.length > 0 
          ? basketOperations.sort((a: any, b: any) => {
              // Prima ordina per ID (più recente = ID più alto)
              const idDiff = b.id - a.id;
              if (idDiff !== 0) return idDiff;
              // Se gli ID sono uguali, ordina per data
              return new Date(b.date).getTime() - new Date(a.date).getTime();
            })[0]
          : null;
        
        // Log solo per errori critici
        if (basketOperations.length === 0) {
          console.warn(`⚠️ CESTA ${basket.physicalNumber}: Nessuna operazione trovata`);
        }
        
        return {
          id: basket.id,
          physicalNumber: basket.physicalNumber,
          flupsyId: basket.flupsyId,
          currentCycleId: basket.currentCycleId,
          state: basket.state,
          flupsyName: flupsy?.name,
          lastOperation: lastOp,
          activationOperation: activationOp
        };
      })
      .sort((a, b) => a.physicalNumber - b.physicalNumber);

    // Debug dettagliato per capire il problema dei cestelli mancanti
    console.log(`🔍 DEBUG FILTRO: FLUPSY selezionato=${selectedFlupsyId}`);
    console.log(`🔍 DEBUG FILTRO: Cestelli totali disponibili=${(baskets as any[])?.length || 0}`);
    console.log(`🔍 DEBUG FILTRO: Cestelli dopo filtro FLUPSY=${eligibleBaskets.length}`);
    
    // Log dei cestelli che non passano il filtro
    if (baskets && Array.isArray(baskets)) {
      const skippedBaskets = (baskets as any[]).filter((basket: any) => {
        const flupsyMatch = basket.flupsyId === selectedFlupsyId;
        const stateMatch = basket.state === 'active';
        const cycleMatch = basket.currentCycleId !== null;
        
        if (!flupsyMatch || !stateMatch || !cycleMatch) {
          console.log(`🚫 CESTELLO ESCLUSO: #${basket.physicalNumber} - FLUPSY:${basket.flupsyId}(${flupsyMatch}) STATE:${basket.state}(${stateMatch}) CYCLE:${basket.currentCycleId}(${cycleMatch})`);
          return true;
        }
        return false;
      });
    }
    
    // Log solo se nessun cestello trovato
    if (selectedFlupsyId && eligibleBaskets.length === 0) {
      console.log(`🔍 DEBUG RESULT: Trovati ${eligibleBaskets.length} cestelli con cicli attivi dopo filtro per FLUPSY=${selectedFlupsyId}`);
    }
    
    // If no eligible baskets found, clear the rows immediately
    if (selectedFlupsyId && eligibleBaskets.length === 0) {
      setOperationRows([]);
      return;
    }
    
    if (selectedFlupsyId && selectedOperationType && eligibleBaskets.length > 0 && operations && Array.isArray(operations)) {
      const newRows: OperationRowData[] = eligibleBaskets.map(basket => {
        const lastOp = basket.lastOperation;
        const sizesArray = Array.isArray(sizes) ? sizes : [];
        
        // Calcola taglia corrente basandosi sulla logica del modulo Inventory
        const basketOperationsForSize = ((operations as any[]) || []).filter((op: any) => op.basketId === basket.id);
        const lastOperationWithAnimalsPerKg = basketOperationsForSize
          .filter((op: any) => op.animalsPerKg && op.animalsPerKg > 0)
          .sort((a: any, b: any) => {
            // Prima ordina per ID (più recente = ID più alto)
            const idDiff = b.id - a.id;
            if (idDiff !== 0) return idDiff;
            // Se gli ID sono uguali, ordina per data
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          })[0];
        
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
          : ((lastOp as any)?.size?.code || 'N/A');
        
        const averageWeight = lastOp?.animalCount && lastOp?.totalWeight ? 
          Math.round((lastOp.totalWeight / lastOp.animalCount) * 1000 * 1000) / 1000 : ((lastOp as any)?.averageWeight || 0);
        

        
        // Cast lastOp per accedere a tutte le proprietà
        const fullOp = lastOp as any;
        
        return {
          basketId: basket.id,
          physicalNumber: basket.physicalNumber,
          type: selectedOperationType,
          date: operationDate,
          // CAMPI OBBLIGATORI - usa il lotto dalla prima attivazione del cestello
          lotId: (() => {
            // Trova l'operazione di prima-attivazione per questo cestello
            const basketOperations = ((operations as any[]) || []).filter((op: any) => op.basketId === basket.id);
            const activationOp = basketOperations.find((op: any) => op.type === 'prima-attivazione');
            
            if (activationOp?.lotId) {
              return activationOp.lotId;
            }
            
            // Fallback: cerca il lotto dal ciclo del cestello
            const currentCycle = ((cycles as any[]) || []).find((c: any) => c.id === basket.currentCycleId);
            if (currentCycle?.lotId) {
              console.log(`🔍 Cestello ${basket.id}: Usando lotto ${currentCycle.lotId} dal ciclo ${basket.currentCycleId}`);
              return currentCycle.lotId;
            }
            
            // Solo come ultimo fallback, usa il lotto dell'ultima operazione
            return fullOp?.lotId || null;
          })(),
          animalCount: fullOp?.animalCount || null,
          totalWeight: fullOp?.totalWeight || null,
          animalsPerKg: fullOp?.animalsPerKg || null,
          deadCount: fullOp?.deadCount || null,
          mortalityRate: fullOp?.mortalityRate || null,
          notes: fullOp?.notes || '',
          // Campi specifici per misura - usa dati reali se disponibili
          liveAnimals: (selectedOperationType === 'misura' && fullOp?.liveAnimals) ? fullOp.liveAnimals : null,
          sampleWeight: ((selectedOperationType === 'misura' || selectedOperationType === 'peso') && fullOp?.sampleWeight) ? fullOp.sampleWeight : null,
          totalSample: (selectedOperationType === 'misura' && fullOp?.totalSample) ? fullOp.totalSample : null,
          sizeId: fullOp?.sizeId || null,
          status: 'editing',
          errors: [],
          // Dati aggiuntivi cesta
          currentSize,
          averageWeight,
          lastOperationDate: lastOp?.date,
          lastOperationType: lastOp?.type,
          // ✅ IMPORTANTE: Aggiungi il campo lastOperation per l'inizializzazione del form
          lastOperation: lastOp
        };
      });
      
      // **ORDINAMENTO INTELLIGENTE** - Le migliori performance in alto
      const sortedRows = newRows.sort((a, b) => {
        // Score di performance (0-100, più alto = migliore)
        const scoreA = calculatePerformanceScore(a);
        const scoreB = calculatePerformanceScore(b);
        

        
        // Ordine decrescente: migliori performance prima
        return scoreB - scoreA;
      });

      setOperationRows(sortedRows);
      // Salva backup originale per sistema Undo
      setOriginalRows([...sortedRows]);
      // Reset righe salvate per nuova sessione
      setSavedRows(new Set());
    }
  }, [selectedFlupsyId, selectedOperationType, operationDate, baskets, sizes, operations, lots]);

  // **FUNZIONE UTILITY PER FORMATTAZIONE NUMERICA**
  const formatNumberWithSeparators = (value: number | null | undefined): string => {
    if (!value || value === 0) return '0';
    return value.toLocaleString('it-IT'); // Separatore di migliaia italiano (punto)
  };

  // **CALCOLO PERFORMANCE INTELLIGENTE**
  const calculatePerformanceScore = (row: OperationRowData): number => {
    let score = 0;
    
    // 1. CRESCITA - Taglia (30% del punteggio)
    // Taglie più grandi = animali cresciuti meglio = migliore performance
    const sizeScore = (() => {
      const size = row.currentSize;
      if (size === 'TP-7000' || size === 'TP-10000') return 100; // Taglie grandi
      if (size === 'TP-5000') return 80; // Taglia media-grande
      if (size === 'TP-3000' || size === 'TP-3500') return 60; // Taglia media
      if (size === 'TP-1000' || size === 'TP-1500') return 40; // Taglia piccola
      return 20; // N/A o sconosciuta
    })();
    score += sizeScore * 0.3;

    // 2. DENSITÀ POPOLAZIONE - Numero animali (25% del punteggio)
    // Più animali = maggiore produttività = migliore performance
    const animalCount = row.animalCount || 0;
    const populationScore = Math.min(100, (animalCount / 100000) * 100); // 100k animali = 100%
    score += populationScore * 0.25;

    // 3. PESO MEDIO - Peso per animale (15% del punteggio)  
    // Animali più pesanti = migliore crescita = migliore performance
    const weightScore = Math.min(100, ((row.averageWeight || 0) / 1000) * 100); // 1g = 100%
    score += weightScore * 0.15;

    // 4. MORTALITÀ - Fattore critico (25% del punteggio)
    // Mortalità bassa = migliore performance, mortalità alta = penalità severa
    const mortalityRate = (() => {
      // Cerca ultima operazione con mortalità per questa cesta
      const basketOps = ((operations as any[]) || []).filter((op: any) => op.basketId === row.basketId);
      const lastOpWithMortality = basketOps
        .filter((op: any) => op.mortalityRate != null && op.mortalityRate >= 0)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      return lastOpWithMortality?.mortalityRate || 0;
    })();
    
    const mortalityScore = (() => {
      if (mortalityRate >= 20) return 0;   // >20% = CRITICO (0 punti)
      if (mortalityRate >= 15) return 20;  // 15-20% = ALTO (20 punti)
      if (mortalityRate >= 10) return 40;  // 10-15% = MEDIO-ALTO (40 punti)
      if (mortalityRate >= 5) return 70;   // 5-10% = ACCETTABILE (70 punti)
      return 100;                          // <5% = OTTIMO (100 punti)
    })();
    score += mortalityScore * 0.25;

    // 5. ETÀ CICLO - Operazioni recenti (5% del punteggio)
    // Operazioni più recenti = ciclo più attivo = migliore gestione
    const daysSinceLastOp = row.lastOperationDate ? 
      Math.floor((new Date().getTime() - new Date(row.lastOperationDate).getTime()) / (1000 * 60 * 60 * 24)) : 30;
    const ageScore = Math.max(0, 100 - (daysSinceLastOp * 5)); // -5 punti per giorno
    score += ageScore * 0.05;

    // **ANALISI PREDITTIVA TREND** - Nuovo fattore AI
    const trendAnalysis = analyzeTrendPrediction(row);
    const trendMultiplier = trendAnalysis.multiplier;
    const finalScore = score * trendMultiplier;

    return Math.round(finalScore * 100) / 100; // Arrotonda a 2 decimali
  };

  // **ANALISI PREDITTIVA TREND - AI ENHANCEMENT**
  const analyzeTrendPrediction = (row: OperationRowData): {
    trend: 'miglioramento' | 'stabile' | 'peggioramento' | 'critico';
    multiplier: number;
    confidence: number;
    details: string;
  } => {
    // Recupera le ultime 5 operazioni per questa cesta (ordinate dalla più recente)
    const basketOps = ((operations as any[]) || [])
      .filter((op: any) => op.basketId === row.basketId)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    // Se non ci sono abbastanza dati storici, applica moltiplicatore neutro
    if (basketOps.length < 2) {
      return {
        trend: 'stabile',
        multiplier: 1.0,
        confidence: 0,
        details: 'Dati insufficienti per analisi trend'
      };
    }

    let trendScore = 0;
    let indicators = 0;
    let details: string[] = [];

    // 1. TREND MORTALITÀ (peso massimo)
    const mortalityValues = basketOps
      .filter(op => op.mortalityRate != null)
      .map(op => op.mortalityRate)
      .slice(0, 3); // Ultime 3 operazioni con mortalità

    if (mortalityValues.length >= 2) {
      const recent = mortalityValues[0];
      const previous = mortalityValues[1];
      const older = mortalityValues.length > 2 ? mortalityValues[2] : previous;

      // Calcola trend mortalità
      if (recent > previous && previous >= older) {
        // Peggioramento costante
        const increase = recent - older;
        if (increase > 10) {
          trendScore -= 3; // Penalità severa
          details.push(`Mortalità in peggioramento grave: +${increase.toFixed(1)}%`);
        } else if (increase > 5) {
          trendScore -= 2; // Penalità media
          details.push(`Mortalità in peggioramento: +${increase.toFixed(1)}%`);
        } else {
          trendScore -= 1; // Penalità lieve
          details.push(`Leggero peggioramento mortalità: +${increase.toFixed(1)}%`);
        }
      } else if (recent < previous && previous > older) {
        // Miglioramento
        const decrease = older - recent;
        if (decrease > 5) {
          trendScore += 2; // Bonus importante
          details.push(`Mortalità in forte miglioramento: -${decrease.toFixed(1)}%`);
        } else {
          trendScore += 1; // Bonus moderato
          details.push(`Mortalità in miglioramento: -${decrease.toFixed(1)}%`);
        }
      }
      indicators++;
    }

    // 2. TREND POPOLAZIONE (crescita animali)
    const animalCounts = basketOps
      .filter(op => op.animalCount != null && op.animalCount > 0)
      .map(op => op.animalCount)
      .slice(0, 3);

    if (animalCounts.length >= 2) {
      const recent = animalCounts[0];
      const previous = animalCounts[1];
      
      const changePercent = ((recent - previous) / previous) * 100;
      
      if (changePercent < -30) {
        // Perdita massiva di popolazione
        trendScore -= 3;
        details.push(`Perdita massiva popolazione: ${changePercent.toFixed(1)}%`);
      } else if (changePercent < -15) {
        // Perdita significativa
        trendScore -= 2;
        details.push(`Perdita popolazione: ${changePercent.toFixed(1)}%`);
      } else if (changePercent > 10) {
        // Crescita positiva (improbabile ma possibile)
        trendScore += 1;
        details.push(`Crescita popolazione: +${changePercent.toFixed(1)}%`);
      }
      indicators++;
    }

    // 3. TREND PESO MEDIO (crescita individuale)
    const weightValues = basketOps
      .filter(op => op.averageWeight != null && op.averageWeight > 0)
      .map(op => op.averageWeight)
      .slice(0, 3);

    if (weightValues.length >= 2) {
      const recent = weightValues[0];
      const previous = weightValues[1];
      const older = weightValues.length > 2 ? weightValues[2] : previous;

      // Verifica trend crescita peso
      if (recent > previous && previous >= older) {
        const growth = ((recent - older) / older) * 100;
        if (growth > 20) {
          trendScore += 2; // Crescita eccellente
          details.push(`Crescita peso eccellente: +${growth.toFixed(1)}%`);
        } else if (growth > 10) {
          trendScore += 1; // Crescita buona
          details.push(`Buona crescita peso: +${growth.toFixed(1)}%`);
        }
      } else if (recent < previous) {
        // Perdita peso (problema serio)
        const loss = ((previous - recent) / previous) * 100;
        trendScore -= 2;
        details.push(`Perdita peso preoccupante: -${loss.toFixed(1)}%`);
      }
      indicators++;
    }

    // 4. TREND TEMPORALE (frequenza operazioni)
    if (basketOps.length >= 3) {
      const dates = basketOps.map(op => new Date(op.date));
      const daysBetween1 = Math.floor((dates[0].getTime() - dates[1].getTime()) / (1000 * 60 * 60 * 24));
      const daysBetween2 = Math.floor((dates[1].getTime() - dates[2].getTime()) / (1000 * 60 * 60 * 24));

      if (daysBetween1 > daysBetween2 * 2) {
        // Operazioni sempre più rade
        trendScore -= 1;
        details.push('Frequenza operazioni in diminuzione');
      } else if (daysBetween1 < daysBetween2 * 0.5) {
        // Operazioni più frequenti (gestione attiva)
        trendScore += 1;
        details.push('Gestione più attiva e frequente');
      }
      indicators++;
    }

    // Calcola il moltiplicatore finale basato sul trend score
    let multiplier = 1.0;
    let trend: 'miglioramento' | 'stabile' | 'peggioramento' | 'critico' = 'stabile';
    
    if (trendScore >= 3) {
      multiplier = 1.15; // Bonus +15% per trend molto positivo
      trend = 'miglioramento';
    } else if (trendScore >= 1) {
      multiplier = 1.08; // Bonus +8% per trend positivo
      trend = 'miglioramento';
    } else if (trendScore <= -4) {
      multiplier = 0.75; // Penalità -25% per trend molto negativo
      trend = 'critico';
    } else if (trendScore <= -2) {
      multiplier = 0.85; // Penalità -15% per trend negativo
      trend = 'peggioramento';
    }

    // Calcola confidenza basata sul numero di indicatori
    const confidence = Math.min(100, (indicators / 4) * 100);

    return {
      trend,
      multiplier,
      confidence,
      details: details.length > 0 ? details.join('; ') : 'Trend stabile senza variazioni significative'
    };
  };

  // **ANALISI AI PER CESTE CRITICHE**
  const generateCriticalAnalysis = (row: OperationRowData): {
    issues: string[];
    recommendations: string[];
    urgency: string;
    urgencyReason: string;
  } => {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let urgencyLevel = 'Normale';
    let urgencyReason = '';

    // Analizza le operazioni storiche per questa cesta
    const basketOps = ((operations as any[]) || [])
      .filter((op: any) => op.basketId === row.basketId)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 1. ANALISI MORTALITÀ
    const latestMortality = basketOps.find((op: any) => op.mortalityRate != null)?.mortalityRate || 0;
    if (latestMortality >= 20) {
      issues.push(`Mortalità critica: ${latestMortality.toFixed(1)}% (normale <5%)`);
      recommendations.push('Controllo immediato delle condizioni ambientali');
      recommendations.push('Verificare ossigenazione e temperatura dell\'acqua');
      recommendations.push('Ispezione sanitaria degli animali');
      urgencyLevel = 'CRITICA';
      urgencyReason = 'Mortalità superiore al 20% richiede intervento immediato';
    } else if (latestMortality >= 10) {
      issues.push(`Mortalità elevata: ${latestMortality.toFixed(1)}% (normale <5%)`);
      recommendations.push('Monitoraggio frequente delle condizioni');
      urgencyLevel = 'Alta';
      urgencyReason = 'Trend di mortalità preoccupante';
    }

    // 2. ANALISI TREND POPOLAZIONE
    if (basketOps.length >= 2) {
      const currentCount = basketOps[0]?.animalCount || 0;
      const previousCount = basketOps[1]?.animalCount || 0;
      
      if (previousCount > 0 && currentCount < previousCount * 0.7) {
        const loss = Math.round(((previousCount - currentCount) / previousCount) * 100);
        issues.push(`Perdita significativa di popolazione: -${loss}% dall'ultima operazione`);
        recommendations.push('Verificare accuratezza del conteggio');
        recommendations.push('Indagare possibili cause di perdite massive');
        if (urgencyLevel === 'Normale') {
          urgencyLevel = 'Alta';
          urgencyReason = 'Perdita anomala di popolazione';
        }
      }
    }

    // 3. ANALISI CRESCITA
    const currentAnimalsPerKg = row.animalsPerKg || 0;
    if (currentAnimalsPerKg > 50000) {
      issues.push(`Crescita molto lenta: ${formatNumberWithSeparators(currentAnimalsPerKg)} anim/kg`);
      recommendations.push('Valutare qualità del mangime');
      recommendations.push('Controllare densità di popolazione');
      if (urgencyLevel === 'Normale') urgencyLevel = 'Media';
    }

    // 4. ANALISI PESO MEDIO
    const avgWeight = row.averageWeight || 0;
    if (avgWeight < 0.01) {
      issues.push(`Peso medio molto basso: ${avgWeight.toFixed(3)}g per animale`);
      recommendations.push('Aumentare frequenza alimentazione');
      recommendations.push('Verificare qualità nutrizionale del mangime');
    }

    // 5. ANALISI TEMPORALE
    const daysSinceLastOp = row.lastOperationDate ? 
      Math.floor((new Date().getTime() - new Date(row.lastOperationDate).getTime()) / (1000 * 60 * 60 * 24)) : 999;
    
    if (daysSinceLastOp > 14) {
      issues.push(`Nessuna operazione da ${daysSinceLastOp} giorni`);
      recommendations.push('Programmare controllo e misurazione');
      if (urgencyLevel === 'Normale') urgencyLevel = 'Media';
    }

    // 6. ANALISI TREND PERFORMANCE
    if (basketOps.length >= 3) {
      const recent = basketOps.slice(0, 3);
      const mortalityTrend = recent.map(op => op.mortalityRate || 0);
      
      if (mortalityTrend[0] > mortalityTrend[1] && mortalityTrend[1] > mortalityTrend[2]) {
        issues.push('Trend di mortalità in peggioramento costante');
        recommendations.push('Intervento preventivo immediato');
        if (urgencyLevel !== 'CRITICA') urgencyLevel = 'Alta';
      }
    }

    // Raccomandazioni generali se nessun problema specifico
    if (issues.length === 0) {
      issues.push('Performance complessiva sotto la media');
      recommendations.push('Revisione generale delle condizioni di allevamento');
    }

    if (!urgencyReason) {
      urgencyReason = 'Monitoraggio standard per miglioramento performance';
    }

    return {
      issues,
      recommendations,
      urgency: urgencyLevel,
      urgencyReason
    };
  };

  // **CALCOLO PREVISIONI DI CRESCITA CON DATA TARGET**
  const calculateGrowthPrediction = (basketId: number, targetSizeId: number, targetDate: string): {
    willReachTarget: boolean;
    daysToTarget?: number;
    projectedAnimalsPerKg?: number;
    currentAnimalsPerKg?: number;
  } => {
    if (!targetSizeId || !targetDate || !sgrData) {
      return { willReachTarget: false };
    }

    // Calcola giorni disponibili dalla data odierna alla data target
    const today = new Date();
    const target = new Date(targetDate);
    const daysAvailable = Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysAvailable <= 0) {
      return { willReachTarget: false }; // Data target nel passato
    }

    // Trova operazione più recente della cesta
    const basketOperations = ((operations as any[]) || []).filter((op: any) => op.basketId === basketId);
    if (basketOperations.length === 0) {
      return { willReachTarget: false };
    }

    // Ordina per data e prendi la più recente
    const sortedOps = basketOperations.sort((a: any, b: any) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const lastOp = sortedOps[0];

    if (!lastOp.animalsPerKg || !lastOp.totalWeight || !lastOp.animalCount) {
      return { willReachTarget: false };
    }

    // Trova taglia target
    const targetSize = ((sizes as any[]) || []).find((s: any) => s.id === targetSizeId);
    if (!targetSize || !targetSize.maxAnimalsPerKg) {
      return { willReachTarget: false };
    }

    // Calcola SGR da usare (usa il primo disponibile per ora)
    const sgrValue = ((sgrData as any[]) || [])[0]?.percentage || 8.3; // Default dal database: 8.3% GIORNALIERO
    const dailySgrRate = sgrValue; // Il valore SGR è già giornaliero!

    // Calcolo proiezione crescita
    const currentWeight = lastOp.totalWeight / lastOp.animalCount; // Peso medio attuale per animale (in grammi)
    const currentAnimalsPerKg = lastOp.animalsPerKg;
    const targetMaxAnimalsPerKg = targetSize.maxAnimalsPerKg; // USA MAX_ANIMALS_PER_KG come soglia da superare

    // DEBUG: Log dei valori per debugging
    console.log(`🔍 PREVISIONE CRESCITA Cesta ${basketId}:`, {
      currentAnimalsPerKg,
      targetMaxAnimalsPerKg,
      targetSizeCode: targetSize.code,
      currentWeight: currentWeight.toFixed(6),
      sgrValue: `${sgrValue}% GIORNALIERO`,
      dailySgrRate: `${dailySgrRate}%`,
      daysAvailable,
      targetDate
    });

    // Verifica se ha già raggiunto la taglia target (deve essere SOTTO il max)
    if (currentAnimalsPerKg <= targetMaxAnimalsPerKg) {
      console.log(`✅ Cesta ${basketId} ha già raggiunto il target ${targetSize.code}`);
      return {
        willReachTarget: true,
        daysToTarget: 0,
        projectedAnimalsPerKg: currentAnimalsPerKg,
        currentAnimalsPerKg
      };
    }

    // Simula crescita giornaliera per trovare quando raggiungerà la taglia target
    let projectedWeight = currentWeight;
    let projectedAnimalsPerKg = currentAnimalsPerKg;
    let daysProjected = 0;

    while (daysProjected < daysAvailable && projectedAnimalsPerKg > targetMaxAnimalsPerKg) {
      daysProjected++;
      
      // Applica crescita giornaliera: peso cresce del SGR%
      projectedWeight = projectedWeight * (1 + dailySgrRate / 100);
      
      // Calcola nuovi animali/kg: quando peso aumenta, animali/kg diminuisce
      projectedAnimalsPerKg = Math.round(1000 / projectedWeight);
      
      // Log ogni settimana per debugging
      if (daysProjected % 7 === 0) {
        console.log(`📈 Cesta ${basketId} - Giorno ${daysProjected}: ${projectedAnimalsPerKg} anim/kg (peso: ${projectedWeight.toFixed(6)}g)`);
      }
      
      // Verifica se ha raggiunto la taglia target (deve essere SOTTO il max)
      if (projectedAnimalsPerKg <= targetMaxAnimalsPerKg) {
        console.log(`🎯 Cesta ${basketId} raggiungerà target ${targetSize.code} in ${daysProjected} giorni`);
        return {
          willReachTarget: true,
          daysToTarget: daysProjected,
          projectedAnimalsPerKg,
          currentAnimalsPerKg
        };
      }
    }

    // Alla data target, verifica se avrà raggiunto la taglia
    const willReachByTargetDate = projectedAnimalsPerKg <= targetMaxAnimalsPerKg;
    console.log(`📊 Cesta ${basketId} finale: ${projectedAnimalsPerKg} anim/kg, raggiungerà target ${targetSize.code}: ${willReachByTargetDate}`);

    return {
      willReachTarget: willReachByTargetDate,
      projectedAnimalsPerKg,
      currentAnimalsPerKg
    };
  };

  // Calcola animali totali che raggiungeranno il target
  const calculateTargetTotals = (): { totalAnimals: number; basketCount: number } => {
    if (!targetSizeId || !targetDate) {
      return { totalAnimals: 0, basketCount: 0 };
    }

    let totalAnimals = 0;
    let basketCount = 0;

    operationRows.forEach(row => {
      const prediction = calculateGrowthPrediction(row.basketId, targetSizeId, targetDate);
      if (prediction.willReachTarget) {
        totalAnimals += row.animalCount || 0;
        basketCount++;
      }
    });

    return { totalAnimals, basketCount };
  };

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
      physicalNumber: row.physicalNumber, // ✅ Aggiungi numero fisico del cestello
      type: selectedOperationType,
      date: operationDate, // Usa la data selezionata nei controlli
      // Distribuisci lotti diversi tra cestelli diversi
      lotId: ((lots as any[]) || []).length > 0 
        ? ((lots as any[]) || [])[basketId % ((lots as any[]) || []).length]?.id 
        : 1,
      sampleWeight: undefined,
      liveAnimals: undefined,
      deadCount: undefined,
      totalWeight: undefined, // ✅ Lascia vuoto, il valore sarà nel placeholder
      animalCount: undefined,
      notes: '',
      // ✅ Memorizza il valore suggerito per il placeholder
      suggestedTotalWeight: row.lastOperation?.totalWeight || undefined
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

    // Validazione completa del form (include anche validazione date)
    const validation = validateEditingForm();
    if (!validation.valid) {
      // Mostra tutti gli errori all'utente
      toast({
        title: "Errori di validazione",
        description: validation.errors.join('; '),
        variant: "destructive"
      });
      return;
    }

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
    
    console.log('🧮 EDITING FORM: Valori dal form popup:', editingForm);
    console.log('🔄 NEW ROW PRIMA dei calcoli:', newRow);
    
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
        const calculatedAnimalCount = Math.round((liveAnimals / sampleWeight) * totalWeight);
        newRow.animalCount = calculatedAnimalCount;
        console.log(`🧮 CALCOLO MISURA: animalCount = (${liveAnimals} / ${sampleWeight}) * ${totalWeight} = ${calculatedAnimalCount}`);
      }
      
      if (totalSample > 0) {
        newRow.mortalityRate = Math.round((deadCount / totalSample) * 100 * 100) / 100;
      }
      
      if (sampleWeight > 0 && liveAnimals > 0) {
        const animalsPerKgValue = Math.round((liveAnimals / sampleWeight) * 1000);
        newRow.animalsPerKg = animalsPerKgValue;
        console.log(`🧮 CALCOLO MISURA: animalsPerKg = (${liveAnimals} / ${sampleWeight}) * 1000 = ${animalsPerKgValue}`);
        
        // Calcola automaticamente la taglia usando la stessa logica del modulo Operazioni
        const sizesArray = Array.isArray(sizes) ? sizes : [];
        if (sizesArray.length > 0) {
          const { findSizeByAnimalsPerKg } = await import("@/lib/utils");
          const selectedSize = findSizeByAnimalsPerKg(animalsPerKgValue, sizesArray);
          if (selectedSize) {
            newRow.sizeId = selectedSize.id;
            console.log(`🧮 CALCOLO MISURA: Taglia calcolata automaticamente: ${selectedSize.code} (ID: ${selectedSize.id})`);
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
        newRow.averageWeight = Math.round(averageWeight * 1000) / 1000;
        
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
    
    console.log('✅ NEW ROW FINALE con calcoli completati:', newRow);
    
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
      if (!row.animalCount || row.animalCount <= 0) {
        errors.push('Numero animali richiesto per operazione peso');
      }
      // NOTA: sampleWeight NON è richiesto per operazioni peso, solo per misura
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
    
    // DEBUGGING: Analizza tutte le righe per questo basketId
    const allRowsForBasket = operationRows.filter(r => r.basketId === basketId);
    console.log(`🔍 SAVE DEBUG: Trovate ${allRowsForBasket.length} righe per basketId ${basketId}:`);
    allRowsForBasket.forEach((r, index) => {
      console.log(`  [${index}] isNewRow: ${(r as any).isNewRow}, Animali: ${r.animalCount}, Peso: ${r.totalWeight}, Anim/kg: ${r.animalsPerKg}, Taglia: ${r.sizeId}`);
    });
    
    // Cerca prima la riga nuova (isNewRow: true), se non esiste prendi l'originale
    const row = operationRows.find(r => r.basketId === basketId && (r as any).isNewRow) || 
                operationRows.find(r => r.basketId === basketId);
    if (!row) {
      console.error('❌ Spreadsheet: Riga non trovata per basketId:', basketId);
      return;
    }
    
    // DEBUGGING: Mostra quale riga è stata selezionata
    console.log(`✅ SAVE DEBUG: Riga selezionata - isNewRow: ${(row as any).isNewRow}, Animali: ${row.animalCount}, Peso: ${row.totalWeight}, Anim/kg: ${row.animalsPerKg}, Taglia: ${row.sizeId}`);
    
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
    
    // Trova il cestello dai dati caricati
    const basket = ((baskets as any[]) || []).find((b: any) => b.id === basketId);
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
      // lotId è sempre richiesto per operazioni su ceste attive - USA IL LOTTO DAL CICLO ATTIVO!
      lotId: row.lotId || (() => {
        console.log(`🔍 LOTTO DEBUG - Cestello ${row.basketId}: Ricerca lotto in corso...`);
        
        // PRIORITÀ 1: Cerca il lotto dal ciclo ATTIVO del cestello (più affidabile)
        const activeCycle = ((cycles as any[]) || []).find((c: any) => 
          c.basketId === row.basketId && c.state === 'active' && !c.endDate
        );
        if (activeCycle?.lotId) {
          console.log(`✅ Cestello ${row.basketId}: Lotto ${activeCycle.lotId} trovato dal CICLO ATTIVO ${activeCycle.id}`);
          return activeCycle.lotId;
        }
        
        // PRIORITÀ 2: Cerca il lotto dall'operazione di prima-attivazione
        const basketOperations = ((operations as any[]) || []).filter((op: any) => op.basketId === row.basketId);
        const activationOp = basketOperations.find((op: any) => op.type === 'prima-attivazione');
        if (activationOp?.lotId) {
          console.log(`✅ Cestello ${row.basketId}: Lotto ${activationOp.lotId} trovato dalla PRIMA-ATTIVAZIONE`);
          return activationOp.lotId;
        }
        
        // PRIORITÀ 3: Cerca il lotto dal ciclo tramite currentCycleId (fallback)
        const currentCycle = ((cycles as any[]) || []).find((c: any) => c.id === basket.currentCycleId);
        if (currentCycle?.lotId) {
          console.log(`✅ Cestello ${row.basketId}: Lotto ${currentCycle.lotId} trovato dal CICLO ${basket.currentCycleId}`);
          return currentCycle.lotId;
        }
        
        // ULTIMO RESORT: Cerca l'ultimo lotto usato in qualsiasi operazione di questo cestello
        const basketOpsWithLot = basketOperations.filter((op: any) => op.lotId).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        if (basketOpsWithLot.length > 0) {
          const lastLot = basketOpsWithLot[0].lotId;
          console.log(`⚠️ Cestello ${row.basketId}: Usando ULTIMO LOTTO ${lastLot} dall'operazione più recente`);
          return lastLot;
        }
        
        // ERRORE CRITICO: Non dovrebbe mai succedere per cestelli attivi
        console.error(`❌ ERRORE CRITICO - Cestello ${row.basketId}: Nessun lotto trovato! Dati disponibili:`, {
          activeCycle,
          activationOp,
          currentCycle,
          basketOpsWithLot: basketOpsWithLot.length,
          basketCurrentCycleId: basket.currentCycleId
        });
        throw new Error(`Impossibile determinare il lotto per il cestello ${row.basketId}. Verifica che il cestello abbia un ciclo attivo.`);
      })(), // integer lot_id (obbligatorio per operazioni normali)
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
      }),
      
      // FLAG SPECIALE: Indica che questa richiesta arriva dal modulo Spreadsheet Operations
      // e i valori calcolati NON devono essere sovrascritti dal backend
      _spreadsheetMode: true
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
  
  // Undo singolo: riporta una riga specifica allo stato originale o cancella riga nuova
  const undoRow = (basketId: number) => {
    console.log('🔄 UNDO: Inizio undo per basketId:', basketId);
    
    // DEBUG: Mostra tutte le righe per questo basketId
    const allRowsForBasket = operationRows.filter(r => r.basketId === basketId);
    console.log(`🔍 UNDO: Trovate ${allRowsForBasket.length} righe per basketId ${basketId}:`);
    allRowsForBasket.forEach((r, index) => {
      console.log(`  [${index}] isNewRow: ${(r as any).isNewRow}, physicalNumber: ${r.physicalNumber}`);
    });
    
    // Prima cerca se esiste una riga nuova (isNewRow: true) per questo basketId
    const newRow = operationRows.find(r => r.basketId === basketId && (r as any).isNewRow);
    
    if (newRow) {
      console.log('🗑️ UNDO: Trovata riga nuova, la rimuovo');
      // Rimuovi SOLO la riga nuova dalla lista
      setOperationRows(prev => prev.filter(row => 
        !(row.basketId === basketId && (row as any).isNewRow)
      ));
      
      // Rimuovi dalla lista salvate
      setSavedRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(basketId);
        return newSet;
      });
      
      toast({
        title: "Riga cancellata",
        description: `Riga appena creata per cestello #${newRow.physicalNumber} eliminata`,
      });
      
      return;
    }
    
    // Se è una riga originale, ripristina ai valori originali
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
    console.log('🔵 SAVE SINGLE ROW: Inizio salvataggio singolo per basketId:', basketId);
    
    // DEBUGGING: Analizza tutte le righe per questo basketId
    const allRowsForBasket = operationRows.filter(r => r.basketId === basketId);
    console.log(`🔍 SAVE SINGLE ROW: Trovate ${allRowsForBasket.length} righe per basketId ${basketId}:`);
    allRowsForBasket.forEach((r, index) => {
      console.log(`  [${index}] isNewRow: ${(r as any).isNewRow}, Animali: ${r.animalCount}, Peso: ${r.totalWeight}, Anim/kg: ${r.animalsPerKg}, Taglia: ${r.sizeId}`);
    });
    
    // Cerca prima la riga nuova (isNewRow: true), se non esiste prendi l'originale
    const row = operationRows.find(r => r.basketId === basketId && (r as any).isNewRow) || 
                operationRows.find(r => r.basketId === basketId);
    if (!row) {
      console.error('❌ SAVE SINGLE ROW: Riga non trovata per basketId:', basketId);
      return;
    }
    
    // DEBUGGING: Mostra quale riga è stata selezionata
    console.log(`✅ SAVE SINGLE ROW: Riga selezionata - isNewRow: ${(row as any).isNewRow}, Animali: ${row.animalCount}, Peso: ${row.totalWeight}, Anim/kg: ${row.animalsPerKg}, Taglia: ${row.sizeId}`);
    
    const errors = validateRow(row);
    if (errors.length > 0) {
      toast({
        title: "Impossibile salvare",
        description: `Errori: ${errors.join(', ')}`,
        variant: "destructive"
      });
      return;
    }
    
    console.log('🔵 SAVE SINGLE ROW: Chiamando saveRow...');
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

  // Calcola sintesi previsioni per popup
  const calculatePredictionSummary = () => {
    if (!targetSizeId || !targetDate) return;

    const summary = {
      targetSizeInfo: ((sizes as any[]) || []).find((s: any) => s.id === targetSizeId),
      totalAnimalsAtTarget: 0,
      basketsSummary: [] as any[],
      sizeBreakdown: {} as any
    };

    // Calcola per ogni cestello
    operationRows.forEach(row => {
      const prediction = calculateGrowthPrediction(row.basketId, targetSizeId, targetDate);
      
      if (prediction.willReachTarget) {
        // Calcola animali disponibili al target (stima basata su crescita)
        const animalsAtTarget = row.animalCount || 0;
        
        const currentAnimalsPerKg = row.animalsPerKg || 0;
        const currentSize = ((sizes as any[]) || []).find((s: any) => 
          currentAnimalsPerKg >= s.minAnimalsPerKg && currentAnimalsPerKg <= s.maxAnimalsPerKg
        );
        
        // Usa projectedAnimalsPerKg come valore finale stimato
        const finalAnimalsPerKg = prediction.projectedAnimalsPerKg || currentAnimalsPerKg;
        const finalSize = ((sizes as any[]) || []).find((s: any) => 
          finalAnimalsPerKg >= s.minAnimalsPerKg && finalAnimalsPerKg <= s.maxAnimalsPerKg
        );

        summary.totalAnimalsAtTarget += animalsAtTarget;
        
        summary.basketsSummary.push({
          basketNumber: row.physicalNumber,
          currentAnimals: row.animalCount,
          animalsAtTarget: animalsAtTarget,
          currentSize: currentSize?.code || 'N/A',
          finalSize: finalSize?.code || 'N/A',
          daysToTarget: prediction.daysToTarget || 0
        });

        // Breakdown per taglia finale
        const finalSizeCode = finalSize?.code || 'N/A';
        if (!summary.sizeBreakdown[finalSizeCode]) {
          summary.sizeBreakdown[finalSizeCode] = 0;
        }
        summary.sizeBreakdown[finalSizeCode] += animalsAtTarget;
      }
    });

    setPredictionSummary(summary);
  };

  // Esporta dati in Excel
  const exportToExcel = () => {
    if (!predictionSummary) return;

    const data = [
      ['Sintesi Previsioni di Crescita'],
      ['Target:', predictionSummary.targetSizeInfo?.code || 'N/A'],
      ['Data Target:', targetDate],
      [''],
      ['Cestello', 'Animali Attuali', 'Animali al Target', 'Taglia Attuale', 'Taglia Finale', 'Giorni al Target'],
      ...predictionSummary.basketsSummary.map((basket: any) => [
        `#${basket.basketNumber}`,
        basket.currentAnimals,
        basket.animalsAtTarget,
        basket.currentSize,
        basket.finalSize,
        basket.daysToTarget
      ]),
      [''],
      ['TOTALE ANIMALI AL TARGET:', predictionSummary.totalAnimalsAtTarget],
      [''],
      ['Breakdown per Taglia Finale:'],
      ...Object.entries(predictionSummary.sizeBreakdown).map(([size, count]) => [size, count])
    ];

    // Crea CSV
    const csvContent = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `previsioni_crescita_${targetDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    toast({
      title: "Export completato",
      description: "File CSV scaricato con successo",
    });
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
    <div className="container mx-auto py-2 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-xl font-bold">Spreadsheet Operazioni</h1>
          <p className="text-xs text-gray-600">Inserimento rapido a foglio elettronico</p>
          
          {/* Legenda Performance ottimizzata */}
          <div className="mt-1 flex items-center gap-3 p-1.5 bg-gray-50 rounded-md border text-xs">
            <span className="font-medium text-gray-600">Performance:</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                <span className="text-green-600">🏆</span>
                <span className="text-gray-600">Eccellente (80%+)</span>
              </div>
              <div className="flex items-center gap-0.5">
                <span className="text-yellow-600">⭐</span>
                <span className="text-gray-600">Buona (60-79%)</span>
              </div>
              <div className="flex items-center gap-0.5">
                <span className="text-orange-600">⚠️</span>
                <span className="text-gray-600">Media (40-59%)</span>
              </div>
              <div className="flex items-center gap-0.5">
                <span className="text-red-600">🔴</span>
                <span className="text-gray-600">Attenzione (&lt;40%)</span>
              </div>
            </div>
            
            {/* Statistiche salvate integrate */}
            <div className="flex items-center gap-2 ml-auto">
              <div className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                {stats.saved}/{stats.total} salvate
              </div>
              {stats.errors > 0 && (
                <div className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded">
                  {stats.errors} errori
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Controlli compatti */}
      <div className="bg-white border rounded-lg p-2 shadow-sm">
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

      {/* Controlli Previsioni di Crescita */}
      {selectedFlupsyId && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-3 shadow-sm">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-purple-700">📈 Previsioni Crescita</span>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Taglia Target</label>
              <Select value={targetSizeId?.toString() || ""} onValueChange={(value) => setTargetSizeId(Number(value))}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="Seleziona taglia" />
                </SelectTrigger>
                <SelectContent>
                  {((sizes as any[]) || []).map((size: any) => (
                    <SelectItem key={size.id} value={size.id.toString()}>
                      {size.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Data Target</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]} // Non permette date passate
                className="w-32 h-8 px-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
            </div>

            {/* Pulsante Calcola Previsioni */}
            {targetSizeId && targetDate && (
              <button
                onClick={() => {
                  setPredictionsEnabled(!predictionsEnabled);
                  if (!predictionsEnabled) {
                    // Calcola sintesi quando si abilitano le previsioni
                    calculatePredictionSummary();
                    setShowPredictionPopup(true);
                  }
                }}
                className={`h-8 px-3 text-xs font-medium rounded-md flex items-center gap-1 transition-all ${
                  predictionsEnabled 
                    ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-md' 
                    : 'bg-purple-100 text-purple-700 hover:bg-purple-200 border border-purple-300'
                }`}
              >
                <span>📊</span>
                {predictionsEnabled ? 'Nascondi' : 'Calcola'}
              </button>
            )}

            {/* Totalizzatore */}
            {targetSizeId && targetDate && predictionsEnabled && (
              <div className="ml-auto flex items-center gap-4 bg-white rounded-lg px-3 py-2 border border-purple-200">
                <div className="text-xs text-gray-600">
                  Raggiungeranno <span className="font-medium text-purple-700">
                    {((sizes as any[]) || []).find((s: any) => s.id === targetSizeId)?.code}
                  </span> entro il {new Date(targetDate).toLocaleDateString('it-IT')}:
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-bold text-purple-700">
                    {formatNumberWithSeparators(calculateTargetTotals().totalAnimals)} animali
                  </div>
                  <div className="text-xs text-gray-500">
                    ({calculateTargetTotals().basketCount} ceste)
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tabella spreadsheet compatta */}
      {selectedFlupsyId && operationRows.length > 0 && (
        <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
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
            
            {/* Container scrollabile mobile-friendly */}
            <div className="w-full overflow-x-auto overflow-y-visible" style={{ 
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'thin' 
            }}>
              <div className="min-w-[1200px]">
                {/* Header tabella compatto con larghezze esatte per allineamento perfetto */}
                <div className="flex border-b bg-gray-100 text-xs font-medium text-gray-700 sticky top-0 z-10" style={{fontSize: '10px'}}>
                  <div style={{width: '70px'}} className="px-2 py-1.5 border-r bg-white sticky left-0 z-20 shadow-r">Cesta</div>
                  <div style={{width: '40px'}} className="px-1 py-1.5 border-r text-center">Stato</div>

                  <div style={{width: '80px'}} className="px-1 py-1.5 border-r">Taglia</div>
                  <div style={{width: '60px'}} className="px-1 py-1.5 border-r">P.Med(mg)</div>
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
              {operationRows.map((row, index) => {
                // Calcola previsione di crescita per questa cesta (solo se abilitato)
                const growthPrediction = targetSizeId && targetDate && predictionsEnabled ? 
                  calculateGrowthPrediction(row.basketId, targetSizeId, targetDate) : 
                  { willReachTarget: false };

                return (
                <div key={`${row.basketId}-${index}-${(row as any).isNewRow ? 'new' : 'orig'}`} className="contents">
                  <div
                    onMouseEnter={() => setHoveredBasketGroup(row.basketId)}
                    onMouseLeave={() => setHoveredBasketGroup(null)}
                    className={`relative flex border-b text-xs hover:bg-gray-50 items-center ${
                      row.status === 'error' ? 'bg-red-50' : 
                      row.status === 'saved' ? 'bg-green-50' : 
                      row.status === 'saving' ? 'bg-yellow-50' : 'bg-white'
                    } ${
                      getAssociatedRows(row.basketId).length > 1 ? 'bg-blue-50/20' : ''
                    } ${
                      hoveredBasketGroup === row.basketId ? 'bg-blue-100/40' : ''
                    }`}
                  >
                    {/* Indicatore laterale colorato per operazioni associate */}
                    {getAssociatedRows(row.basketId).length > 1 && (
                      <div 
                        className={`absolute left-0 top-0 bottom-0 w-1 ${
                          isOriginalRow(row) 
                            ? 'bg-blue-500' 
                            : 'bg-green-500'
                        }`}
                        style={!isOriginalRow(row) ? {
                          background: 'repeating-linear-gradient(to bottom, #10b981 0px, #10b981 3px, transparent 3px, transparent 6px)'
                        } : {}}
                      />
                    )}

                    {/* Badge di stato per operazioni associate */}
                    {getAssociatedRows(row.basketId).length > 1 && (
                      <div className="absolute -top-1 left-2 z-20">
                        {isOriginalRow(row) ? (
                          <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-blue-100 text-blue-700 border-blue-300 font-medium">
                            ORIG
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-green-100 text-green-700 border-green-300 font-medium">
                            + NUOVA
                          </Badge>
                        )}
                      </div>
                    )}
                    {/* Colonna cestello fissa */}
                    <div 
                      style={{width: '70px'}}
                      className={`px-2 py-1 border-r flex items-center font-medium text-gray-700 sticky left-0 z-10 shadow-r cursor-pointer transition-colors ${
                        growthPrediction.willReachTarget 
                          ? 'bg-green-100 hover:bg-green-200' 
                          : 'bg-white hover:bg-blue-50'
                      }`}
                      onDoubleClick={(e) => handleDoubleClick(row.basketId, e)}
                      title="Doppio click per modificare operazione"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>#{row.physicalNumber}</span>
                        {(() => {
                          const perfScore = calculatePerformanceScore(row);
                          const color = perfScore >= 80 ? 'text-green-600' : 
                                       perfScore >= 60 ? 'text-yellow-600' : 
                                       perfScore >= 40 ? 'text-orange-600' : 'text-red-600';
                          
                          // Informazioni previsione crescita per tooltip (solo se abilitato)
                          const predictionInfo = targetSizeId && targetDate && predictionsEnabled ? 
                            calculateGrowthPrediction(row.basketId, targetSizeId, targetDate) : null;
                          
                          // Analisi AI per ceste critiche (performance < 40%)
                          const criticalAnalysis = perfScore < 40 ? generateCriticalAnalysis(row) : null;
                          
                          // Analisi trend per tutte le ceste (per tooltip)
                          const trendData = analyzeTrendPrediction(row);
                          
                          return (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={`text-xs font-bold ${color} cursor-help`}>
                                    {perfScore >= 80 ? '🏆' : perfScore >= 60 ? '⭐' : perfScore >= 40 ? '⚠️' : '🔴'}
                                  </span>
                                </TooltipTrigger>
                                {criticalAnalysis && (
                                  <TooltipContent side="right" sideOffset={10} className="max-w-lg p-0 border-0 shadow-lg" style={{zIndex: 9999}}>
                                    <div className="bg-white rounded-lg border shadow-xl overflow-hidden" style={{zIndex: 9999}}>
                                      {/* Header critico */}
                                      <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-3">
                                        <div className="flex items-center gap-2">
                                          <div className="h-8 w-8 bg-white/20 rounded-full flex items-center justify-center">
                                            🚨
                                          </div>
                                          <div>
                                            <h4 className="font-semibold text-sm">Cesta #{row.physicalNumber} - ATTENZIONE</h4>
                                            <p className="text-xs opacity-90">Performance critica: {perfScore.toFixed(1)}/100</p>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Contenuto analisi */}
                                      <div className="p-4 space-y-4">
                                        {/* Problemi rilevati */}
                                        <div className="space-y-2">
                                          <h5 className="font-semibold text-xs uppercase tracking-wide text-red-600">🔍 Problemi Rilevati</h5>
                                          <div className="space-y-1">
                                            {criticalAnalysis.issues.map((issue, index) => (
                                              <div key={index} className="flex items-start gap-2 p-2 bg-red-50 rounded text-xs">
                                                <span className="text-red-500 mt-0.5">•</span>
                                                <span className="text-red-700">{issue}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Raccomandazioni */}
                                        <div className="space-y-2">
                                          <h5 className="font-semibold text-xs uppercase tracking-wide text-blue-600">💡 Raccomandazioni</h5>
                                          <div className="space-y-1">
                                            {criticalAnalysis.recommendations.map((rec, index) => (
                                              <div key={index} className="flex items-start gap-2 p-2 bg-blue-50 rounded text-xs">
                                                <span className="text-blue-500 mt-0.5">✓</span>
                                                <span className="text-blue-700">{rec}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Analisi Trend AI */}
                                        <div className={`p-3 border-l-4 rounded ${
                                          trendData.trend === 'miglioramento' ? 'bg-green-50 border-green-400' :
                                          trendData.trend === 'peggioramento' ? 'bg-orange-50 border-orange-400' :
                                          trendData.trend === 'critico' ? 'bg-red-50 border-red-400' :
                                          'bg-gray-50 border-gray-400'
                                        }`}>
                                          <div className="flex items-center gap-2">
                                            <span className={
                                              trendData.trend === 'miglioramento' ? 'text-green-600' :
                                              trendData.trend === 'peggioramento' ? 'text-orange-600' :
                                              trendData.trend === 'critico' ? 'text-red-600' :
                                              'text-gray-600'
                                            }>
                                              {trendData.trend === 'miglioramento' ? '📈' :
                                               trendData.trend === 'peggioramento' ? '📉' :
                                               trendData.trend === 'critico' ? '⚠️' : '➡️'}
                                            </span>
                                            <span className={`font-semibold text-xs ${
                                              trendData.trend === 'miglioramento' ? 'text-green-800' :
                                              trendData.trend === 'peggioramento' ? 'text-orange-800' :
                                              trendData.trend === 'critico' ? 'text-red-800' :
                                              'text-gray-800'
                                            }`}>
                                              Trend AI: {trendData.trend.toUpperCase()} ({(trendData.multiplier * 100).toFixed(0)}%)
                                            </span>
                                          </div>
                                          <p className={`text-xs mt-1 ${
                                            trendData.trend === 'miglioramento' ? 'text-green-700' :
                                            trendData.trend === 'peggioramento' ? 'text-orange-700' :
                                            trendData.trend === 'critico' ? 'text-red-700' :
                                            'text-gray-700'
                                          }`}>
                                            {trendData.details}
                                          </p>
                                        </div>

                                        {/* Urgenza */}
                                        <div className="p-3 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                                          <div className="flex items-center gap-2">
                                            <span className="text-yellow-600">⚡</span>
                                            <span className="font-semibold text-xs text-yellow-800">Livello Urgenza: {criticalAnalysis.urgency}</span>
                                          </div>
                                          <p className="text-xs text-yellow-700 mt-1">{criticalAnalysis.urgencyReason}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </TooltipContent>
                                )}
                                {!criticalAnalysis && (
                                  <TooltipContent side="right" sideOffset={10} className="max-w-sm p-0 border-0 shadow-lg" style={{zIndex: 9999}}>
                                    <div className="bg-white rounded-lg border shadow-xl overflow-hidden" style={{zIndex: 9999}}>
                                      {/* Header normale */}
                                      <div className={`px-4 py-3 text-white ${
                                        perfScore >= 80 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                                        perfScore >= 60 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                                        'bg-gradient-to-r from-orange-500 to-orange-600'
                                      }`}>
                                        <div className="flex items-center gap-2">
                                          <div className="h-8 w-8 bg-white/20 rounded-full flex items-center justify-center">
                                            {perfScore >= 80 ? '🏆' : perfScore >= 60 ? '⭐' : '⚠️'}
                                          </div>
                                          <div>
                                            <h4 className="font-semibold text-sm">Cesta #{row.physicalNumber}</h4>
                                            <p className="text-xs opacity-90">Performance: {perfScore.toFixed(1)}/100</p>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Contenuto */}
                                      <div className="p-4 space-y-3">
                                        {/* Analisi Trend AI */}
                                        <div className={`p-3 border-l-4 rounded ${
                                          trendData.trend === 'miglioramento' ? 'bg-green-50 border-green-400' :
                                          trendData.trend === 'peggioramento' ? 'bg-orange-50 border-orange-400' :
                                          trendData.trend === 'critico' ? 'bg-red-50 border-red-400' :
                                          'bg-gray-50 border-gray-400'
                                        }`}>
                                          <div className="flex items-center gap-2">
                                            <span className={
                                              trendData.trend === 'miglioramento' ? 'text-green-600' :
                                              trendData.trend === 'peggioramento' ? 'text-orange-600' :
                                              trendData.trend === 'critico' ? 'text-red-600' :
                                              'text-gray-600'
                                            }>
                                              {trendData.trend === 'miglioramento' ? '📈' :
                                               trendData.trend === 'peggioramento' ? '📉' :
                                               trendData.trend === 'critico' ? '⚠️' : '➡️'}
                                            </span>
                                            <span className={`font-semibold text-xs ${
                                              trendData.trend === 'miglioramento' ? 'text-green-800' :
                                              trendData.trend === 'peggioramento' ? 'text-orange-800' :
                                              trendData.trend === 'critico' ? 'text-red-800' :
                                              'text-gray-800'
                                            }`}>
                                              Trend AI: {trendData.trend.toUpperCase()} ({(trendData.multiplier * 100).toFixed(0)}%)
                                            </span>
                                          </div>
                                          <p className={`text-xs mt-1 ${
                                            trendData.trend === 'miglioramento' ? 'text-green-700' :
                                            trendData.trend === 'peggioramento' ? 'text-orange-700' :
                                            trendData.trend === 'critico' ? 'text-red-700' :
                                            'text-gray-700'
                                          }`}>
                                            {trendData.details}
                                          </p>
                                        </div>

                                        {/* Previsioni crescita */}
                                        {predictionInfo && predictionInfo.willReachTarget && (
                                          <div className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                                            <div className="flex items-center gap-2">
                                              <span className="text-blue-600">📈</span>
                                              <span className="font-semibold text-xs text-blue-800">Previsione Crescita</span>
                                            </div>
                                            <p className="text-xs text-blue-700 mt-1">
                                              Raggiungerà {((sizes as any[]) || []).find((s: any) => s.id === targetSizeId)?.code || 'target'} in {predictionInfo.daysToTarget} giorni
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })()}
                      </div>
                    </div>
                    
                    {/* Stato */}
                    <div style={{width: '40px'}} className="px-1 py-1 border-r flex items-center justify-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="cursor-help w-full h-full flex items-center justify-center">
                              {row.status === 'saving' && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
                              {row.status === 'saved' && <CheckCircle2 className="h-3 w-3 text-green-600" />}
                              {row.status === 'error' && <AlertCircle className="h-3 w-3 text-red-600" />}
                              {row.status === 'editing' && <div className="h-2 w-2 rounded-full bg-blue-400" />}
                              {!row.status && <div className="h-2 w-2 rounded-full bg-gray-300" />}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-md p-0 border-0 shadow-lg">
                            <div className="bg-white rounded-lg border shadow-xl overflow-hidden">
                              {/* Header del tooltip */}
                              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-8 w-8 bg-white/20 rounded-full flex items-center justify-center">
                                    #{row.physicalNumber}
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-sm">Cestello #{row.physicalNumber}</h4>
                                    <p className="text-xs opacity-90">Cronologia operazioni e performance</p>
                                  </div>
                                </div>
                              </div>

                              {/* Contenuto del tooltip */}
                              <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
                                {/* Stato attuale */}
                                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                                  <div className="flex items-center gap-1">
                                    {row.status === 'saving' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                                    {row.status === 'saved' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                                    {row.status === 'error' && <AlertCircle className="h-4 w-4 text-red-600" />}
                                    {row.status === 'editing' && <div className="h-3 w-3 rounded-full bg-blue-400" />}
                                    {!row.status && <div className="h-3 w-3 rounded-full bg-gray-400" />}
                                  </div>
                                  <span className="text-sm font-medium">
                                    {row.status === 'saving' && 'Salvataggio in corso...'}
                                    {row.status === 'saved' && 'Operazione salvata'}
                                    {row.status === 'error' && 'Errore nel salvataggio'}
                                    {row.status === 'editing' && 'Operazione modificata'}
                                    {!row.status && 'Pronto per modifiche'}
                                  </span>
                                </div>

                                {/* Performance attuali */}
                                <div className="space-y-2">
                                  <h5 className="font-semibold text-xs uppercase tracking-wide text-gray-600">Performance Attuali</h5>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-blue-50 p-2 rounded">
                                      <div className="text-gray-600">Taglia</div>
                                      <div className={getSizeBadgeClasses(row.currentSize || 'N/A')}>{row.currentSize || 'N/A'}</div>
                                    </div>
                                    <div className="bg-green-50 p-2 rounded">
                                      <div className="text-gray-600">Peso medio</div>
                                      <div className="font-semibold text-green-600">{row.averageWeight}</div>
                                    </div>
                                    <div className="bg-purple-50 p-2 rounded">
                                      <div className="text-gray-600">Animali</div>
                                      <div className="font-semibold text-purple-600">{row.animalCount ? formatNumberWithSeparators(row.animalCount) : 'N/A'}</div>
                                    </div>
                                    <div className="bg-orange-50 p-2 rounded">
                                      <div className="text-gray-600">Animali/kg</div>
                                      <div className="font-semibold text-orange-600">{row.animalsPerKg ? formatNumberWithSeparators(row.animalsPerKg) : 'N/A'}</div>
                                    </div>
                                  </div>
                                </div>

                                {/* Cronologia operazioni */}
                                <div className="space-y-2">
                                  <h5 className="font-semibold text-xs uppercase tracking-wide text-gray-600">Cronologia Operazioni</h5>
                                  <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {(() => {
                                      // ✅ Filtra SOLO operazioni del ciclo ATTIVO corrente
                                      const basketOps = ((operations as any[]) || [])
                                        .filter((op: any) => 
                                          op.basketId === row.basketId && 
                                          op.cycleId === (row as any).currentCycleId
                                        )
                                        .sort((a: any, b: any) => b.id - a.id)
                                        .slice(0, 5); // Mostra ultime 5 operazioni del ciclo attivo
                                      
                                      if (basketOps.length === 0) {
                                        return (
                                          <div className="text-xs text-gray-500 italic p-2">
                                            Nessuna operazione registrata
                                          </div>
                                        );
                                      }

                                      return basketOps.map((op: any, index: number) => (
                                        <div key={op.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
                                          <div className={`h-2 w-2 rounded-full ${
                                            op.type === 'prima-attivazione' ? 'bg-green-500' :
                                            op.type === 'misura' ? 'bg-blue-500' :
                                            op.type === 'peso' ? 'bg-purple-500' :
                                            op.type === 'pulizia' ? 'bg-yellow-500' :
                                            op.type === 'trattamento' ? 'bg-red-500' :
                                            'bg-gray-500'
                                          }`} />
                                          <div className="flex-1">
                                            <div className="font-medium capitalize">
                                              {op.type === 'prima-attivazione' ? 'Prima attivazione' :
                                               op.type === 'misura' ? 'Misura' :
                                               op.type === 'peso' ? 'Peso' :
                                               op.type === 'pulizia' ? 'Pulizia' :
                                               op.type === 'trattamento' ? 'Trattamento' :
                                               op.type}
                                            </div>
                                            <div className="text-gray-500">
                                              {new Date(op.date).toLocaleDateString('it-IT')}
                                              {op.animalCount && ` • ${formatNumberWithSeparators(op.animalCount)} animali`}
                                            </div>
                                          </div>
                                          {index === 0 && (
                                            <div className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
                                              ULTIMA
                                            </div>
                                          )}
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                </div>

                                {/* Info ciclo */}
                                <div className="pt-2 border-t space-y-1">
                                  <h5 className="font-semibold text-xs uppercase tracking-wide text-gray-600">Ciclo Attuale</h5>
                                  <div className="text-xs text-gray-600">
                                    <div>ID Ciclo: {(row as any).currentCycleId || 'N/A'}</div>
                                    <div>Lotto: L{row.lotId || '1'}</div>
                                    <div>Ultima operazione: {(row as any).lastOperationDate ? 
                                      new Date((row as any).lastOperationDate).toLocaleDateString('it-IT') : 'N/A'}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>



                    {/* Info aggiuntive - Taglia calcolata automaticamente */}
                    <div style={{width: '80px'}} className="px-1 py-1 border-r flex items-center text-xs">
                      <span className={`truncate ${getSizeBadgeClasses((() => {
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
                      })())}`}>
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
                          `${Math.round((row.totalWeight / row.animalCount) * 100) / 100}`
                          : `${row.averageWeight}`}
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
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="w-full h-6 px-1 text-xs text-gray-600 rounded flex items-center cursor-help">
                              {(() => {
                                const lot = ((lots as any[]) || []).find((l: any) => l.id === (row.lotId || 1));
                                return lot ? lot.supplier : `L${row.lotId || '1'}`;
                              })()}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-sm">
                              {(() => {
                                const lot = ((lots as any[]) || []).find((l: any) => l.id === (row.lotId || 1));
                                if (lot) {
                                  return (
                                    <div className="space-y-1">
                                      <div><strong>Lotto L{lot.id}</strong></div>
                                      <div>Fornitore: {lot.supplier}</div>
                                      <div>Data arrivo: {new Date(lot.arrivalDate).toLocaleDateString('it-IT')}</div>
                                      {lot.supplierLotNumber && <div>Lotto fornitore: {lot.supplierLotNumber}</div>}
                                    </div>
                                  );
                                }
                                return <div>Informazioni lotto non disponibili</div>;
                              })()}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>



                    {/* Campi editabili - Animali */}
                    <div style={{width: '70px'}} className="px-1 py-1 border-r">
                      {(row as any).isNewRow ? (
                        <input
                          type="number"
                          value={row.animalCount || ''}
                          onChange={(e) => updateCell(row.basketId, 'animalCount', Number(e.target.value))}
                          className="w-full h-6 px-1 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded bg-white"
                          min="0"
                          placeholder="0"
                        />
                      ) : (
                        <div className="w-full h-6 px-1 text-xs rounded bg-gray-100 cursor-not-allowed flex items-center text-right">
                          {row.animalCount ? formatNumberWithSeparators(row.animalCount) : '0'}
                        </div>
                      )}
                    </div>

                    {/* Peso Tot(g) */}
                    <div style={{width: '80px'}} className="px-1 py-1 border-r">
                      {(row as any).isNewRow ? (
                        <input
                          type="number"
                          value={row.totalWeight || ''}
                          onChange={(e) => updateCell(row.basketId, 'totalWeight', Number(e.target.value))}
                          className="w-full h-6 px-1 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded bg-white"
                          min="0"
                          placeholder="0"
                        />
                      ) : (
                        <div className="w-full h-6 px-1 text-xs rounded bg-gray-100 cursor-not-allowed flex items-center text-right">
                          {row.totalWeight ? formatNumberWithSeparators(row.totalWeight) : '0'}
                        </div>
                      )}
                    </div>

                    {/* Anim/kg */}
                    <div style={{width: '65px'}} className="px-1 py-1 border-r">
                      {(row as any).isNewRow ? (
                        <input
                          type="number"
                          value={row.animalsPerKg || ''}
                          onChange={(e) => updateCell(row.basketId, 'animalsPerKg', Number(e.target.value))}
                          className="w-full h-6 px-1 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded bg-white"
                          min="0"
                          placeholder="0"
                        />
                      ) : (
                        <div className="w-full h-6 px-1 text-xs rounded bg-gray-100 cursor-not-allowed flex items-center text-right">
                          {row.animalsPerKg ? formatNumberWithSeparators(row.animalsPerKg) : '0'}
                        </div>
                      )}
                    </div>

                    {/* PESO CAMPIONE per operazioni peso e misura */}
                    {(selectedOperationType === 'peso' || selectedOperationType === 'misura') && (
                      <div style={{width: '60px'}} className="px-1 py-1 border-r bg-yellow-50">
                        {(row as any).isNewRow ? (
                          <input
                            type="number"
                            value={row.sampleWeight || ''}
                            onChange={(e) => updateCell(row.basketId, 'sampleWeight', Number(e.target.value))}
                            className="w-full h-6 px-1 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded bg-white"
                            min="0"
                            placeholder="0"
                            required
                          />
                        ) : (
                          <div className="w-full h-6 px-1 text-xs rounded bg-gray-100 cursor-not-allowed flex items-center text-right">
                            {row.sampleWeight || '-'}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ANIMALI VIVI solo per misura */}
                    {selectedOperationType === 'misura' && (
                      <div style={{width: '50px'}} className="px-1 py-1 border-r bg-yellow-50">
                        {(row as any).isNewRow ? (
                          <input
                            type="number"
                            value={row.liveAnimals || ''}
                            onChange={(e) => updateCell(row.basketId, 'liveAnimals', Number(e.target.value))}
                            className="w-full h-6 px-1 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded bg-white"
                            min="0"
                            placeholder="0"
                            required
                          />
                        ) : (
                          <div className="w-full h-6 px-1 text-xs rounded bg-gray-100 cursor-not-allowed flex items-center text-right">
                            {row.liveAnimals || '-'}
                          </div>
                        )}
                      </div>
                    )}

                    {/* ANIMALI MORTI per misura */}
                    {selectedOperationType === 'misura' && (
                      <div style={{width: '50px'}} className="px-1 py-1 border-r bg-yellow-50">
                        {(row as any).isNewRow ? (
                          <input
                            type="number"
                            value={row.deadCount !== null && row.deadCount !== undefined ? row.deadCount : ''}
                            onChange={(e) => updateCell(row.basketId, 'deadCount', Number(e.target.value) || 0)}
                            className="w-full h-6 px-1 text-xs border-0 focus:outline-none focus:ring-1 focus:ring-blue-400 rounded bg-white"
                            min="0"
                            placeholder="0"
                            required
                          />
                        ) : (
                          <div className="w-full h-6 px-1 text-xs rounded bg-gray-100 cursor-not-allowed flex items-center text-right">
                            {row.deadCount !== null && row.deadCount !== undefined ? row.deadCount : '-'}
                          </div>
                        )}
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
                        <div className="contents">
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
                        </div>
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
                </div>
                );
              })}
              </div>
            </div>
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
        <div>
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
                  📝 Cestello #{editingForm.physicalNumber} - {selectedOperationType}
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
                        ref={sampleWeightRef}
                        type="number"
                        value={editingForm.sampleWeight || ''}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          setEditingForm({...editingForm, sampleWeight: value});
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const value = Number(e.currentTarget.value);
                            moveToNextField('sampleWeight', value);
                          }
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
                        ref={liveAnimalsRef}
                        type="number"
                        value={editingForm.liveAnimals || ''}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          setEditingForm({...editingForm, liveAnimals: value});
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const value = Number(e.currentTarget.value);
                            moveToNextField('liveAnimals', value);
                          }
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
                        ref={deadCountRef}
                        type="number"
                        value={editingForm.deadCount || ''}
                        onChange={(e) => {
                          const value = Number(e.target.value) || 0;
                          setEditingForm({...editingForm, deadCount: value});
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const value = Number(e.currentTarget.value) || 0;
                            moveToNextField('deadCount', value);
                          }
                        }}
                        className="w-full h-10 md:h-8 px-3 md:px-2 text-base md:text-sm border rounded 
                                 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-yellow-50
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
                      <label className="text-xs text-gray-500 mb-1 block">Peso Medio (mg)</label>
                      <div className="h-8 px-2 text-sm bg-gray-50 border rounded flex items-center text-gray-700">
                        {(editingForm.sampleWeight && editingForm.liveAnimals && editingForm.liveAnimals > 0)
                          ? (editingForm.sampleWeight / editingForm.liveAnimals).toFixed(2)
                          : '-'}
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-600 mb-1 block">Peso totale (g)</label>
                      <input
                        ref={totalWeightRef}
                        type="number"
                        value={editingForm.totalWeight || ''}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          setEditingForm({...editingForm, totalWeight: value});
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const value = Number(e.currentTarget.value);
                            moveToNextField('totalWeight', value);
                          }
                        }}
                        className="w-full h-8 px-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-400 bg-yellow-50"
                        min="1"
                        placeholder={editingForm.suggestedTotalWeight ? editingForm.suggestedTotalWeight.toLocaleString() : "Inserisci peso totale"}
                        required
                      />
                    </div>
                  </div>

                  {/* Riga 3: Risultati finali */}
                  <div className="grid grid-cols-3 gap-3 items-end">
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
                    
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Taglia (calcolata)</label>
                      <div className="h-8 px-2 text-sm bg-green-50 border-2 border-green-200 rounded flex items-center font-medium text-green-800">
                        {(editingForm.totalWeight && editingForm.sampleWeight && editingForm.liveAnimals && editingForm.liveAnimals > 0)
                          ? (() => {
                              const animalsPerKg = Math.round(((editingForm.totalWeight * editingForm.liveAnimals) / editingForm.sampleWeight) / (editingForm.totalWeight / 1000));
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
                  
                  {/* Campo Note per operazioni misura */}
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Note (opzionale)</label>
                    <textarea
                      ref={notesRef}
                      value={editingForm.notes || ''}
                      onChange={(e) => setEditingForm({...editingForm, notes: e.target.value})}
                      className="w-full h-16 px-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                      placeholder="Note aggiuntive per questa operazione..."
                    />
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
                        ref={totalWeightRef}
                        type="number"
                        value={editingForm.totalWeight || ''}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          setEditingForm({...editingForm, totalWeight: value});
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const value = Number(e.currentTarget.value);
                            moveToNextField('totalWeight', value);
                          }
                        }}
                        className="w-full h-8 px-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-400 bg-yellow-50"
                        min="1"
                        placeholder={editingForm.suggestedTotalWeight ? editingForm.suggestedTotalWeight.toLocaleString() : "Inserisci peso totale"}
                        autoFocus
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Peso Medio (mg)</label>
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
                  
                  {/* Campo Note per operazioni peso */}
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Note (opzionale)</label>
                    <textarea
                      ref={notesRef}
                      value={editingForm.notes || ''}
                      onChange={(e) => setEditingForm({...editingForm, notes: e.target.value})}
                      className="w-full h-16 px-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-400 resize-none"
                      placeholder="Note aggiuntive per questa operazione..."
                    />
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
                  disabled={!validateEditingForm().valid}
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
        </div>
      )}

      {/* Popup Sintesi Previsioni */}
      {showPredictionPopup && predictionSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">📊 Sintesi Previsioni di Crescita</h3>
                <p className="text-sm opacity-90">
                  Target: {predictionSummary.targetSizeInfo?.code} - Data: {targetDate}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={exportToExcel}
                  className="px-3 py-1 bg-green-500 hover:bg-green-600 rounded text-sm font-medium transition-colors"
                >
                  📄 Esporta Excel
                </button>
                <button
                  onClick={() => setShowPredictionPopup(false)}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Contenuto */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {/* Totale */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="text-center">
                  <h4 className="text-2xl font-bold text-green-700">
                    {formatNumberWithSeparators(predictionSummary.totalAnimalsAtTarget)}
                  </h4>
                  <p className="text-sm text-gray-600">Animali totali disponibili al target</p>
                </div>
              </div>

              {/* Breakdown per Taglia */}
              <div className="mb-6">
                <h5 className="font-semibold text-gray-800 mb-3">Breakdown per Taglia Finale</h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(predictionSummary.sizeBreakdown).map(([size, count]: [string, any]) => (
                    <div key={size} className="bg-gray-50 border rounded-lg p-3 text-center">
                      <div className="font-bold text-lg text-purple-600">
                        {formatNumberWithSeparators(count)}
                      </div>
                      <div className={`text-xs font-semibold ${getSizeBadgeClasses(size)}`}>{size}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tabella Dettaglio Cestelli */}
              <div>
                <h5 className="font-semibold text-gray-800 mb-3">Dettaglio per Cestello</h5>
                <div className="overflow-x-auto">
                  <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Cestello</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">Animali Attuali</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-600">Animali al Target</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">Taglia Attuale</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">Taglia Finale</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">Giorni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {predictionSummary.basketsSummary.map((basket: any, index: number) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium">#{basket.basketNumber}</td>
                          <td className="px-4 py-2 text-right">{formatNumberWithSeparators(basket.currentAnimals)}</td>
                          <td className="px-4 py-2 text-right font-bold text-green-600">
                            {formatNumberWithSeparators(basket.animalsAtTarget)}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${getSizeBadgeWithBackground(basket.currentSize)}`}>
                              {basket.currentSize}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${getSizeBadgeWithBackground(basket.finalSize)}`}>
                              {basket.finalSize}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center">{basket.daysToTarget}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {predictionSummary.basketsSummary.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Nessun cestello raggiungerà il target nella data selezionata.</p>
                  <p className="text-sm">Prova con una data più lontana nel futuro.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}