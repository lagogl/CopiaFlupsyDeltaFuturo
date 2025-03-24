import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, Plus, Pencil, LineChart, Droplets, BarChart } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SgrForm from '@/components/SgrForm';
import SgrGiornalieriForm from '@/components/SgrGiornalieriForm';
import GrowthPredictionChart from '@/components/GrowthPredictionChart';

export default function Sgr() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreateDailyDialogOpen, setIsCreateDailyDialogOpen] = useState(false);
  const [editingSgr, setEditingSgr] = useState<any>(null);
  const [currentWeightForPrediction, setCurrentWeightForPrediction] = useState(250); // default 250mg
  const [projectionDays, setProjectionDays] = useState(60); // 60 giorni default
  const [bestVariation, setBestVariation] = useState(20); // +20% default
  const [worstVariation, setWorstVariation] = useState(30); // -30% default
  
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
  
  // Get current month's SGR
  const getCurrentMonthSgr = () => {
    const today = new Date();
    const currentMonthName = monthOrder[today.getMonth()];
    const currentSgr = sgrs?.find(sgr => sgr.month.toLowerCase() === currentMonthName);
    return currentSgr?.percentage || 60; // Default to 60% if not found
  };
  
  // Query per le proiezioni di crescita
  const { data: growthPrediction, isLoading: isLoadingPrediction, refetch: refetchPrediction } = useQuery({
    queryKey: ['/api/growth-prediction', currentWeightForPrediction, getCurrentMonthSgr(), projectionDays, bestVariation, worstVariation],
    queryFn: () => apiRequest('GET', `/api/growth-prediction?currentWeight=${currentWeightForPrediction}&sgrPercentage=${getCurrentMonthSgr()}&days=${projectionDays}&bestVariation=${bestVariation}&worstVariation=${worstVariation}`),
    enabled: false
  });

  // Create SGR mutation
  const createSgrMutation = useMutation({
    mutationFn: (newSgr: any) => apiRequest('POST', '/api/sgr', newSgr),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sgr'] });
      setIsCreateDialogOpen(false);
    }
  });

  // Update SGR mutation
  const updateSgrMutation = useMutation({
    mutationFn: (sgr: any) => apiRequest('PATCH', `/api/sgr/${sgr.id}`, sgr),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sgr'] });
      setEditingSgr(null);
    }
  });

  // Create SGR Giornaliero mutation
  const createSgrGiornalieroMutation = useMutation({
    mutationFn: (newSgrGiornaliero: any) => apiRequest('POST', '/api/sgr-giornalieri', newSgrGiornaliero),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sgr-giornalieri'] });
      setIsCreateDailyDialogOpen(false);
    }
  });

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

  return (
    <div>
      <Tabs defaultValue="indici-sgr" className="w-full">
        <TabsList className="grid grid-cols-3 w-full mb-6 max-w-md">
          <TabsTrigger value="indici-sgr">Indici SGR</TabsTrigger>
          <TabsTrigger value="dati-giornalieri">Dati Seneye</TabsTrigger>
          <TabsTrigger value="previsioni">Previsioni</TabsTrigger>
        </TabsList>

        <TabsContent value="indici-sgr">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-condensed font-bold text-gray-800">Indici SGR Mensili</h2>
            <div className="flex space-x-3">
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Nuovo SGR
              </Button>
            </div>
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
              {isLoadingPrediction ? (
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
                    currentWeight={currentWeightForPrediction}
                    measurementDate={new Date()}
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
                      <label className="text-sm font-medium">Peso attuale (mg)</label>
                      <Input 
                        type="number" 
                        value={currentWeightForPrediction} 
                        onChange={(e) => setCurrentWeightForPrediction(Number(e.target.value))}
                        min={1}
                        max={5000}
                      />
                      <p className="text-xs text-gray-500">Peso medio attuale in milligrammi</p>
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