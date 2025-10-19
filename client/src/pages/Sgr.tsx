import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, Plus, Pencil, LineChart, Droplets, BarChart, Calculator, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import SgrForm from '@/components/SgrForm';
import SgrGiornalieriForm from '@/components/SgrGiornalieriForm';
import GrowthPredictionChart from '@/components/GrowthPredictionChart';
import MultiSizeGrowthComparisonChart from '@/components/MultiSizeGrowthComparisonChart';
import { useWebSocketMessage } from '@/lib/websocket';

export default function Sgr() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreateDailyDialogOpen, setIsCreateDailyDialogOpen] = useState(false);
  const [editingSgr, setEditingSgr] = useState<any>(null);
  const [projectionDays, setProjectionDays] = useState(60); // 60 giorni default
  const [projectionStartDate, setProjectionStartDate] = useState(new Date().toISOString().split('T')[0]); // Data inizio proiezione
  const [bestVariation, setBestVariation] = useState(20); // +20% default
  const [worstVariation, setWorstVariation] = useState(30); // -30% default
  const [selectedSizeId, setSelectedSizeId] = useState<number | null>(null); // Taglia selezionata per previsioni
  const [compareMultipleSizes, setCompareMultipleSizes] = useState(false); // Confronta più taglie
  
  // SGR Per Taglia calculation states
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationProgress, setCalculationProgress] = useState(0);
  const [calculationStatus, setCalculationStatus] = useState<string>('');
  
  // Sorting states for SGR Per Taglia
  const [sortColumn, setSortColumn] = useState<'size' | 'month' | 'sgr' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Array dei mesi in italiano
  const monthOrder = [
    'gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
    'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'
  ];
  
  // Query SGRs
  const { data: sgrs, isLoading } = useQuery({
    queryKey: ['/api/sgr'],
  });

  // Query SGR Giornalieri
  const { data: sgrGiornalieri, isLoading: isLoadingSgrGiornalieri } = useQuery({
    queryKey: ['/api/sgr-giornalieri'],
  });

  // Query SGR Per Taglia
  const { data: sgrPerTaglia, isLoading: isLoadingSgrPerTaglia } = useQuery({
    queryKey: ['/api/sgr-per-taglia'],
  });

  // Query Sizes
  const { data: sizes } = useQuery({
    queryKey: ['/api/sizes'],
  });
  
  // Get current month's SGR based on selected size
  const getCurrentMonthSgr = (sizeId?: number | null) => {
    const today = new Date();
    const currentMonthName = monthOrder[today.getMonth()];
    
    // Use SGR Per Taglia if size is selected
    const targetSizeId = sizeId !== undefined ? sizeId : selectedSizeId;
    if (targetSizeId && sgrPerTaglia) {
      const sgrForSize = sgrPerTaglia.find(
        (sgr: any) => sgr.month.toLowerCase() === currentMonthName && sgr.sizeId === targetSizeId
      );
      if (sgrForSize?.calculatedSgr) {
        return sgrForSize.calculatedSgr;
      }
    }
    
    // Fallback to generic SGR if no size-specific SGR found
    const currentSgr = sgrs?.find(sgr => sgr.month.toLowerCase() === currentMonthName);
    return currentSgr?.percentage || 4.1; // Default to current month value
  };
  
  // Prepare data for multi-size comparison
  const getSizesWithSgr = () => {
    if (!sizes || !sgrPerTaglia) return [];
    
    const today = new Date(projectionStartDate);
    const currentMonthName = monthOrder[today.getMonth()];
    
    return sizes
      .map((size: any) => {
        const sgrForSize = sgrPerTaglia.find(
          (sgr: any) => sgr.month.toLowerCase() === currentMonthName && sgr.sizeId === size.id
        );
        
        if (!sgrForSize?.calculatedSgr) return null;
        
        // Calcola il peso medio per questa taglia
        const minAnimals = size.minAnimalsPerKg || 0;
        const maxAnimals = size.maxAnimalsPerKg || 0;
        let avgWeight = 250; // default
        
        if (minAnimals > 0 && maxAnimals > 0) {
          const avgAnimalsPerKg = (minAnimals + maxAnimals) / 2;
          avgWeight = 1000000 / avgAnimalsPerKg; // 1 kg = 1,000,000 mg
        }
        
        return {
          sizeId: size.id,
          sizeName: size.name,
          sgrPercentage: sgrForSize.calculatedSgr,
          color: size.color || '#3b82f6',
          averageWeight: avgWeight
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => {
        const aNum = parseInt(a.sizeName.split('-')[1] || '0');
        const bNum = parseInt(b.sizeName.split('-')[1] || '0');
        return aNum - bNum;
      });
  };
  
  // Calcola il peso medio dalla taglia selezionata
  const getAverageWeightFromSize = () => {
    if (!selectedSizeId || !sizes) return 250; // default se non selezionata
    
    const selectedSize = sizes.find((s: any) => s.id === selectedSizeId);
    if (!selectedSize) return 250;
    
    const minAnimals = selectedSize.minAnimalsPerKg || 0;
    const maxAnimals = selectedSize.maxAnimalsPerKg || 0;
    
    if (minAnimals === 0 || maxAnimals === 0) return 250;
    
    // Calcola peso medio: 1,000,000 mg (1 kg) / media(animali/kg) = peso in mg per animale
    const avgAnimalsPerKg = (minAnimals + maxAnimals) / 2;
    const avgWeightMg = 1000000 / avgAnimalsPerKg;
    
    // Non arrotondare - mantieni la precisione decimale
    return avgWeightMg;
  };

  // Query per le proiezioni di crescita
  const { data: growthPrediction, isLoading: isLoadingPrediction, refetch: refetchPrediction } = useQuery({
    queryKey: ['/api/growth-prediction', selectedSizeId, getCurrentMonthSgr(), projectionDays, projectionStartDate, bestVariation, worstVariation],
    queryFn: () => {
      const currentWeight = getAverageWeightFromSize();
      const sizeIdParam = selectedSizeId ? `&sizeId=${selectedSizeId}` : '';
      const dateParam = projectionStartDate ? `&date=${projectionStartDate}` : '';
      return apiRequest({ 
        url: `/api/growth-prediction?currentWeight=${currentWeight}&sgrPercentage=${getCurrentMonthSgr()}&days=${projectionDays}&bestVariation=${bestVariation}&worstVariation=${worstVariation}${sizeIdParam}${dateParam}`, 
        method: 'GET' 
      });
    },
    enabled: false
  });

  // Create SGR mutation
  const createSgrMutation = useMutation({
    mutationFn: (newSgr: any) => apiRequest({ 
      url: '/api/sgr', 
      method: 'POST', 
      body: newSgr 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sgr'] });
      setIsCreateDialogOpen(false);
    }
  });

  // Update SGR mutation
  const updateSgrMutation = useMutation({
    mutationFn: (sgr: any) => apiRequest({ 
      url: `/api/sgr/${sgr.id}`, 
      method: 'PATCH', 
      body: sgr 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sgr'] });
      setEditingSgr(null);
    }
  });

  // Create SGR Giornaliero mutation
  const createSgrGiornalieroMutation = useMutation({
    mutationFn: (newSgrGiornaliero: any) => apiRequest({ 
      url: '/api/sgr-giornalieri', 
      method: 'POST', 
      body: newSgrGiornaliero 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sgr-giornalieri'] });
      setIsCreateDailyDialogOpen(false);
    }
  });

  // Recalculate SGR Per Taglia mutation
  const recalculateSgrMutation = useMutation({
    mutationFn: () => apiRequest({ 
      url: '/api/sgr-calculation/recalculate', 
      method: 'POST'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sgr-per-taglia'] });
    },
    onError: () => {
      setIsCalculating(false);
      setCalculationProgress(0);
      setCalculationStatus('Errore durante il calcolo');
    }
  });

  // WebSocket listeners for SGR calculation progress
  useWebSocketMessage('sgr_calculation_start', () => {
    setIsCalculating(true);
    setCalculationProgress(0);
    setCalculationStatus('Inizio calcolo SGR...');
  });

  useWebSocketMessage('sgr_calculation_operations_loaded', (data: any) => {
    setCalculationProgress(20);
    setCalculationStatus(`Caricate ${data?.totalOperations || 0} operazioni`);
  });

  useWebSocketMessage('sgr_calculation_size_complete', (data: any) => {
    const progress = 20 + (data?.completedSizes / data?.totalSizes) * 70;
    setCalculationProgress(progress);
    setCalculationStatus(`Completata taglia ${data?.sizeName} (${data?.completedSizes}/${data?.totalSizes})`);
  });

  useWebSocketMessage('sgr_calculation_complete', () => {
    setCalculationProgress(100);
    setCalculationStatus('Calcolo completato!');
    setTimeout(() => {
      setIsCalculating(false);
      setCalculationProgress(0);
      setCalculationStatus('');
    }, 2000);
  });

  // Handle SGR recalculation
  const handleRecalculateSgr = () => {
    setIsCalculating(true);
    setCalculationProgress(0);
    setCalculationStatus('Avvio calcolo...');
    recalculateSgrMutation.mutate();
  };

  // Handle sorting for SGR Per Taglia table
  const handleSort = (column: 'size' | 'month' | 'sgr') => {
    if (sortColumn === column) {
      // Toggle direction if same column
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Sort SGR Per Taglia data
  const sortedSgrPerTaglia = [...(sgrPerTaglia || [])].sort((a, b) => {
    if (!sortColumn) return 0;

    let compareValue = 0;

    if (sortColumn === 'size') {
      const sizeA = sizes?.find((s: any) => s.id === a.sizeId);
      const sizeB = sizes?.find((s: any) => s.id === b.sizeId);
      const nameA = sizeA?.name || '';
      const nameB = sizeB?.name || '';
      compareValue = nameA.localeCompare(nameB);
    } else if (sortColumn === 'month') {
      const monthA = a.month.toLowerCase();
      const monthB = b.month.toLowerCase();
      compareValue = monthOrder.indexOf(monthA) - monthOrder.indexOf(monthB);
    } else if (sortColumn === 'sgr') {
      compareValue = (a.calculatedSgr || 0) - (b.calculatedSgr || 0);
    }

    return sortDirection === 'asc' ? compareValue : -compareValue;
  });

  // Export SGR Per Taglia to Excel
  const exportToExcel = () => {
    if (!sgrPerTaglia || sgrPerTaglia.length === 0) return;

    // Prepare data for export
    const exportData = sortedSgrPerTaglia.map((sgrItem: any) => {
      const size = sizes?.find((s: any) => s.id === sgrItem.sizeId);
      const sizeName = size?.name || `Taglia ${sgrItem.sizeId}`;
      const lastCalc = sgrItem.lastCalculated 
        ? new Intl.DateTimeFormat('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }).format(new Date(sgrItem.lastCalculated))
        : '-';

      return {
        'Taglia': sizeName,
        'Mese': sgrItem.month.charAt(0).toUpperCase() + sgrItem.month.slice(1),
        'SGR Calcolato (%)': sgrItem.calculatedSgr ? sgrItem.calculatedSgr.toFixed(2) : '-',
        'Campioni': sgrItem.sampleCount || 0,
        'Ultimo Calcolo': lastCalc,
        'Note': sgrItem.notes || ''
      };
    });

    // Create worksheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SGR Per Taglia');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, // Taglia
      { wch: 12 }, // Mese
      { wch: 18 }, // SGR Calcolato
      { wch: 10 }, // Campioni
      { wch: 20 }, // Ultimo Calcolo
      { wch: 40 }  // Note
    ];

    // Generate filename with current date
    const today = new Date().toISOString().split('T')[0];
    const filename = `SGR_Per_Taglia_${today}.xlsx`;

    // Export file
    XLSX.writeFile(workbook, filename);
  };

  // Filter SGRs
  const filteredSgrs = sgrs?.filter(sgr => {
    return searchTerm === '' || 
      sgr.month.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  // Sort SGR by month order
  const sortedSgrs = [...(filteredSgrs || [])].sort((a, b) => {
    const monthA = a.month.toLowerCase();
    const monthB = b.month.toLowerCase();
    return monthOrder.indexOf(monthA) - monthOrder.indexOf(monthB);
  });

  // Sort SGR Giornalieri by date (newest first)
  const sortedSgrGiornalieri = [...(sgrGiornalieri || [])].sort((a, b) => {
    return new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime();
  });

  // Utility per calcolare la media dei valori
  function calculateAverage(values: (number | null)[]): string {
    const validValues = values.filter(v => v !== null) as number[];
    if (validValues.length === 0) return '-';
    const sum = validValues.reduce((acc, curr) => acc + curr, 0);
    return (sum / validValues.length).toFixed(2);
  }

  // Prepare chart data for SGR Per Taglia
  const prepareChartData = () => {
    if (!sgrPerTaglia || !sizes) return [];

    // Group data by month
    const dataByMonth: Record<string, any> = {};
    
    monthOrder.forEach(month => {
      dataByMonth[month] = { month: month.charAt(0).toUpperCase() + month.slice(1) };
    });

    // Fill in SGR values for each size
    sgrPerTaglia.forEach((item: any) => {
      const size = sizes.find((s: any) => s.id === item.sizeId);
      if (size && dataByMonth[item.month]) {
        dataByMonth[item.month][size.name] = item.calculatedSgr;
      }
    });

    // Convert to array and filter out months with no data
    return monthOrder.map(month => dataByMonth[month]).filter(item => 
      Object.keys(item).length > 1 // Has at least month + one size
    );
  };

  const chartData = prepareChartData();

  // Get unique sizes that have data for the chart
  const chartSizes = sgrPerTaglia && sizes ? 
    [...new Set(sgrPerTaglia.map((item: any) => item.sizeId))]
      .map(sizeId => sizes.find((s: any) => s.id === sizeId))
      .filter(Boolean)
      .sort((a: any, b: any) => {
        // Sort by numeric value in the name (e.g., TP-500 -> 500)
        const aNum = parseInt(a.name.split('-')[1] || '0');
        const bNum = parseInt(b.name.split('-')[1] || '0');
        return aNum - bNum;
      })
    : [];

  // Define colors for different sizes (using a color palette)
  const sizeColors = [
    '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', 
    '#ef4444', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4',
    '#a855f7', '#84cc16', '#eab308', '#22c55e', '#6366f1',
    '#f43f5e', '#0ea5e9', '#d946ef', '#65a30d', '#dc2626'
  ];

  return (
    <div>
      <Tabs defaultValue="sgr-per-taglia" className="w-full">
        <TabsList className="grid grid-cols-4 w-full mb-6">
          <TabsTrigger value="sgr-per-taglia">SGR Per Taglia</TabsTrigger>
          <TabsTrigger value="indici-sgr">Indici SGR</TabsTrigger>
          <TabsTrigger value="dati-giornalieri">Dati Seneye</TabsTrigger>
          <TabsTrigger value="previsioni">Previsioni</TabsTrigger>
        </TabsList>

        <TabsContent value="sgr-per-taglia">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-2xl font-condensed font-bold text-gray-800">SGR Per Taglia</h2>
            <div className="flex gap-2">
              <Button 
                onClick={exportToExcel} 
                disabled={!sgrPerTaglia || sgrPerTaglia.length === 0}
                variant="outline"
                data-testid="button-export-excel"
              >
                <Download className="h-4 w-4 mr-1" /> Esporta Excel
              </Button>
              <Button 
                onClick={handleRecalculateSgr} 
                disabled={isCalculating}
                data-testid="button-recalculate-sgr"
              >
                {isCalculating ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Calcolo...</>
                ) : (
                  <><Calculator className="h-4 w-4 mr-1" /> Ricalcola SGR</>
                )}
              </Button>
            </div>
          </div>
          
          {/* Calculation Progress */}
          {isCalculating && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{calculationStatus}</span>
                    <span className="text-gray-500">{Math.round(calculationProgress)}%</span>
                  </div>
                  <Progress value={calculationProgress} className="h-2" data-testid="progress-sgr-calculation" />
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Info Card */}
          <div className="bg-blue-50 p-3 rounded-md mb-6 border border-blue-100">
            <p className="text-blue-700 text-sm font-medium">
              <span className="inline-block mr-2">ℹ️</span>
              SGR calcolati da operazioni storiche dello stesso mese dell'anno precedente, specifici per ogni taglia
            </p>
          </div>

          {/* SGR Per Taglia Chart */}
          {chartData.length > 0 && chartSizes.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Andamento SGR per Taglia
                </CardTitle>
                <CardDescription>
                  Visualizzazione dell'andamento mensile del tasso di crescita specifico per ogni taglia
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RechartsLineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                      label={{ value: 'SGR (%)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '8px'
                      }}
                      formatter={(value: any) => `${value?.toFixed(2)}%`}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="line"
                    />
                    {chartSizes.map((size: any, index: number) => (
                      <Line
                        key={size.id}
                        type="monotone"
                        dataKey={size.name}
                        stroke={sizeColors[index % sizeColors.length]}
                        strokeWidth={2}
                        dot={false}
                        name={size.name}
                        connectNulls
                      />
                    ))}
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* SGR Per Taglia Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('size')}
                      data-testid="header-size"
                    >
                      <div className="flex items-center gap-1">
                        Taglia
                        {sortColumn === 'size' ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('month')}
                      data-testid="header-month"
                    >
                      <div className="flex items-center gap-1">
                        Mese
                        {sortColumn === 'month' ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('sgr')}
                      data-testid="header-sgr"
                    >
                      <div className="flex items-center gap-1">
                        SGR Calcolato (%)
                        {sortColumn === 'sgr' ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-40" />
                        )}
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campioni
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ultimo Calcolo
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoadingSgrPerTaglia ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                        Caricamento SGR per taglia...
                      </td>
                    </tr>
                  ) : !sgrPerTaglia || sgrPerTaglia.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                        Nessun SGR per taglia trovato. Clicca "Ricalcola SGR" per generare i dati.
                      </td>
                    </tr>
                  ) : (
                    sortedSgrPerTaglia.map((sgrItem: any) => {
                      // Find size name
                      const size = sizes?.find((s: any) => s.id === sgrItem.sizeId);
                      const sizeName = size?.name || `Taglia ${sgrItem.sizeId}`;
                      
                      // Format last calculated date
                      const lastCalc = sgrItem.lastCalculated 
                        ? new Intl.DateTimeFormat('it-IT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }).format(new Date(sgrItem.lastCalculated))
                        : '-';
                      
                      return (
                        <tr key={`${sgrItem.month}-${sgrItem.sizeId}`} data-testid={`row-sgr-${sgrItem.sizeId}`}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {sizeName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {sgrItem.month.charAt(0).toUpperCase() + sgrItem.month.slice(1)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600" data-testid={`text-sgr-value-${sgrItem.sizeId}`}>
                            {sgrItem.calculatedSgr ? `${sgrItem.calculatedSgr.toFixed(2)}%` : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {sgrItem.sampleCount || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {lastCalc}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Statistics Cards */}
          {sgrPerTaglia && sgrPerTaglia.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Taglie Monitorate</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{sgrPerTaglia.length}</p>
                  <p className="text-sm text-gray-500 mt-1">Taglie con SGR calcolato</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">SGR Medio</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-green-600">
                    {(sgrPerTaglia.reduce((acc: number, item: any) => acc + (item.calculatedSgr || 0), 0) / sgrPerTaglia.length).toFixed(2)}%
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Media tra tutte le taglie</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Campioni Totali</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-blue-600">
                    {sgrPerTaglia.reduce((acc: number, item: any) => acc + (item.sampleCount || 0), 0)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Operazioni analizzate</p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="indici-sgr">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-2xl font-condensed font-bold text-gray-800">Indici SGR Mensili</h2>
            <div className="flex space-x-3">
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Nuovo SGR
              </Button>
            </div>
          </div>
          
          {/* Nota informativa SGR */}
          <div className="bg-blue-50 p-3 rounded-md mb-6 border border-blue-100">
            <p className="text-blue-700 text-sm font-medium">
              <span className="inline-block mr-2">ℹ️</span>
              I valori SGR rappresentano la percentuale di accrescimento giornaliero degli animali
            </p>
          </div>

          {/* Search */}
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Cerca per mese..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                  <div className="absolute left-3 top-2.5 text-gray-400">
                    <Search className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SGR Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mese
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentuale (%)
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                        Caricamento indici SGR...
                      </td>
                    </tr>
                  ) : sortedSgrs.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                        Nessun indice SGR trovato
                      </td>
                    </tr>
                  ) : (
                    sortedSgrs.map((sgr) => {
                      // Capitalize month name
                      const displayMonth = sgr.month.charAt(0).toUpperCase() + sgr.month.slice(1);
                      
                      return (
                        <tr key={sgr.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {displayMonth}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {sgr.percentage}%
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setEditingSgr(sgr)}>
                              <Pencil className="h-5 w-5 text-gray-600" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="dati-giornalieri">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-condensed font-bold text-gray-800">Dati Giornalieri Seneye</h2>
            <div className="flex space-x-3">
              <Button onClick={() => setIsCreateDailyDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Nuova Misurazione
              </Button>
            </div>
          </div>

          {/* Seneye Parameters Chart */}
          {sortedSgrGiornalieri && sortedSgrGiornalieri.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5" />
                  Andamento Parametri Ambientali
                </CardTitle>
                <CardDescription>
                  Visualizzazione dell'andamento dei parametri rilevati dal dispositivo Seneye
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RechartsLineChart 
                    data={[...sortedSgrGiornalieri].reverse().map(item => ({
                      date: new Intl.DateTimeFormat('it-IT', {
                        day: '2-digit',
                        month: '2-digit'
                      }).format(new Date(item.recordDate)),
                      fullDate: new Date(item.recordDate).toLocaleDateString('it-IT'),
                      temperatura: item.temperature,
                      pH: item.pH,
                      ammoniaca: item.ammonia,
                      ossigeno: item.oxygen,
                      salinita: item.salinity
                    }))} 
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#6b7280"
                      style={{ fontSize: '11px' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      yAxisId="left"
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                      label={{ value: 'Temp (°C) / pH / O2 / NH3', angle: -90, position: 'insideLeft' }}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                      label={{ value: 'Salinità (ppt)', angle: 90, position: 'insideRight' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '12px'
                      }}
                      labelFormatter={(label) => {
                        const item = [...sortedSgrGiornalieri].reverse().find(
                          i => new Intl.DateTimeFormat('it-IT', {
                            day: '2-digit',
                            month: '2-digit'
                          }).format(new Date(i.recordDate)) === label
                        );
                        return item ? new Date(item.recordDate).toLocaleDateString('it-IT') : label;
                      }}
                      formatter={(value: any, name: string) => {
                        const labels: Record<string, string> = {
                          'temperatura': '°C',
                          'pH': '',
                          'ammoniaca': 'mg/L',
                          'ossigeno': 'mg/L',
                          'salinita': 'ppt'
                        };
                        return [`${value !== null ? value : '-'}${labels[name] || ''}`, name.charAt(0).toUpperCase() + name.slice(1)];
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="line"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="temperatura"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                      name="Temperatura"
                      connectNulls
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="pH"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      name="pH"
                      connectNulls
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="ammoniaca"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={false}
                      name="Ammoniaca"
                      connectNulls
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="ossigeno"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      name="Ossigeno"
                      connectNulls
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="salinita"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={false}
                      name="Salinità"
                      connectNulls
                    />
                    
                    {/* Brush per zoom sulla timeline */}
                    <Brush 
                      dataKey="date" 
                      height={30} 
                      stroke="#3b82f6"
                      fill="#f0f9ff"
                      travellerWidth={10}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* SGR Giornalieri Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Temp (°C)
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      pH
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      NH3 (mg/L)
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      O2 (mg/L)
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Salinità (ppt)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoadingSgrGiornalieri ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                        Caricamento dati Seneye...
                      </td>
                    </tr>
                  ) : sortedSgrGiornalieri.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-center text-gray-500">
                        Nessun dato Seneye trovato
                      </td>
                    </tr>
                  ) : (
                    sortedSgrGiornalieri.map((sgrGiornaliero) => {
                      const recordDate = new Date(sgrGiornaliero.recordDate);
                      const formattedDate = new Intl.DateTimeFormat('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      }).format(recordDate);
                      
                      return (
                        <tr key={sgrGiornaliero.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formattedDate}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {sgrGiornaliero.temperature !== null ? sgrGiornaliero.temperature : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {sgrGiornaliero.pH !== null ? sgrGiornaliero.pH : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {sgrGiornaliero.ammonia !== null ? sgrGiornaliero.ammonia : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {sgrGiornaliero.oxygen !== null ? sgrGiornaliero.oxygen : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {sgrGiornaliero.salinity !== null ? sgrGiornaliero.salinity : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-blue-500">
                  <Droplets className="h-5 w-5 mr-2" />
                  Parametri Acqua
                </CardTitle>
                <CardDescription>Ultimi valori registrati</CardDescription>
              </CardHeader>
              <CardContent>
                {sortedSgrGiornalieri && sortedSgrGiornalieri.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Temperatura:</span>
                      <span className="font-medium">{sortedSgrGiornalieri[0].temperature !== null ? `${sortedSgrGiornalieri[0].temperature}°C` : '-'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">pH:</span>
                      <span className="font-medium">{sortedSgrGiornalieri[0].pH !== null ? sortedSgrGiornalieri[0].pH : '-'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Ammoniaca:</span>
                      <span className="font-medium">{sortedSgrGiornalieri[0].ammonia !== null ? `${sortedSgrGiornalieri[0].ammonia} mg/L` : '-'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Ossigeno:</span>
                      <span className="font-medium">{sortedSgrGiornalieri[0].oxygen !== null ? `${sortedSgrGiornalieri[0].oxygen} mg/L` : '-'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Salinità:</span>
                      <span className="font-medium">{sortedSgrGiornalieri[0].salinity !== null ? `${sortedSgrGiornalieri[0].salinity} ppt` : '-'}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      Registrati il {new Intl.DateTimeFormat('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      }).format(new Date(sortedSgrGiornalieri[0].recordDate))}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Nessun dato disponibile</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-emerald-500">
                  <BarChart className="h-5 w-5 mr-2" />
                  Media Parametri
                </CardTitle>
                <CardDescription>Ultimi 7 giorni</CardDescription>
              </CardHeader>
              <CardContent>
                {sortedSgrGiornalieri && sortedSgrGiornalieri.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Temperatura media:</span>
                      <span className="font-medium">
                        {calculateAverage(sortedSgrGiornalieri.slice(0, 7).map(s => s.temperature))}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">pH medio:</span>
                      <span className="font-medium">
                        {calculateAverage(sortedSgrGiornalieri.slice(0, 7).map(s => s.pH))}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Ossigeno medio:</span>
                      <span className="font-medium">
                        {calculateAverage(sortedSgrGiornalieri.slice(0, 7).map(s => s.oxygen))}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">Dati insufficienti</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-purple-500">
                  <LineChart className="h-5 w-5 mr-2" />
                  SGR Attuale
                </CardTitle>
                <CardDescription>Mese corrente</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">SGR teorico:</span>
                    <span className="font-medium">{getCurrentMonthSgr()}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">SGR giornaliero:</span>
                    <span className="font-medium">{(getCurrentMonthSgr() / 30).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Crescita prevista:</span>
                    <span className="font-medium">
                      {(Math.pow(1 + getCurrentMonthSgr() / 100, 1/12) - 1).toFixed(2)}× al mese
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="previsioni">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-condensed font-bold text-gray-800">Previsioni di Crescita</h2>
            <Button onClick={() => refetchPrediction()}>
              <LineChart className="h-4 w-4 mr-1" />
              Aggiorna Previsione
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {compareMultipleSizes ? (
                <MultiSizeGrowthComparisonChart
                  measurementDate={new Date(projectionStartDate)}
                  sizesWithSgr={getSizesWithSgr()}
                  projectionDays={projectionDays}
                />
              ) : isLoadingPrediction ? (
                <div className="h-80 bg-white rounded-lg shadow flex items-center justify-center">
                  <p className="text-gray-500">Caricamento delle previsioni...</p>
                </div>
              ) : !growthPrediction ? (
                <div className="h-80 bg-white rounded-lg shadow flex items-center justify-center">
                  <p className="text-gray-500">Clicca su "Aggiorna Previsione" per calcolare le proiezioni di crescita</p>
                </div>
              ) : (
                <div className="bg-white p-4 rounded-lg shadow">
                  <GrowthPredictionChart 
                    currentWeight={getAverageWeightFromSize()}
                    measurementDate={new Date(projectionStartDate)}
                    theoreticalSgrMonthlyPercentage={getCurrentMonthSgr()}
                    projectionDays={projectionDays}
                    variationPercentages={{
                      best: bestVariation,
                      worst: worstVariation
                    }}
                  />
                </div>
              )}
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Parametri di Proiezione</CardTitle>
                  <CardDescription>Personalizza la previsione di crescita</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Taglia</label>
                      <Select 
                        value={selectedSizeId?.toString() || ""} 
                        onValueChange={(value) => setSelectedSizeId(value ? Number(value) : null)}
                        disabled={compareMultipleSizes}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona una taglia" />
                        </SelectTrigger>
                        <SelectContent>
                          {sizes?.sort((a: any, b: any) => {
                            const aNum = parseInt(a.name.split('-')[1] || '0');
                            const bNum = parseInt(b.name.split('-')[1] || '0');
                            return aNum - bNum;
                          }).map((size: any) => (
                            <SelectItem key={size.id} value={size.id.toString()}>
                              {size.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        {compareMultipleSizes ? (
                          'Confronto multiplo attivo - tutte le taglie mostrate'
                        ) : selectedSizeId ? (
                          <>SGR specifico: <strong>{getCurrentMonthSgr()?.toFixed(2)}%</strong> (da dati storici)</>
                        ) : (
                          'Seleziona una taglia per usare SGR specifico'
                        )}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="compare-sizes" 
                        checked={compareMultipleSizes}
                        onCheckedChange={(checked) => setCompareMultipleSizes(checked as boolean)}
                      />
                      <Label 
                        htmlFor="compare-sizes"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Confronta più taglie contemporaneamente
                      </Label>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Peso medio taglia</label>
                      <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                        <p className="text-base font-semibold text-gray-900">
                          {selectedSizeId ? (() => {
                            const weight = getAverageWeightFromSize();
                            // Mostra decimali appropriati: più decimali per pesi piccoli
                            const decimals = weight < 0.01 ? 6 : weight < 1 ? 4 : weight < 10 ? 2 : 0;
                            return `${weight.toFixed(decimals)} mg`;
                          })() : 'Seleziona una taglia'}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">
                        {selectedSizeId ? 'Calcolato automaticamente dalla taglia selezionata' : 'Il peso sarà calcolato dalla taglia'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Data inizio proiezione</label>
                      <Input 
                        type="date" 
                        value={projectionStartDate} 
                        onChange={(e) => setProjectionStartDate(e.target.value)}
                      />
                      <p className="text-xs text-gray-500">Data di partenza per il calcolo della crescita</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Giorni di proiezione</label>
                      <Input 
                        type="number" 
                        value={projectionDays} 
                        onChange={(e) => setProjectionDays(Number(e.target.value))}
                        min={7}
                        max={365}
                      />
                      <p className="text-xs text-gray-500">Numero di giorni nel futuro</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Variazione Positiva (%)</label>
                      <Input 
                        type="number" 
                        value={bestVariation} 
                        onChange={(e) => setBestVariation(Number(e.target.value))}
                        min={0}
                        max={100}
                      />
                      <p className="text-xs text-gray-500">Percentuale di variazione positiva rispetto al valore teorico</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Variazione Negativa (%)</label>
                      <Input 
                        type="number" 
                        value={worstVariation} 
                        onChange={(e) => setWorstVariation(Number(e.target.value))}
                        min={0}
                        max={100}
                      />
                      <p className="text-xs text-gray-500">Percentuale di variazione negativa rispetto al valore teorico</p>
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={() => refetchPrediction()}
                    >
                      Calcola Proiezione
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create SGR Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crea nuovo indice SGR</DialogTitle>
          </DialogHeader>
          <SgrForm 
            onSubmit={createSgrMutation.mutate} 
            isLoading={createSgrMutation.isPending} 
          />
        </DialogContent>
      </Dialog>

      {/* Edit SGR Dialog */}
      <Dialog open={!!editingSgr} onOpenChange={() => setEditingSgr(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica indice SGR</DialogTitle>
          </DialogHeader>
          <SgrForm 
            onSubmit={(values) => {
              // Assicurati che l'ID sia incluso nei dati inviati
              if (editingSgr && editingSgr.id) {
                updateSgrMutation.mutate({ ...values, id: editingSgr.id });
              }
            }} 
            isLoading={updateSgrMutation.isPending} 
            defaultValues={editingSgr}
          />
        </DialogContent>
      </Dialog>

      {/* Create SGR Giornaliero Dialog */}
      <Dialog open={isCreateDailyDialogOpen} onOpenChange={setIsCreateDailyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aggiungi misurazione Seneye</DialogTitle>
          </DialogHeader>
          <SgrGiornalieriForm 
            onSubmit={createSgrGiornalieroMutation.mutate} 
            isLoading={createSgrGiornalieroMutation.isPending} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}