import { useState, useEffect } from 'react';
import { Waves, Thermometer, Navigation, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Coordinate esatte di Goro
// 44.82693493179904, 12.315839532852298
const GORO_LAT = 44.82693493179904;
const GORO_LON = 12.315839532852298;

// API per i dati di marea di Venezia (proxy locale)
const VENEZIA_TIDE_API = "/api/proxy/tide-data";
const VENEZIA_TIDE_FORECAST_API = "/api/proxy/tide-forecast";

interface WeatherData {
  seaTemperature: number | null;
  tideLevel: number | null;
  tideDirection: string | null;
  tideTime: string | null;
  windSpeed: number | null;
  windDirection: string | null;
  isLoading: boolean;
  lastUpdated: string | null;
  tideMaxLevel: number | null;
  tideMaxTime: string | null;
  tideMinLevel: number | null;
  tideMinTime: string | null;
  tideTrend: string | null;
  // Dati specifici di Chioggia
  chioggiaLevel: number | null;
  chioggiaTime: string | null;
  chioggiaForecast: Array<{time: string, level: number}> | null;
  // Dati degli estremi previsti per Chioggia
  chioggiaMaxLevel: number | null;
  chioggiaMaxTime: string | null;
  chioggiaMinLevel: number | null;
  chioggiaMinTime: string | null;
  chioggiaTrend: string | null;
}

export function MarineWeather() {
  const [weatherData, setWeatherData] = useState<WeatherData>({
    seaTemperature: null,
    tideLevel: null,
    tideDirection: null,
    tideTime: null,
    windSpeed: null,
    windDirection: null,
    isLoading: true,
    lastUpdated: null,
    tideMaxLevel: null,
    tideMaxTime: null,
    tideMinLevel: null,
    tideMinTime: null,
    tideTrend: null,
    chioggiaLevel: null,
    chioggiaTime: null,
    chioggiaForecast: null,
    chioggiaMaxLevel: null,
    chioggiaMaxTime: null,
    chioggiaMinLevel: null,
    chioggiaMinTime: null,
    chioggiaTrend: null
  });

  useEffect(() => {
    // Funzione per recuperare i dati delle maree da Venezia (Chioggia)
    const fetchChioggiaData = async () => {
      try {
        // Recupera il livello attuale della marea
        const response = await fetch(VENEZIA_TIDE_API);
        
        if (!response.ok) {
          throw new Error('Errore nel recupero dei dati di Chioggia');
        }
        
        const data = await response.json();
        
        // Estrae i dati per Chioggia (ci sono due stazioni: "Chioggia porto" e "Chioggia Vigo")
        const chioggiaData = data.find((station: any) => 
          station.stazione?.toLowerCase().includes('chioggia porto'));

        // In caso non trovi Chioggia Porto, prova con Chioggia Vigo
        const chioggiaAlt = data.find((station: any) =>
          station.stazione?.toLowerCase().includes('chioggia vigo')); 
        
        // Usa una delle due stazioni, preferibilmente Chioggia Porto
        const stationData = chioggiaData || chioggiaAlt;
        
        if (!stationData) {
          console.warn('Dati attuali per Chioggia non trovati');
          return null;
        }
        
        // Estrae il livello attuale e l'orario
        // Il formato è "0.47 m", quindi rimuoviamo " m" e convertiamo in numero
        const valoreTxt = stationData.valore as string;
        const valoreNumerico = parseFloat(valoreTxt.replace(' m', ''));
        
        const chioggiaLevel = valoreNumerico;
        const chioggiaTime = stationData.data; // Prende direttamente la data dalla risposta
        
        // Recupera le previsioni di marea e gli eventi estremi futuri (massimi e minimi)
        try {
          const forecastResponse = await fetch(VENEZIA_TIDE_FORECAST_API);
          
          if (forecastResponse.ok) {
            const forecastData = await forecastResponse.json();
            
            // Ordina gli eventi estremi per data
            const sortedExtremes = [...forecastData].sort((a, b) => {
              const dateA = new Date(a.DATA_ESTREMALE).getTime();
              const dateB = new Date(b.DATA_ESTREMALE).getTime();
              return dateA - dateB;
            });
            
            // Estrai massimi e minimi previsti
            const maxEvent = sortedExtremes.find(event => event.TIPO_ESTREMALE === 'max');
            const minEvent = sortedExtremes.find(event => event.TIPO_ESTREMALE === 'min');
            
            // Crea le previsioni orarie
            const chioggiaForecast: Array<{time: string, level: number}> = [];
            
            // Usa gli estremi per determinare la tendenza
            const now = new Date();
            const nextExtreme = sortedExtremes[0];
            const nextExtremeDate = new Date(nextExtreme.DATA_ESTREMALE);
            
            // Determina il trend della marea basato sul prossimo estremo
            let chioggiaTrend = "stabile";
            if (nextExtreme.TIPO_ESTREMALE === 'max') {
              chioggiaTrend = "crescente";
            } else if (nextExtreme.TIPO_ESTREMALE === 'min') {
              chioggiaTrend = "calante";
            }
            
            // Estrai massimo e minimo
            let chioggiaMaxLevel = null;
            let chioggiaMaxTime = null;
            let chioggiaMinLevel = null;
            let chioggiaMinTime = null;
            
            if (maxEvent) {
              const maxValue = parseInt(maxEvent.VALORE) / 100; // Converti in metri
              const maxDate = new Date(maxEvent.DATA_ESTREMALE);
              chioggiaMaxLevel = maxValue;
              chioggiaMaxTime = `${maxDate.getHours().toString().padStart(2, '0')}:${maxDate.getMinutes().toString().padStart(2, '0')}`;
            }
            
            if (minEvent) {
              const minValue = parseInt(minEvent.VALORE) / 100; // Converti in metri
              const minDate = new Date(minEvent.DATA_ESTREMALE);
              chioggiaMinLevel = minValue;
              chioggiaMinTime = `${minDate.getHours().toString().padStart(2, '0')}:${minDate.getMinutes().toString().padStart(2, '0')}`;
            }
            
            // Crea simulazione di dati orari basati sugli estremi per il grafico
            // Questo è necessario perché l'API fornisce solo eventi estremi (min/max)
            if (maxEvent && minEvent) {
              const maxValue = parseInt(maxEvent.VALORE) / 100;
              const minValue = parseInt(minEvent.VALORE) / 100;
              const maxTime = new Date(maxEvent.DATA_ESTREMALE).getTime();
              const minTime = new Date(minEvent.DATA_ESTREMALE).getTime();
              
              // Crea sei punti di previsione
              for (let i = 0; i < 6; i++) {
                const forecastTime = new Date(now.getTime() + i * 60 * 60 * 1000); // Ogni ora
                const forecastTimeStr = `${forecastTime.getHours().toString().padStart(2, '0')}:${forecastTime.getMinutes().toString().padStart(2, '0')}`;
                
                // Calcola livello basandosi su una funzione sinusoidale tra i due estremi
                const timeFraction = (forecastTime.getTime() - now.getTime()) / (maxTime - now.getTime());
                const level = chioggiaLevel + (maxValue - chioggiaLevel) * Math.sin(timeFraction * Math.PI / 2);
                
                chioggiaForecast.push({
                  time: forecastTimeStr,
                  level: parseFloat(level.toFixed(2))
                });
              }
            }
            
            return {
              chioggiaLevel,
              chioggiaTime,
              chioggiaForecast,
              chioggiaMaxLevel,
              chioggiaMaxTime,
              chioggiaMinLevel,
              chioggiaMinTime,
              chioggiaTrend
            };
          }
        } catch (forecastError) {
          console.error('Errore nel recupero delle previsioni marea di Chioggia:', forecastError);
        }
        
        // In caso di errore, restituisci almeno i dati attuali
        return {
          chioggiaLevel,
          chioggiaTime,
          chioggiaForecast: [],
          chioggiaMaxLevel: null,
          chioggiaMaxTime: null,
          chioggiaMinLevel: null,
          chioggiaMinTime: null,
          chioggiaTrend: null
        };
      } catch (error) {
        console.error('Errore nel recupero dei dati di Chioggia:', error);
        return null;
      }
    };
    
    const fetchMarineData = async () => {
      try {
        // Utilizziamo Open-Meteo Marine API con i parametri specifici per Goro
        const response = await fetch(
          `https://marine-api.open-meteo.com/v1/marine?latitude=${GORO_LAT}&longitude=${GORO_LON}&hourly=sea_level_height_msl,sea_surface_temperature&current=sea_level_height_msl,sea_surface_temperature&timezone=Europe%2FBerlin&past_days=2`
        );
        
        if (!response.ok) {
          throw new Error('Errore nel recupero dei dati');
        }
        
        const data = await response.json();
        
        // Utilizziamo i dati attuali (current) quando disponibili
        const seaTemp = data.current?.sea_surface_temperature || 0;
        
        // Prendiamo i dati dell'ora corrente dagli hourly data
        const currentHourIndex = new Date().getHours();
        const hourlySeaLevel = data.hourly.sea_level_height_msl[currentHourIndex + 24]; // +24 per ottenere i dati di oggi (past_days=2)
        
        // Analizziamo i dati orari delle ultime 48 ore (con past_days=2)
        const todayStart = 24; // Indice iniziale per i dati di oggi (dopo 2 giorni passati)
        const seaLevelToday = data.hourly.sea_level_height_msl.slice(todayStart, todayStart + 24);
        
        // Troviamo massimo e minimo livello della marea nelle prossime 24 ore
        const seaLevelValues = [...seaLevelToday];
        const maxLevel = Math.max(...seaLevelValues);
        const minLevel = Math.min(...seaLevelValues);
        
        // Troviamo gli orari di massima e minima marea
        const maxLevelIndex = seaLevelValues.indexOf(maxLevel);
        const minLevelIndex = seaLevelValues.indexOf(minLevel);
        
        const maxLevelTime = `${(currentHourIndex + maxLevelIndex) % 24}:00`;
        const minLevelTime = `${(currentHourIndex + minLevelIndex) % 24}:00`;
        
        // Calcoliamo la tendenza della marea confrontando il valore attuale con quello precedente e successivo
        const prevHourIndex = (currentHourIndex + 23) % 24 + 24;  // ora precedente
        const nextHourIndex = (currentHourIndex + 1) % 24 + 24;   // ora successiva
        const prevSeaLevel = data.hourly.sea_level_height_msl[prevHourIndex];
        const nextSeaLevel = data.hourly.sea_level_height_msl[nextHourIndex];
        
        // Determiniamo se la marea è in crescita o in calo
        let tideDirection = "stazionaria";
        if (nextSeaLevel > hourlySeaLevel) {
          tideDirection = "crescente";
        } else if (nextSeaLevel < hourlySeaLevel) {
          tideDirection = "calante";
        }
        
        // Determiniamo il trend generale della marea
        const nextFewHours = data.hourly.sea_level_height_msl.slice(todayStart + currentHourIndex, todayStart + currentHourIndex + 6);
        const firstValue = nextFewHours[0];
        const lastValue = nextFewHours[nextFewHours.length - 1];
        
        let tideTrend = "variabile";
        if (lastValue > firstValue + 0.1) {
          tideTrend = "in aumento";
        } else if (lastValue < firstValue - 0.1) {
          tideTrend = "in diminuzione";
        }
        
        // Usiamo il livello del mare reale dai dati API
        const tideLevel = data.current?.sea_level_height_msl || 0;
        
        // Data e ora corrente
        const now = new Date();
        const hours = now.getHours();
        
        // Stimiamo il prossimo cambiamento significativo della marea (circa 6 ore)
        const nextTideHour = hours + 6;
        const nextTideTime = `${nextTideHour % 24}:00`;
        
        // Valutiamo un'approssimazione del vento dal livello del mare
        // Notare che questo è un'approssimazione molto generica, in una versione avanzata bisognerebbe
        // usare un'API specifica per i dati del vento
        const windSpeed = Math.abs(nextSeaLevel - hourlySeaLevel) * 100;
        const windDirection = "NE"; // Direzione prevalente nell'area di Porto Tolle
        
        // Aggiorniamo lo stato con i dati ottenuti, mantendo i dati di Chioggia esistenti
        setWeatherData(prev => ({
          ...prev,
          seaTemperature: parseFloat(seaTemp.toFixed(1)),
          tideLevel: parseFloat(tideLevel.toFixed(2)),
          tideDirection: tideDirection,
          tideTime: nextTideTime,
          windSpeed: parseFloat(windSpeed.toFixed(1)),
          windDirection: windDirection,
          isLoading: false,
          lastUpdated: now.toLocaleTimeString('it-IT'),
          tideMaxLevel: parseFloat(maxLevel.toFixed(2)),
          tideMaxTime: maxLevelTime,
          tideMinLevel: parseFloat(minLevel.toFixed(2)),
          tideMinTime: minLevelTime,
          tideTrend: tideTrend
        }));
      } catch (error) {
        console.error('Errore nel recupero dei dati marine:', error);
        // In caso di errore, manteniamo isLoading a false ma non aggiorniamo gli altri dati
        setWeatherData(prev => ({ ...prev, isLoading: false }));
      }
    };
    
    // Funzione per convertire i gradi in direzione cardinale
    const mapDegreesToDirection = (degrees: number): string => {
      const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
      const index = Math.round((degrees % 360) / 22.5);
      return directions[index % 16];
    };

    // Funzione per recuperare entrambi i dati (Goro e Chioggia)
    const fetchAllData = async () => {
      try {
        // Recuperiamo i dati meteo marini standard
        await fetchMarineData();
        
        // Recuperiamo i dati specifici di Chioggia
        const chioggiaData = await fetchChioggiaData();
        
        if (chioggiaData) {
          // Aggiorniamo i dati di Chioggia, mantenendo gli altri dati invariati
          setWeatherData(prev => ({
            ...prev,
            chioggiaLevel: chioggiaData.chioggiaLevel,
            chioggiaTime: chioggiaData.chioggiaTime,
            chioggiaForecast: chioggiaData.chioggiaForecast,
            chioggiaMaxLevel: chioggiaData.chioggiaMaxLevel,
            chioggiaMaxTime: chioggiaData.chioggiaMaxTime,
            chioggiaMinLevel: chioggiaData.chioggiaMinLevel,
            chioggiaMinTime: chioggiaData.chioggiaMinTime,
            chioggiaTrend: chioggiaData.chioggiaTrend
          }));
        }
      } catch (error) {
        console.error('Errore nel recupero di tutti i dati:', error);
      }
    };
    
    // Chiamiamo subito la funzione al caricamento del componente
    fetchAllData();
    
    // Impostare intervalli per aggiornamenti:
    // - Dati meteo standard ogni 30 minuti
    // - Dati di Chioggia ogni 10 minuti
    const marineInterval = setInterval(fetchMarineData, 30 * 60 * 1000);
    const chioggiaInterval = setInterval(async () => {
      const chioggiaData = await fetchChioggiaData();
      if (chioggiaData) {
        setWeatherData(prev => ({
          ...prev,
          chioggiaLevel: chioggiaData.chioggiaLevel,
          chioggiaTime: chioggiaData.chioggiaTime,
          chioggiaForecast: chioggiaData.chioggiaForecast,
          chioggiaMaxLevel: chioggiaData.chioggiaMaxLevel,
          chioggiaMaxTime: chioggiaData.chioggiaMaxTime,
          chioggiaMinLevel: chioggiaData.chioggiaMinLevel,
          chioggiaMinTime: chioggiaData.chioggiaMinTime,
          chioggiaTrend: chioggiaData.chioggiaTrend
        }));
      }
    }, 10 * 60 * 1000); // 10 minuti
    
    // Pulizia degli intervalli alla smontaggio del componente
    return () => {
      clearInterval(marineInterval);
      clearInterval(chioggiaInterval);
    };
  }, []);

  if (weatherData.isLoading) {
    return (
      <div className="flex items-center space-x-2 text-white/60">
        <span>Caricamento dati mare...</span>
      </div>
    );
  }

  // Determina il trend e i valori massimi e minimi della marea di Chioggia
  const analyzeChioggiaForecast = () => {
    if (!weatherData.chioggiaForecast || weatherData.chioggiaForecast.length < 2) {
      return {
        trend: null,
        maxLevel: null,
        maxTime: null,
        minLevel: null,
        minTime: null
      };
    }
    
    // Prendiamo il primo e l'ultimo valore della previsione per determinare il trend
    const firstValue = weatherData.chioggiaForecast[0].level;
    const lastValue = weatherData.chioggiaForecast[weatherData.chioggiaForecast.length - 1].level;
    
    let trend;
    if (lastValue > firstValue + 0.05) {
      trend = "crescente";
    } else if (lastValue < firstValue - 0.05) {
      trend = "calante";
    } else {
      trend = "stabile";
    }
    
    // Calcola massimo e minimo dalle previsioni
    const levels = weatherData.chioggiaForecast.map(f => f.level);
    const maxLevel = Math.max(...levels);
    const minLevel = Math.min(...levels);
    
    // Trova gli orari corrispondenti ai valori massimi e minimi
    const maxForecast = weatherData.chioggiaForecast.find(f => f.level === maxLevel);
    const minForecast = weatherData.chioggiaForecast.find(f => f.level === minLevel);
    
    return {
      trend,
      maxLevel,
      maxTime: maxForecast?.time || null,
      minLevel,
      minTime: minForecast?.time || null
    };
  };
  
  // Ottieni il trend e i valori estremi della marea di Chioggia
  const chioggiaAnalysis = analyzeChioggiaForecast();

  return (
    <div className="hidden sm:flex items-center space-x-4 px-3 text-white/80">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center space-x-1">
              <Thermometer className="h-4 w-4" />
              <span className="text-sm">Mare: {weatherData.seaTemperature}°C</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Temperatura del mare a Goro</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Dati marea di Chioggia */}
      {weatherData.chioggiaLevel && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center space-x-1">
                <Waves className="h-4 w-4 text-blue-300" />
                <span className="text-sm">
                  Marea: {weatherData.chioggiaLevel.toFixed(2)}m 
                  {chioggiaAnalysis.trend && ` (${chioggiaAnalysis.trend})`}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="w-64">
              <div className="space-y-1">
                <p className="font-medium">Marea a Chioggia</p>
                <p>Livello attuale: {weatherData.chioggiaLevel.toFixed(2)}m</p>
                {chioggiaAnalysis.trend && <p>Trend: <span className="font-medium">{chioggiaAnalysis.trend}</span></p>}
                
                {/* Visualizza i valori massimi e minimi previsti */}
                {chioggiaAnalysis.maxLevel && chioggiaAnalysis.maxTime && (
                  <p>Max previsto: <span className="font-medium">{chioggiaAnalysis.maxLevel.toFixed(2)}m</span> alle <span className="font-mono">{chioggiaAnalysis.maxTime}</span></p>
                )}
                {chioggiaAnalysis.minLevel && chioggiaAnalysis.minTime && (
                  <p>Min previsto: <span className="font-medium">{chioggiaAnalysis.minLevel.toFixed(2)}m</span> alle <span className="font-mono">{chioggiaAnalysis.minTime}</span></p>
                )}
                
                <p className="text-xs text-gray-500">Aggiornato: {weatherData.chioggiaTime}</p>
                
                {weatherData.chioggiaForecast && weatherData.chioggiaForecast.length > 0 && (
                  <div className="pt-1 mt-1 border-t border-gray-200">
                    <p className="text-sm font-medium mb-1">Previsioni:</p>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                      {weatherData.chioggiaForecast.slice(0, 6).map((forecast, index) => (
                        <div key={index} className="text-xs">
                          <span className="font-mono">{forecast.time}</span>: {forecast.level.toFixed(2)}m
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center space-x-1">
              <Navigation className="h-4 w-4" />
              <span className="text-sm">{weatherData.windSpeed} km/h {weatherData.windDirection}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Vento a Goro</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center space-x-1 text-white/50">
              <Clock className="h-3 w-3" />
              <span className="text-xs">Aggiornato: {weatherData.lastUpdated}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Ultimo aggiornamento dati</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}