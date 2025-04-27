import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { ArrowDownIcon, ArrowUpIcon, ArrowRightIcon, AlertCircleIcon, InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface EcoScoreDisplayProps {
  flupsyId?: number;
  score: number;
  impacts: {
    water: number;
    carbon: number;
    energy: number;
    waste: number;
    biodiversity: number;
  };
  trends: {
    water: number;
    carbon: number;
    energy: number;
    waste: number;
    biodiversity: number;
  };
  suggestions: string[];
  period: {
    startDate: Date;
    endDate: Date;
  };
  loading?: boolean;
}

// Definizione dei colori per ciascuna categoria di impatto
const IMPACT_COLORS = {
  water: "#3b82f6", // blue
  carbon: "#10b981", // green
  energy: "#f59e0b", // amber
  waste: "#ef4444", // red
  biodiversity: "#8b5cf6", // purple
};

const translateCategory = (category: string): string => {
  const translations: Record<string, string> = {
    water: "Acqua",
    carbon: "Carbonio",
    energy: "Energia",
    waste: "Rifiuti",
    biodiversity: "Biodiversità",
  };
  return translations[category] || category;
};

const formatImpactValue = (value: number, category: string): string => {
  // Formatta il valore in base alla categoria
  switch (category) {
    case "water":
      return `${value.toFixed(1)} m³`;
    case "carbon":
      return `${value.toFixed(1)} kg CO₂e`;
    case "energy":
      return `${value.toFixed(1)} kWh`;
    case "waste":
      return `${value.toFixed(1)} kg`;
    case "biodiversity":
      return value.toFixed(2);
    default:
      return value.toString();
  }
};

const getTrendIcon = (trend: number) => {
  if (trend < -5) return <ArrowDownIcon className="h-4 w-4 text-green-500" />;
  if (trend > 5) return <ArrowUpIcon className="h-4 w-4 text-red-500" />;
  return <ArrowRightIcon className="h-4 w-4 text-gray-500" />;
};

const EcoScoreDisplay: React.FC<EcoScoreDisplayProps> = ({
  flupsyId,
  score,
  impacts,
  trends,
  suggestions,
  period,
  loading = false,
}) => {
  // Prepara i dati per i grafici
  const barChartData = Object.entries(impacts).map(([category, value]) => ({
    name: translateCategory(category),
    value,
    trend: trends[category as keyof typeof trends] || 0,
    color: IMPACT_COLORS[category as keyof typeof IMPACT_COLORS],
    formattedValue: formatImpactValue(value, category),
    category,
  }));

  const pieChartData = barChartData.map((item) => ({
    name: item.name,
    value: item.value,
    color: item.color,
  }));

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Eco-Impact Score</CardTitle>
            <CardDescription>
              Punteggio di sostenibilità ambientale (
              {period.startDate.toLocaleDateString()} - {period.endDate.toLocaleDateString()})
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="outline">
              {flupsyId ? `FLUPSY #${flupsyId}` : "Tutti i FLUPSY"}
            </Badge>
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button variant="ghost" size="icon">
                  <InfoIcon className="h-4 w-4" />
                </Button>
              </HoverCardTrigger>
              <HoverCardContent className="w-80">
                <div className="space-y-2">
                  <h4 className="font-medium">Cos'è l'Eco-Impact Score?</h4>
                  <p className="text-sm text-muted-foreground">
                    L'Eco-Impact Score misura l'impatto ambientale delle operazioni
                    in una scala da 0 a 100, dove 100 rappresenta l'impatto minimo.
                    Il punteggio considera consumi di acqua, emissioni di carbonio,
                    utilizzo di energia, produzione di rifiuti e impatto sulla biodiversità.
                  </p>
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Punteggio e barra di avanzamento */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Punteggio Complessivo</span>
              <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
                {score.toFixed(1)}
              </span>
            </div>
            <Progress
              value={score}
              max={100}
              className="h-3"
              // Il colore della barra di avanzamento varia in base al punteggio
              style={{
                "--progress-background": score >= 80
                  ? "var(--success)"
                  : score >= 60
                  ? "var(--warning)"
                  : score >= 40
                  ? "var(--orange)"
                  : "var(--destructive)",
              } as React.CSSProperties}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>25</span>
              <span>50</span>
              <span>75</span>
              <span>100</span>
            </div>
          </div>

          {/* Tabs per visualizzazioni diverse */}
          <Tabs defaultValue="bar" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="bar">Grafico a Barre</TabsTrigger>
              <TabsTrigger value="pie">Grafico a Torta</TabsTrigger>
            </TabsList>
            <TabsContent value="bar" className="pt-4">
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barChartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      formatter={(value, name, props) => [
                        props.payload.formattedValue,
                        props.payload.name,
                      ]}
                    />
                    <Bar dataKey="value">
                      {barChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
            <TabsContent value="pie" className="pt-4">
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label={(entry) => entry.name}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name, props) => [
                        formatImpactValue(
                          Number(value),
                          barChartData.find((item) => item.name === name)?.category || ""
                        ),
                        name,
                      ]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>

          {/* Tabella dettagliata degli impatti */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left font-medium">Categoria</th>
                  <th className="py-2 text-right font-medium">Valore</th>
                  <th className="py-2 text-right font-medium">Trend</th>
                </tr>
              </thead>
              <tbody>
                {barChartData.map((item) => (
                  <tr key={item.category} className="border-b">
                    <td className="py-2 text-left">
                      <div className="flex items-center">
                        <div
                          className="h-3 w-3 rounded-full mr-2"
                          style={{ backgroundColor: item.color }}
                        ></div>
                        {item.name}
                      </div>
                    </td>
                    <td className="py-2 text-right">{item.formattedValue}</td>
                    <td className="py-2 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <span
                          className={
                            item.trend < 0
                              ? "text-green-500"
                              : item.trend > 0
                              ? "text-red-500"
                              : "text-gray-500"
                          }
                        >
                          {Math.abs(item.trend).toFixed(1)}%
                        </span>
                        {getTrendIcon(item.trend)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Suggerimenti per migliorare il punteggio */}
          {suggestions && suggestions.length > 0 && (
            <Accordion type="single" collapsible>
              <AccordionItem value="suggestions">
                <AccordionTrigger>
                  <div className="flex items-center space-x-2">
                    <AlertCircleIcon className="h-4 w-4 text-yellow-500" />
                    <span>Suggerimenti per migliorare</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 list-disc pl-5">
                    {suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EcoScoreDisplay;