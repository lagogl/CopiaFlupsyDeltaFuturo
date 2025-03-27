import { useEffect, useState } from "react";
import { getQueryFn } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2Icon, CalendarIcon, AlertCircleIcon } from "lucide-react";
import { format, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { Link } from "wouter";

interface TargetSizePrediction {
  id: number;
  basketId: number;
  targetSizeId: number;
  status: string;
  predictedDate: string;
  basket: {
    id: number;
    physicalNumber: number;
    flupsyId: number;
    row: string | null;
    position: number | null;
  };
  lastOperation?: {
    id: number;
    date: string;
    animalsPerKg: number | null;
    averageWeight: number | null;
  } | null;
  daysRemaining: number;
  currentWeight?: number;
  targetWeight?: number;
}

interface Size {
  id: number;
  code: string;
  name: string;
  minAnimalsPerKg?: number;
  maxAnimalsPerKg?: number;
}

export function TargetSizePredictions() {
  const [days, setDays] = useState(14); // Default: 2 settimane
  const [targetSize, setTargetSize] = useState("TP-3000"); // Default: TP-3000
  
  // Recupera tutte le taglie disponibili
  const { data: sizes } = useQuery({
    queryKey: ['/api/sizes'],
    queryFn: getQueryFn<Size[]>({ on401: "throw" }),
  });
  
  // Recupera le previsioni usando il nuovo endpoint che supporta diverse taglie
  const { data: predictions, isLoading, isError, refetch } = useQuery({
    queryKey: [`/api/size-predictions?size=${targetSize}&days=${days}`, targetSize, days],
    queryFn: getQueryFn<TargetSizePrediction[]>({ on401: "throw" }),
  });

  // Funzione per formattare la data in italiano
  const formatDateIT = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, "d MMMM yyyy", { locale: it });
    } catch (e) {
      return dateStr;
    }
  };

  // Funzione per determinare lo stile del badge in base ai giorni rimanenti
  const getBadgeStyle = (daysRemaining: number) => {
    if (daysRemaining <= 3) return "bg-red-500 hover:bg-red-600"; // Urgente
    if (daysRemaining <= 7) return "bg-amber-500 hover:bg-amber-600"; // Attenzione
    return "bg-emerald-500 hover:bg-emerald-600"; // Normale
  };
  
  // Funzione per il messaggio sui giorni rimanenti
  const getDaysMessage = (daysRemaining: number) => {
    if (daysRemaining === 0) return "Oggi";
    if (daysRemaining === 1) return "Domani";
    return `Tra ${daysRemaining} giorni`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold">Ceste in arrivo a {targetSize}</CardTitle>
            <CardDescription>
              Previsioni di crescita verso la taglia commerciale {targetSize} 
              {days === 14 ? " (prossime 2 settimane)" : ` (prossimi ${days} giorni)`}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-4">
            {/* Selezione della taglia target */}
            <div className="w-40">
              <Select
                value={targetSize}
                onValueChange={setTargetSize}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Taglia target" />
                </SelectTrigger>
                <SelectContent>
                  {sizes?.map(size => (
                    <SelectItem key={size.id} value={size.code}>
                      {size.code} - {size.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Pulsanti per la durata */}
            <div className="space-x-2">
              <Button 
                variant={days === 7 ? "default" : "outline"} 
                size="sm" 
                onClick={() => setDays(7)}
              >
                7 giorni
              </Button>
              <Button 
                variant={days === 14 ? "default" : "outline"} 
                size="sm" 
                onClick={() => setDays(14)}
              >
                14 giorni
              </Button>
              <Button 
                variant={days === 30 ? "default" : "outline"} 
                size="sm" 
                onClick={() => setDays(30)}
              >
                30 giorni
              </Button>
              <Button 
                variant={days === 90 ? "default" : "outline"} 
                size="sm" 
                onClick={() => setDays(90)}
              >
                90 giorni
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center p-8 text-red-500">
            <AlertCircleIcon className="mr-2" />
            Errore nel caricamento delle previsioni
          </div>
        ) : predictions?.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-gray-500">
            <CheckCircle2Icon size={48} className="mb-2 text-emerald-500" />
            <p className="text-center">Nessuna cesta raggiungerà la taglia {targetSize} nei prossimi {days} giorni</p>
          </div>
        ) : (
          <div className="space-y-3">
            {predictions?.map((prediction) => (
              <div key={prediction.id} className="p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <Link to={`/operazioni/cestello/${prediction.basketId}`}>
                      <h3 className="text-lg font-medium hover:underline">
                        Cesta #{prediction.basket.physicalNumber}
                      </h3>
                    </Link>
                    {prediction.basket.row && prediction.basket.position && (
                      <Badge variant="outline" className="ml-2">
                        {prediction.basket.row}-{prediction.basket.position}
                      </Badge>
                    )}
                  </div>
                  <Badge className={getBadgeStyle(prediction.daysRemaining)}>
                    {getDaysMessage(prediction.daysRemaining)}
                  </Badge>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <CalendarIcon size={16} className="mr-1" />
                  <span>
                    Data prevista: <strong>{formatDateIT(prediction.predictedDate)}</strong>
                  </span>
                </div>
                
                {prediction.lastOperation && (
                  <div className="mt-2 text-sm">
                    <Separator className="my-1" />
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      <div>
                        <div className="text-gray-500">Ultima misura</div>
                        <div>{formatDateIT(prediction.lastOperation.date)}</div>
                      </div>
                      {prediction.lastOperation.animalsPerKg && (
                        <div>
                          <div className="text-gray-500">Animali/kg</div>
                          <div>{prediction.lastOperation.animalsPerKg.toLocaleString('it-IT')}</div>
                        </div>
                      )}
                      {prediction.lastOperation.averageWeight && (
                        <div>
                          <div className="text-gray-500">Peso medio</div>
                          <div>{prediction.lastOperation.averageWeight.toLocaleString('it-IT')} mg</div>
                        </div>
                      )}
                    </div>
                    
                    {/* Mostra dettagli di crescita se disponibili */}
                    {prediction.currentWeight && prediction.targetWeight && (
                      <div className="mt-2">
                        <Separator className="my-1" />
                        <div className="grid grid-cols-3 gap-2 mt-1">
                          <div>
                            <div className="text-gray-500">Peso attuale</div>
                            <div>{Math.round(prediction.currentWeight).toLocaleString('it-IT')} mg</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Peso target</div>
                            <div>{Math.round(prediction.targetWeight).toLocaleString('it-IT')} mg</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Incremento</div>
                            <div>{Math.round((prediction.targetWeight / prediction.currentWeight - 1) * 100)}%</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}