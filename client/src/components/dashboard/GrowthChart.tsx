import { useQuery } from '@tanstack/react-query';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Link } from 'wouter';

export default function GrowthChart() {
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
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-condensed font-bold text-lg text-gray-800">Andamento Crescita</h3>
        </div>
        <div className="p-4 flex justify-center items-center h-[300px]">
          <p>Caricamento dati...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-condensed font-bold text-lg text-gray-800">Andamento Crescita</h3>
      </div>
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
        <div className="h-[300px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="day" 
                  label={{ 
                    value: 'Giorni', 
                    position: 'insideBottomRight', 
                    offset: -10 
                  }} 
                />
                <YAxis 
                  label={{ 
                    value: 'Peso medio (mg)', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle' }
                  }} 
                />
                <Tooltip 
                  formatter={(value) => [`${value} mg`, 'Peso medio']}
                  labelFormatter={(value) => `Giorno ${value}`}
                />
                <Legend />
                {selectedCycles.map((cycle, index) => (
                  <Line
                    key={cycle.id}
                    type="monotone"
                    dataKey={`cycle${index}`}
                    name={`Ciclo #${cycle.id}`}
                    stroke={COLORS[index % COLORS.length]}
                    activeDot={{ r: 8 }}
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
          <Link href="/statistics" className="text-primary hover:text-primary-dark text-sm font-medium">
            Visualizza tutte le statistiche →
          </Link>
        </div>
      </div>
    </div>
  );
}
