import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import StatCard from '@/components/dashboard/StatCard';
import RecentOperations from '@/components/dashboard/RecentOperations';
import GrowthChart from '@/components/dashboard/GrowthChart';
import ActiveCycles from '@/components/dashboard/ActiveCycles';

export default function Dashboard() {
  // Query for active baskets and cycles
  const { data: baskets, isLoading: basketsLoading } = useQuery({
    queryKey: ['/api/baskets'],
  });

  const { data: cycles, isLoading: cyclesLoading } = useQuery({
    queryKey: ['/api/cycles'],
  });

  const { data: operations, isLoading: operationsLoading } = useQuery({
    queryKey: ['/api/operations'],
  });

  const { data: lots, isLoading: lotsLoading } = useQuery({
    queryKey: ['/api/lots'],
  });

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
      <h2 className="text-2xl font-condensed font-bold text-gray-800 mb-6">Dashboard</h2>
      
      {/* Dashboard Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

      {/* Recent Activities and Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <RecentOperations operations={operations?.slice(0, 5) || []} />
        <GrowthChart />
      </div>

      {/* Active Cycles Table */}
      <ActiveCycles activeCycles={activeCycles} />
    </div>
  );
}
