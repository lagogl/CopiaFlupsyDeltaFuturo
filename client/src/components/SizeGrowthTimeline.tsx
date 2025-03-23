import React, { useState } from 'react';
import { format, addDays, addMonths } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarIcon, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  calculateSizeTimeline,
  getFutureWeightAtDate,
  getTargetSizeForWeight,
  SizeTimeline,
  TargetSize,
  TARGET_SIZES
} from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';

interface SizeGrowthTimelineProps {
  currentWeight: number;
  measurementDate: Date;
  sgrMonthlyPercentage: number;
  cycleId?: number;
  basketId?: number;
}

export default function SizeGrowthTimeline({
  currentWeight,
  measurementDate,
  sgrMonthlyPercentage,
  cycleId,
  basketId
}: SizeGrowthTimelineProps) {
  const [projectionMonths, setProjectionMonths] = useState(6);
  const [targetDate, setTargetDate] = useState<Date | undefined>(addMonths(new Date(), 3));
  const [activeTab, setActiveTab] = useState('timeline');
  
  // Carica le taglie dal database
  const { data: sizes } = useQuery({ 
    queryKey: ['/api/sizes'],
    refetchOnWindowFocus: false,
  });
  
  // Calcola la timeline di crescita usando le taglie disponibili
  const growthTimeline = calculateSizeTimeline(
    currentWeight,
    measurementDate,
    sgrMonthlyPercentage,
    projectionMonths,
    sizes
  );
  
  // Se non ci sono dati, mostra un messaggio
  if (growthTimeline.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Previsioni Taglia</CardTitle>
          <CardDescription>Non sono disponibili dati per generare previsioni</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-48">
          <p className="text-muted-foreground text-center">
            Nessun dato disponibile per calcolare le previsioni di crescita.
            <br />Assicurati di avere registrato almeno una misurazione valida.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Formatta la data nel formato italiano
  const formatDate = (date: Date) => {
    return format(date, 'dd MMM yyyy', { locale: it });
  };
  
  // Ottieni la taglia attuale
  const currentSize = growthTimeline[0]?.size;
  
  // Trova l'indice della taglia attuale nell'array delle taglie target
  const currentSizeIndex = currentSize 
    ? TARGET_SIZES.findIndex(size => size.code === currentSize.code)
    : -1;
  
  // Filtra le taglie future (quelle con indice maggiore della taglia attuale)
  const futureSizes = currentSizeIndex >= 0 
    ? TARGET_SIZES.slice(currentSizeIndex + 1)
    : [];
    
  // Per ogni taglia futura, trova la data in cui verrà raggiunta (se presente nella timeline)
  const sizeReachDates = futureSizes.map(targetSize => {
    const timelineEntry = growthTimeline.find(entry => 
      entry.size?.code === targetSize.code
    );
    
    return {
      size: targetSize,
      date: timelineEntry?.date,
      daysToReach: timelineEntry?.daysToReach || 0,
      weight: timelineEntry?.weight || 0
    };
  }).filter(item => item.date); // Filtra solo le taglie che verranno raggiunte
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Previsioni Taglia</CardTitle>
        <CardDescription>
          Proiezioni basate su SGR mensile del {sgrMonthlyPercentage.toFixed(1)}%
        </CardDescription>
        <div className="mt-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="target-date">Data Target</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <TabsContent value="timeline" className="mt-4">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Periodo di proiezione</span>
                <Badge variant="outline">{projectionMonths} mesi</Badge>
              </div>
              <Slider
                value={[projectionMonths]}
                min={1}
                max={12}
                step={1}
                onValueChange={(value) => setProjectionMonths(value[0])}
              />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Taglia Attuale</h3>
              <div className="flex items-center space-x-2">
                <Badge 
                  className={currentSize?.color}
                >
                  {currentSize?.code || 'N/A'}
                </Badge>
                <span className="text-sm">{currentSize?.name || 'Sconosciuta'}</span>
                <span className="text-sm text-muted-foreground ml-auto">
                  {currentWeight} mg
                </span>
              </div>
            </div>
            
            {sizeReachDates.length > 0 ? (
              <div className="space-y-2 mt-4">
                <h3 className="text-sm font-medium">Raggiungimento Taglie Future</h3>
                <div className="space-y-3">
                  {sizeReachDates.map((item) => (
                    <div 
                      key={item.size.code}
                      className="flex items-center p-2 rounded-md border"
                    >
                      <div>
                        <Badge className={item.size.color}>
                          {item.size.code}
                        </Badge>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium">{item.size.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.weight} mg
                        </div>
                      </div>
                      <div className="ml-auto text-right">
                        <div className="text-sm font-medium">
                          {formatDate(item.date!)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.daysToReach} giorni
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center p-4 text-muted-foreground">
                Nessuna taglia futura verrà raggiunta nel periodo di proiezione.
                <br />
                Prova ad aumentare il periodo di proiezione.
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="target-date" className="mt-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Seleziona una data target</span>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {targetDate ? formatDate(targetDate) : "Seleziona data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={targetDate}
                    onSelect={setTargetDate}
                    initialFocus
                    disabled={(date) => date < new Date(measurementDate) || date > addMonths(new Date(), 12)}
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {targetDate && (
              <div className="mt-6">
                <div className="flex items-center space-x-2 mb-4">
                  <div className="flex-1 p-3 rounded-md border">
                    <div className="text-sm text-muted-foreground">Oggi</div>
                    <div className="mt-1 flex items-center space-x-2">
                      <Badge className={currentSize?.color || ''}>
                        {currentSize?.code || 'N/A'}
                      </Badge>
                      <span className="text-sm">{currentWeight} mg</span>
                    </div>
                  </div>
                  
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  
                  <div className="flex-1 p-3 rounded-md border bg-muted/10">
                    <div className="text-sm text-muted-foreground">
                      {formatDate(targetDate)}
                    </div>
                    <FutureSizeAtDate
                      currentWeight={currentWeight}
                      measurementDate={measurementDate}
                      sgrPercentage={sgrMonthlyPercentage}
                      targetDate={targetDate}
                    />
                  </div>
                </div>
                
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Cosa succede prima di questa data?</h3>
                  <SizeProgressToDate
                    currentWeight={currentWeight}
                    measurementDate={measurementDate}
                    sgrPercentage={sgrMonthlyPercentage}
                    targetDate={targetDate}
                  />
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </CardContent>
    </Card>
  );
}

interface FutureSizeAtDateProps {
  currentWeight: number;
  measurementDate: Date;
  sgrPercentage: number;
  targetDate: Date;
}

function FutureSizeAtDate({ 
  currentWeight, 
  measurementDate, 
  sgrPercentage, 
  targetDate 
}: FutureSizeAtDateProps) {
  // Calcola la timeline di crescita
  const timeline = calculateSizeTimeline(
    currentWeight,
    measurementDate,
    sgrPercentage,
    12 // Usa 12 mesi come periodo massimo
  );
  
  // Trova la taglia alla data target
  const targetDateMs = targetDate.getTime();
  
  let closestEntry = timeline[0]; // Default: entry corrente
  
  // Trova l'entry più vicino alla data target
  for (const entry of timeline) {
    const entryDate = new Date(entry.date);
    if (entryDate.getTime() <= targetDateMs) {
      closestEntry = entry;
    } else {
      break; // Abbiamo superato la data target
    }
  }
  
  // Se non abbiamo trovato nulla di utile, interpoliamo
  if (closestEntry.date.getTime() < targetDateMs) {
    // Calcola il tasso di crescita giornaliero
    const dailyGrowthRate = sgrPercentage / 30 / 100;
    
    // Calcola il numero di giorni tra la data dell'entry e la data target
    const diffDays = Math.ceil(
      (targetDateMs - closestEntry.date.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Calcola il peso previsto alla data target
    const targetWeight = closestEntry.weight * Math.pow(1 + dailyGrowthRate, diffDays);
    
    // Trova la taglia corrispondente
    const targetSize = TARGET_SIZES.find(
      size => targetWeight >= size.minWeight && targetWeight <= size.maxWeight
    );
    
    return (
      <div className="mt-1 flex items-center space-x-2">
        <Badge className={targetSize?.color || ''}>
          {targetSize?.code || 'N/A'}
        </Badge>
        <span className="text-sm">{Math.round(targetWeight)} mg</span>
      </div>
    );
  }
  
  // Altrimenti usiamo l'entry trovato
  return (
    <div className="mt-1 flex items-center space-x-2">
      <Badge className={closestEntry.size?.color || ''}>
        {closestEntry.size?.code || 'N/A'}
      </Badge>
      <span className="text-sm">{closestEntry.weight} mg</span>
    </div>
  );
}

interface SizeProgressToDateProps {
  currentWeight: number;
  measurementDate: Date;
  sgrPercentage: number;
  targetDate: Date;
}

function SizeProgressToDate({
  currentWeight,
  measurementDate,
  sgrPercentage,
  targetDate
}: SizeProgressToDateProps) {
  // Calcola la timeline di crescita
  const timeline = calculateSizeTimeline(
    currentWeight,
    measurementDate,
    sgrPercentage,
    12 // Usa 12 mesi come periodo massimo
  );
  
  // Trova gli eventi di cambio taglia prima della data target
  const targetDateMs = targetDate.getTime();
  
  // Filtra gli eventi di cambio taglia prima della data target
  // e mantieni solo quelli dove cambia la taglia (escludi il primo entry)
  const sizeChangeEvents = timeline
    .filter((entry, index) => 
      index > 0 && // Salta il primo entry (taglia corrente)
      entry.date.getTime() <= targetDateMs && // Prima della data target
      entry.size?.code !== timeline[index - 1].size?.code // Cambio di taglia
    );
  
  if (sizeChangeEvents.length === 0) {
    return (
      <div className="text-center p-3 text-muted-foreground text-sm rounded-md border">
        Nessun cambio di taglia previsto prima di questa data.
      </div>
    );
  }
  
  // Formatta la data nel formato italiano
  const formatDate = (date: Date) => {
    return format(date, 'dd MMM yyyy', { locale: it });
  };
  
  return (
    <div className="space-y-2">
      {sizeChangeEvents.map((event, index) => (
        <div 
          key={index}
          className="flex items-center p-2 rounded-md border"
        >
          <Badge className={event.size?.color || ''}>
            {event.size?.code || 'N/A'}
          </Badge>
          <div className="ml-3 flex-1">
            <div className="text-sm font-medium">{event.size?.name}</div>
            <div className="text-xs text-muted-foreground">
              {event.weight} mg
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">
              {formatDate(event.date)}
            </div>
            <div className="text-xs text-muted-foreground">
              {event.daysToReach} giorni
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}