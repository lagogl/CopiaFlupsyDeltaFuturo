import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import { useRef, useEffect, useState } from 'react';
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

export default function Dashboard() {
  const { isFirstTimeUser, registerTooltip, showTooltip } = useTooltip();
  const queryClient = useQueryClient();
  
  // Stato per gestire l'ultimo aggiornamento dei dati
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [needsRefresh, setNeedsRefresh] = useState<boolean>(false);
  
  // Stato per il filtro dei FLUPSY
  const [selectedCenter, setSelectedCenter] = useState<string>('');
  const [selectedFlupsyIds, setSelectedFlupsyIds] = useState<number[]>([]);
  
  // Riferimenti agli elementi che avranno tooltip
  const dashboardTitleRef = useRef<HTMLHeadingElement>(null);
  const basketsCardRef = useRef<HTMLDivElement>(null);
  const cyclesCardRef = useRef<HTMLDivElement>(null);
  const operationsCardRef = useRef<HTMLDivElement>(null);
  const lotsCardRef = useRef<HTMLDivElement>(null);
  const recentOperationsRef = useRef<HTMLDivElement>(null);
  const growthChartRef = useRef<HTMLDivElement>(null);
  const flupsyVisualizerRef = useRef<HTMLDivElement>(null);

  // Query for active baskets and cycles
  const { data: baskets, isLoading: basketsLoading, dataUpdatedAt: basketsUpdatedAt } = useQuery<Basket[]>({
    queryKey: ['/api/baskets'],
  });

  const { data: cycles, isLoading: cyclesLoading, dataUpdatedAt: cyclesUpdatedAt } = useQuery<Cycle[]>({
    queryKey: ['/api/cycles'],
  });

  const { data: operations, isLoading: operationsLoading, dataUpdatedAt: operationsUpdatedAt } = useQuery<Operation[]>({
    queryKey: ['/api/operations'],
  });

  const { data: lots, isLoading: lotsLoading, dataUpdatedAt: lotsUpdatedAt } = useQuery<Lot[]>({
    queryKey: ['/api/lots'],
  });
  
  // Funzione per aggiornare i dati
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['/api/baskets'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/cycles'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/operations'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/lots'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/flupsys'] }),
        queryClient.invalidateQueries({ queryKey: ['/api/sizes'] })
      ]);
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
    const latestUpdate = Math.max(
      basketsUpdatedAt || 0,
      cyclesUpdatedAt || 0,
      operationsUpdatedAt || 0,
      lotsUpdatedAt || 0
    );
    
    if (latestUpdate > 0) {
      setLastRefresh(new Date(latestUpdate));
    }
  }, [basketsUpdatedAt, cyclesUpdatedAt, operationsUpdatedAt, lotsUpdatedAt]);

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

  // Calculate dashboard stats
  const activeBaskets = baskets?.filter(b => b.state === 'active') || [];
  // Distinguish between active baskets with cycle and without cycle
  const activeBasketsWithCycle = activeBaskets.filter(b => b.currentCycleId !== null);
  const activeBasketsWithoutCycle = activeBaskets.filter(b => b.currentCycleId === null);
  
  const activeCycles = cycles?.filter(c => c.state === 'active') || [];
  const todayOperations = operations?.filter(op => {
    const today = new Date().toISOString().split('T')[0];
    return new Date(op.date).toISOString().split('T')[0] === today;
  }) || [];
  const activeLots = lots?.filter(l => l.state === 'active') || [];

  // Calcola il numero totale di animali nelle ceste attive
  const totalAnimalsInActiveBaskets = activeBaskets.reduce((total, basket) => {
    // Trova le operazioni più recenti per ogni cesta attiva
    const basketOperations = operations
      ?.filter(op => op.basketId === basket.id)
      ?.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) || [];
    
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
  if (basketsLoading || cyclesLoading || operationsLoading || lotsLoading) {
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
              secondaryInfo={`${totalAnimalsInActiveBaskets.toLocaleString('it-IT')} animali totali`}
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
      
      {/* FLUPSY Filter and Visualizer */}
      <div className="mb-8">
        <TooltipTrigger 
          tooltip={{
            id: 'flupsy-center-filter',
            content: 'Seleziona il centro di produzione per visualizzare solo i FLUPSY di quel centro.',
            position: 'top'
          }}
          showOnMount={isFirstTimeUser}
          onlyFirstTime={true}
        >
          <div>
            <FlupsyCenterFilter 
              onFilterChange={(center, flupsyIds) => {
                setSelectedCenter(center);
                setSelectedFlupsyIds(flupsyIds);
              }}
            />
          </div>
        </TooltipTrigger>
        
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
