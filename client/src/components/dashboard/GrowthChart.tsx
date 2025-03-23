import { useQuery } from '@tanstack/react-query';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Link } from 'wouter';
import { useState } from 'react';
import { ChevronDown, ChevronUp, BarChart } from 'lucide-react';

export default function GrowthChart() {
  const [expanded, setExpanded] = useState(false);
  
  // Query active cycles for chart
  const { data: cycles } = useQuery({
    queryKey: ['/api/cycles/active'],
  });

  // Select the first 3 cycles for the chart
  const selectedCycles = cycles?.slice(0, 3) || [];
  
  // Fetch statistics for selected cycles
  const cycleIds = selectedCycles.map(cycle => cycle.id).join(',');
  const { data: growthData, isLoading } = useQuery({
    queryKey: [`/api/statistics/cycles/comparison?cycleIds=${cycleIds}`],
    enabled: selectedCycles.length > 0,
  });

  // Prepare chart data by reformatting the API response
  const chartData = [];
  if (growthData) {
    // Find the max days to create consistent chart data
    const maxDays = Math.max(...growthData.flatMap(cycle => 
      cycle.growthData.map(point => point.daysFromStart)
    ), 0);
    
    // Create data points for each day
    for (let day = 0; day <= maxDays; day += 5) { // Show every 5 days
      const point = { day };
      
      growthData.forEach((cycle, index) => {
        // Find the closest growth data point
        const closestPoint = cycle.growthData.reduce((closest, current) => {
          const currentDiff = Math.abs(current.daysFromStart - day);
          const closestDiff = Math.abs(closest.daysFromStart - day);
          return currentDiff < closestDiff ? current : closest;
        }, { daysFromStart: Infinity, averageWeight: 0 });
        
        // Only add if the point is reasonably close (within 3 days)
        if (Math.abs(closestPoint.daysFromStart - day) <= 3) {
          point[`cycle${index}`] = closestPoint.averageWeight;
        }
      });
      
      chartData.push(point);
    }
  }

  const COLORS = ['#4791db', '#00796b', '#c8a415']; // primary-light, secondary, accent-dark

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-condensed font-bold text-lg text-gray-800">Andamento Crescita</h3>
          <button 
            className="p-1 rounded-full hover:bg-gray-100 transition-colors" 
            disabled 
            aria-label="Espandi pannello"
          >
            <ChevronDown className="h-5 w-5 text-gray-300" />
          </button>
        </div>
        <div className="p-4 flex justify-center items-center h-[150px]">
          <p>Caricamento dati...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow relative">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="font-condensed font-bold text-lg text-gray-800">Andamento Crescita</h3>
        <button 
          onClick={() => setExpanded(!expanded)} 
          className="p-1 rounded-full hover:bg-gray-100 transition-colors"
          aria-label={expanded ? "Comprimi pannello" : "Espandi pannello"}
        >
          {expanded ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
        </button>
      </div>
      
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${expanded ? 'max-h-[500px]' : 'max-h-[150px]'}`}>
        <div className="p-4">
          <div className="flex mb-4 flex-wrap">
            {selectedCycles.map((cycle, index) => (
              <div key={cycle.id} className="flex items-center mr-4 mb-2">
                <div 
                  className="h-3 w-3 rounded mr-1" 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></div>
                <span className="text-xs text-gray-600">Ciclo #{cycle.id}</span>
              </div>
            ))}
          </div>
          
          <div className={`w-full transition-all duration-300 ${expanded ? 'h-[300px]' : 'h-[80px]'}`}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: expanded ? 25 : 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="day" 
                    label={expanded ? { 
                      value: 'Giorni', 
                      position: 'insideBottomRight', 
                      offset: -10 
                    } : undefined} 
                  />
                  <YAxis 
                    label={expanded ? { 
                      value: 'Peso medio (mg)', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle' }
                    } : undefined} 
                  />
                  <Tooltip 
                    formatter={(value) => [`${value} mg`, 'Peso medio']}
                    labelFormatter={(value) => `Giorno ${value}`}
                  />
                  {expanded && <Legend />}
                  {selectedCycles.map((cycle, index) => (
                    <Line
                      key={cycle.id}
                      type="monotone"
                      dataKey={`cycle${index}`}
                      name={`Ciclo #${cycle.id}`}
                      stroke={COLORS[index % COLORS.length]}
                      activeDot={{ r: expanded ? 8 : 4 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full bg-gray-50 rounded flex items-center justify-center">
                <p className="text-gray-500">Nessun dato di crescita disponibile</p>
              </div>
            )}
          </div>
          
          <div className="mt-4 text-center">
            {!expanded && chartData.length > 0 && (
              <button
                onClick={() => setExpanded(true)}
                className="text-primary hover:text-primary-dark text-sm font-medium mr-4"
              >
                Mostra grafico completo <ChevronDown className="h-3 w-3 inline" />
              </button>
            )}
            <Link href="/statistics" className="text-primary hover:text-primary-dark text-sm font-medium">
              Visualizza tutte le statistiche →
            </Link>
          </div>
        </div>
      </div>
      
      {/* Sfumatura quando non è espanso */}
      {!expanded && chartData.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
      )}
    </div>
  );
}
