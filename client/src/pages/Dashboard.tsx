import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { useRef, useEffect } from 'react';
import StatCard from '@/components/dashboard/StatCard';
import RecentOperations from '@/components/dashboard/RecentOperations';
import GrowthChart from '@/components/dashboard/GrowthChart';
import ActiveCycles from '@/components/dashboard/ActiveCycles';
import FlupsyVisualizer from '@/components/dashboard/BasicFlupsyVisualizer';
import { TargetSizePredictions } from '@/components/dashboard/TargetSizePredictions';
import { Basket, Cycle, Operation, Lot } from '@shared/schema';
import { TooltipTrigger } from '@/components/ui/tooltip-trigger';
import { useTooltip } from '@/contexts/TooltipContext';

export default function Dashboard() {
  const { isFirstTimeUser, registerTooltip, showTooltip } = useTooltip();
  
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
  const { data: baskets, isLoading: basketsLoading } = useQuery<Basket[]>({
    queryKey: ['/api/baskets'],
  });

  const { data: cycles, isLoading: cyclesLoading } = useQuery<Cycle[]>({
    queryKey: ['/api/cycles'],
  });

  const { data: operations, isLoading: operationsLoading } = useQuery<Operation[]>({
    queryKey: ['/api/operations'],
  });

  const { data: lots, isLoading: lotsLoading } = useQuery<Lot[]>({
    queryKey: ['/api/lots'],
  });

  // Registrazione dei tooltip
  useEffect(() => {
    // Registrazione dei tooltip
    registerTooltip({
      id: 'dashboard-intro',
      content: 'Benvenuto nella dashboard! Qui puoi visualizzare un riepilogo completo delle tue attività e dello stato del tuo allevamento.',
      position: 'bottom',
      delay: 8000,
      persistent: true
    });

    registerTooltip({
      id: 'baskets-card',
      content: 'Questo indicatore mostra il numero di ceste attualmente attive nel sistema.',
      position: 'top',
      delay: 5000
    });

    registerTooltip({
      id: 'cycles-card',
      content: 'I cicli rappresentano i periodi di crescita degli organismi. Questo è il conteggio dei cicli attualmente in corso.',
      position: 'top',
      delay: 5000
    });

    registerTooltip({
      id: 'operations-card',
      content: 'Le operazioni effettuate oggi. Puoi registrare nuove operazioni dalla sezione "Operazioni Rapide".',
      position: 'top',
      delay: 5000
    });

    registerTooltip({
      id: 'lots-card',
      content: 'I lotti rappresentano gruppi di animali che condividono caratteristiche comuni come la provenienza o la data di arrivo.',
      position: 'top',
      delay: 5000
    });

    registerTooltip({
      id: 'recent-operations',
      content: 'Qui puoi vedere le operazioni più recenti. Clicca su una operazione per vederne i dettagli.',
      position: 'left',
      delay: 5000
    });

    registerTooltip({
      id: 'growth-chart',
      content: 'Questo grafico mostra l\'andamento di crescita nel tempo per aiutarti a monitorare lo sviluppo degli organismi.',
      position: 'right',
      delay: 5000
    });

    registerTooltip({
      id: 'flupsy-visualizer',
      content: 'Questa visualizzazione mostra lo stato attuale dei tuoi FLUPSY con la relativa occupazione delle ceste.',
      position: 'top',
      delay: 5000
    });

    // Mostra il tooltip di benvenuto se è un nuovo utente
    if (isFirstTimeUser && dashboardTitleRef.current) {
      setTimeout(() => {
        showTooltip('dashboard-intro', dashboardTitleRef);
      }, 1000);
    }
  }, [registerTooltip, isFirstTimeUser, showTooltip]);

  // Calculate dashboard stats
  const activeBaskets = baskets?.filter(b => b.state === 'active') || [];
  const activeCycles = cycles?.filter(c => c.state === 'active') || [];
  const todayOperations = operations?.filter(op => {
    const today = new Date().toISOString().split('T')[0];
    return new Date(op.date).toISOString().split('T')[0] === today;
  }) || [];
  const activeLots = lots?.filter(l => l.state === 'active') || [];

  // Previous month comparison for baskets
  const lastMonthBaskets = activeBaskets.length - 3; // Mocked diff (+3 from last month)

  // Loading state
  if (basketsLoading || cyclesLoading || operationsLoading || lotsLoading) {
    return <div className="flex justify-center items-center h-full">Caricamento dashboard...</div>;
  }

  return (
    <div>
      <h2 
        ref={dashboardTitleRef} 
        className="text-2xl font-condensed font-bold text-gray-800 mb-6"
      >
        Dashboard
      </h2>
      
      {/* Dashboard Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <TooltipTrigger 
          tooltip={{
            id: 'baskets-card',
            content: 'Questo indicatore mostra il numero di ceste attualmente attive nel sistema.',
            position: 'top'
          }}
          showOnMount={isFirstTimeUser}
          onlyFirstTime={true}
        >
          <div ref={basketsCardRef}>
            <StatCard 
              title="Ceste Attive" 
              value={activeBaskets.length} 
              icon={<div className="h-12 w-12 rounded-full bg-primary-light/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>}
              changeText={lastMonthBaskets > 0 ? `+${lastMonthBaskets} dall'ultimo mese` : `${lastMonthBaskets} dall'ultimo mese`}
              changeType={lastMonthBaskets >= 0 ? 'success' : 'error'}
            />
          </div>
        </TooltipTrigger>

        <TooltipTrigger 
          tooltip={{
            id: 'cycles-card',
            content: 'I cicli rappresentano i periodi di crescita degli organismi. Questo è il conteggio dei cicli attualmente in corso.',
            position: 'top'
          }}
          showOnMount={isFirstTimeUser}
          onlyFirstTime={true}
        >
          <div ref={cyclesCardRef}>
            <StatCard 
              title="Cicli Attivi" 
              value={activeCycles.length} 
              icon={<div className="h-12 w-12 rounded-full bg-secondary-light/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>}
              changeText="+2 dall'ultimo mese"
              changeType="success"
            />
          </div>
        </TooltipTrigger>

        <TooltipTrigger 
          tooltip={{
            id: 'operations-card',
            content: 'Le operazioni effettuate oggi. Puoi registrare nuove operazioni dalla sezione "Operazioni Rapide".',
            position: 'top'
          }}
          showOnMount={isFirstTimeUser}
          onlyFirstTime={true}
        >
          <div ref={operationsCardRef}>
            <StatCard 
              title="Operazioni Oggi" 
              value={todayOperations.length} 
              icon={<div className="h-12 w-12 rounded-full bg-info/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>}
              changeText="Meno di ieri (12)"
              changeType="info"
            />
          </div>
        </TooltipTrigger>

        <TooltipTrigger 
          tooltip={{
            id: 'lots-card',
            content: 'I lotti rappresentano gruppi di animali che condividono caratteristiche comuni come la provenienza o la data di arrivo.',
            position: 'top'
          }}
          showOnMount={isFirstTimeUser}
          onlyFirstTime={true}
        >
          <div ref={lotsCardRef}>
            <StatCard 
              title="Lotti Attivi" 
              value={activeLots.length} 
              icon={<div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-accent-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>}
              changeText="Stabile da 2 settimane"
              changeType="warning"
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
      <TooltipTrigger 
        tooltip={{
          id: 'flupsy-visualizer',
          content: 'Questa visualizzazione mostra lo stato attuale dei tuoi FLUPSY con la relativa occupazione delle ceste.',
          position: 'top'
        }}
        showOnMount={isFirstTimeUser}
        onlyFirstTime={true}
      >
        <div className="mb-8" ref={flupsyVisualizerRef}>
          <FlupsyVisualizer />
        </div>
      </TooltipTrigger>
      
      {/* Active Cycles Table */}
      <ActiveCycles activeCycles={activeCycles} />
    </div>
  );
}
