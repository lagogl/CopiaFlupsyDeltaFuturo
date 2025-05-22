import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import React, { useRef, useEffect, useState, useMemo } from 'react';
import StatCard from '@/components/dashboard/StatCard';
import RecentOperations from '@/components/dashboard/RecentOperations';
import GrowthChart from '@/components/dashboard/GrowthChart';
import ActiveCycles from '@/components/dashboard/ActiveCycles';
import FlupsyVisualizer from '@/components/dashboard/BasicFlupsyVisualizer';
import FlupsyCenterFilter from '@/components/dashboard/FlupsyCenterFilter';
import FlupsySelector from '@/components/dashboard/FlupsySelector';
import { TargetSizePredictions } from '@/components/dashboard/TargetSizePredictions';
import { Basket, Cycle, Operation, Lot } from '@shared/schema';
import { TooltipTrigger } from '@/components/ui/tooltip-trigger';
import { useTooltip } from '@/contexts/TooltipContext';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { useFilterPersistence } from '@/hooks/useFilterPersistence';

export default function Dashboard() {
  const { isFirstTimeUser, registerTooltip, showTooltip } = useTooltip();
  const queryClient = useQueryClient();
  
  // Stato per gestire l'ultimo aggiornamento dei dati
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [needsRefresh, setNeedsRefresh] = useState<boolean>(false);
  
  // Utilizzo del hook di persistenza per i filtri
  const [filters, setFilters] = useFilterPersistence('dashboard', {
    selectedCenter: '',
    selectedFlupsyIds: [] as number[]
  });
  
  // Utilizzo dei filtri salvati
  const selectedCenter = filters.selectedCenter;
  const selectedFlupsyIds = filters.selectedFlupsyIds as number[];
  
  // Funzioni per aggiornare i filtri
  const setSelectedCenter = (value: string) => 
    setFilters(prev => ({ ...prev, selectedCenter: value }));
  
  const setSelectedFlupsyIds = (value: number[]) => 
    setFilters(prev => ({ ...prev, selectedFlupsyIds: value }));
  
  // Riferimenti agli elementi che avranno tooltip
  const dashboardTitleRef = useRef<HTMLHeadingElement>(null);
  const basketsCardRef = useRef<HTMLDivElement>(null);
  const cyclesCardRef = useRef<HTMLDivElement>(null);
  const operationsCardRef = useRef<HTMLDivElement>(null);
  const lotsCardRef = useRef<HTMLDivElement>(null);
  const recentOperationsRef = useRef<HTMLDivElement>(null);
  const growthChartRef = useRef<HTMLDivElement>(null);
  const flupsyVisualizerRef = useRef<HTMLDivElement>(null);

  // Query ottimizzate per la dashboard
  const { data: dashboardStats, isLoading: statsLoading, dataUpdatedAt: statsUpdatedAt } = useQuery({
    queryKey: ['/api/dashboard/stats', selectedCenter, selectedFlupsyIds],
    queryFn: async () => {
      // Crea parametri per il filtro di centro e flupsy
      const params = new URLSearchParams();
      if (selectedCenter) params.append('center', selectedCenter);
      if (selectedFlupsyIds.length > 0) params.append('flupsyIds', selectedFlupsyIds.join(','));
      
      console.log('Caricamento statistiche dashboard ottimizzate...');
      const response = await fetch(`/api/dashboard/stats?${params}`);
      if (!response.ok) {
        throw new Error('Errore nel caricamento delle statistiche della dashboard');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minuti
  });
  
  // Usa i dati recuperati ottimizzati
  const baskets = dashboardStats?.baskets || [];
  const cycles = dashboardStats?.cycles || [];
  const operations = dashboardStats?.operations || [];
  const lots = dashboardStats?.lots || [];
  
  // Flag di caricamento
  const isLoading = statsLoading;
  const dataUpdatedAt = statsUpdatedAt;
  
  // Funzione per aggiornare i dati
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      setLastRefresh(new Date());
      setNeedsRefresh(false);
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Controlla se i dati sono vecchi (più di 5 minuti)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      if (lastRefresh < fiveMinutesAgo) {
        setNeedsRefresh(true);
      }
    }, 60000); // Controlla ogni minuto
    
    return () => clearInterval(interval);
  }, [lastRefresh]);
  
  // Verifica l'aggiornamento dei dati
  useEffect(() => {
    if (statsUpdatedAt > 0) {
      setLastRefresh(new Date(statsUpdatedAt));
    }
  }, [statsUpdatedAt]);

  // Registrazione dei tooltip solo una volta all'avvio del componente
  useEffect(() => {
    // Registrazione dei tooltip
    registerTooltip({
      id: 'dashboard-intro',
      content: 'Benvenuto nella dashboard! Qui puoi visualizzare un riepilogo completo delle tue attività e dello stato del tuo allevamento.',
      position: 'bottom',
      delay: 8000,
      persistent: true
    });
    
    // Mostra il tooltip di benvenuto se è un nuovo utente
    if (isFirstTimeUser && dashboardTitleRef.current) {
      const timer = setTimeout(() => {
        showTooltip('dashboard-intro', dashboardTitleRef);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isFirstTimeUser]); // Rimuoviamo registerTooltip e showTooltip dalle dipendenze

  // Filtra i cestelli in base ai FLUPSY selezionati
  const filteredBaskets = useMemo(() => {
    if (!baskets) return [];
    if (selectedFlupsyIds.length === 0) return baskets;
    
    return baskets.filter(basket => 
      selectedFlupsyIds.includes(basket.flupsyId)
    );
  }, [baskets, selectedFlupsyIds]);
  
  // Calculate dashboard stats con i cestelli filtrati
  const activeBaskets = filteredBaskets.filter(b => b.state === 'active');
  // Distinguish between active baskets with cycle and without cycle
  const activeBasketsWithCycle = activeBaskets.filter(b => b.currentCycleId !== null);
  const activeBasketsWithoutCycle = activeBaskets.filter(b => b.currentCycleId === null);
  
  // Filtra i cicli: mostra solo quelli delle ceste che appartengono ai FLUPSY selezionati
  const filteredCycles = useMemo(() => {
    if (!cycles || !filteredBaskets) return [];
    
    const basketIds = filteredBaskets.map(b => b.id);
    return cycles.filter(c => basketIds.includes(c.basketId));
  }, [cycles, filteredBaskets]);
  
  // Filtra le operazioni: mostra solo quelle delle ceste che appartengono ai FLUPSY selezionati
  const filteredOperations = useMemo(() => {
    if (!operations || !filteredBaskets) return [];
    
    const basketIds = filteredBaskets.map(b => b.id);
    return operations.filter(op => basketIds.includes(op.basketId));
  }, [operations, filteredBaskets]);
  
  const activeCycles = filteredCycles.filter(c => c.state === 'active');
  const todayOperations = filteredOperations.filter(op => {
    const today = new Date().toISOString().split('T')[0];
    return new Date(op.date).toISOString().split('T')[0] === today;
  });
  const activeLots = lots?.filter(l => l.state === 'active') || [];

  // Calcola il numero totale di animali nelle ceste attive
  const totalAnimalsInActiveBaskets = activeBaskets.reduce((total, basket) => {
    // Trova le operazioni più recenti per ogni cesta attiva (usando le operazioni filtrate)
    const basketOperations = filteredOperations
      .filter(op => op.basketId === basket.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Prendi la più recente operazione che ha un conteggio di animali
    const latestOperationWithCount = basketOperations.find(op => op.animalCount !== null && op.animalCount !== undefined);
    
    // Aggiungi al totale se abbiamo un conteggio di animali
    if (latestOperationWithCount?.animalCount) {
      return total + latestOperationWithCount.animalCount;
    }
    
    return total;
  }, 0);

  // Previous month comparison for baskets
  const lastMonthBaskets = activeBaskets.length - 3; // Mocked diff (+3 from last month)

  // Loading state
  if (isLoading) {
    return <div className="flex justify-center items-center h-full">Caricamento dashboard...</div>;
  }

  // Formatta il tempo trascorso dall'ultimo aggiornamento
  const formatLastUpdate = () => {
    const now = new Date();
    const diff = now.getTime() - lastRefresh.getTime();
    const mins = Math.floor(diff / 60000);
    
    if (mins < 1) return "Aggiornato adesso";
    if (mins === 1) return "Aggiornato 1 minuto fa";
    if (mins < 60) return `Aggiornato ${mins} minuti fa`;
    
    const hours = Math.floor(mins / 60);
    if (hours === 1) return "Aggiornato 1 ora fa";
    return `Aggiornato ${hours} ore fa`;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 
          ref={dashboardTitleRef} 
          className="text-2xl font-condensed font-bold text-gray-800"
        >
          Dashboard
        </h2>
        
        <div className="flex items-center gap-2">
          {needsRefresh && (
            <div className="flex items-center text-amber-600 bg-amber-50 px-3 py-1 rounded-md mr-2">
              <AlertCircle className="w-4 h-4 mr-1" />
              <span className="text-sm">Dati non aggiornati</span>
            </div>
          )}
          
          <div className="text-sm text-gray-500 mr-2">
            {formatLastUpdate()}
          </div>
          
          <Button
            size="sm"
            onClick={refreshData}
            disabled={isRefreshing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Aggiornamento...' : 'Aggiorna dati'}
          </Button>
        </div>
      </div>
      
      {/* Filtri per la dashboard */}
      <div className="space-y-4">
        {/* Filtro per centro di produzione */}
        <FlupsyCenterFilter 
          onFilterChange={(center, flupsyIds) => {
            setSelectedCenter(center);
            setSelectedFlupsyIds(flupsyIds);
          }} 
        />
        
        {/* Filtro per FLUPSY specifici */}
        <FlupsySelector
          selectedCenter={selectedCenter}
          selectedFlupsyIds={selectedFlupsyIds}
          onSelectionChange={(flupsyIds) => {
            setSelectedFlupsyIds(flupsyIds);
          }}
        />
      </div>
      
      {/* Dashboard Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <TooltipTrigger 
          tooltip={{
            id: 'baskets-card',
            content: 'Questo indicatore mostra il numero di ceste attualmente attive nel sistema. Clicca per visualizzare tutte le ceste.',
            position: 'top'
          }}
          showOnMount={isFirstTimeUser}
          onlyFirstTime={true}
        >
          <div ref={basketsCardRef}>
            <StatCard 
              title="Ceste Attive" 
              value={activeBaskets.length} 
              icon={<div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>}
              changeText={
                activeBasketsWithoutCycle.length > 0 
                  ? `${activeBasketsWithCycle.length} con ciclo, ${activeBasketsWithoutCycle.length} senza ciclo` 
                  : lastMonthBaskets > 0 
                    ? `+${lastMonthBaskets} dall'ultimo mese` 
                    : `${lastMonthBaskets} dall'ultimo mese`
              }
              changeType={activeBasketsWithoutCycle.length > 0 ? 'warning' : lastMonthBaskets >= 0 ? 'success' : 'error'}
              linkTo="/baskets"
              cardColor="from-blue-50 to-blue-100 border-l-4 border-blue-500"
              secondaryInfo={`${totalAnimalsInActiveBaskets.toLocaleString('it-IT')} animali`}
            />
          </div>
        </TooltipTrigger>

        <TooltipTrigger 
          tooltip={{
            id: 'cycles-card',
            content: 'I cicli rappresentano i periodi di crescita degli organismi. Clicca per gestire i cicli produttivi.',
            position: 'top'
          }}
          showOnMount={isFirstTimeUser}
          onlyFirstTime={true}
        >
          <div ref={cyclesCardRef}>
            <StatCard 
              title="Cicli Attivi" 
              value={activeCycles.length} 
              icon={<div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>}
              changeText="+2 dall'ultimo mese"
              changeType="success"
              linkTo="/cycles"
              cardColor="from-green-50 to-green-100 border-l-4 border-green-500"
            />
          </div>
        </TooltipTrigger>

        <TooltipTrigger 
          tooltip={{
            id: 'operations-card',
            content: 'Le operazioni effettuate oggi. Clicca per registrare nuove operazioni.',
            position: 'top'
          }}
          showOnMount={isFirstTimeUser}
          onlyFirstTime={true}
        >
          <div ref={operationsCardRef}>
            <StatCard 
              title="Operazioni Oggi" 
              value={todayOperations.length} 
              icon={<div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>}
              changeText="Meno di ieri (12)"
              changeType="info"
              linkTo="/operations"
              cardColor="from-purple-50 to-purple-100 border-l-4 border-purple-500"
            />
          </div>
        </TooltipTrigger>

        <TooltipTrigger 
          tooltip={{
            id: 'lots-card',
            content: 'I lotti rappresentano gruppi di animali. Clicca per gestire i lotti.',
            position: 'top'
          }}
          showOnMount={isFirstTimeUser}
          onlyFirstTime={true}
        >
          <div ref={lotsCardRef}>
            <StatCard 
              title="Lotti Attivi" 
              value={activeLots.length} 
              icon={<div className="h-12 w-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>}
              changeText="Stabile da 2 settimane"
              changeType="warning"
              linkTo="/lots"
              cardColor="from-orange-50 to-orange-100 border-l-4 border-orange-500"
            />
          </div>
        </TooltipTrigger>
      </div>

      {/* Recent Activities and Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <TooltipTrigger 
          tooltip={{
            id: 'recent-operations',
            content: 'Qui puoi vedere le operazioni più recenti. Clicca su una operazione per vederne i dettagli.',
            position: 'left'
          }}
          showOnMount={isFirstTimeUser}
          onlyFirstTime={true}
        >
          <div ref={recentOperationsRef}>
            <RecentOperations operations={operations?.slice(0, 5) || []} />
          </div>
        </TooltipTrigger>
        
        <TooltipTrigger 
          tooltip={{
            id: 'growth-chart',
            content: 'Questo grafico mostra l\'andamento di crescita nel tempo per aiutarti a monitorare lo sviluppo degli organismi.',
            position: 'right'
          }}
          showOnMount={isFirstTimeUser}
          onlyFirstTime={true}
        >
          <div ref={growthChartRef}>
            <GrowthChart />
          </div>
        </TooltipTrigger>
      </div>

      {/* Target Size Predictions */}
      <div className="mb-8">
        <TargetSizePredictions />
      </div>
      
      {/* FLUPSY Visualizer */}
      <div className="mb-8">
        <TooltipTrigger 
          tooltip={{
            id: 'flupsy-visualizer',
            content: 'Questa visualizzazione mostra lo stato attuale dei tuoi FLUPSY con la relativa occupazione delle ceste.',
            position: 'top'
          }}
          showOnMount={isFirstTimeUser}
          onlyFirstTime={true}
        >
          <div ref={flupsyVisualizerRef}>
            <FlupsyVisualizer 
              selectedFlupsyIds={selectedFlupsyIds}
            />
          </div>
        </TooltipTrigger>
      </div>
      
      {/* Active Cycles Table */}
      <ActiveCycles activeCycles={activeCycles} />
    </div>
  );
}
