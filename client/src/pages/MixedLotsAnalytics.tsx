import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, BarChart3, TrendingUp, Split, Zap } from 'lucide-react';
import PageHeader from '@/components/PageHeader';

interface MixedBasketComposition {
  basketId: number;
  cycleId: number;
  basketPhysical: number;
  flupsyId: number;
  flupsyName: string;
  lotCount: number;
  totalAnimals: number;
  compositions: string;
  estimatedMortalityRate: number;
  riskLevel: 'basso' | 'medio' | 'alto';
}

interface MixedLotsResponse {
  success: boolean;
  mixedBaskets: MixedBasketComposition[];
  summary: {
    totalMixedBaskets: number;
    averageLotsPerBasket: number;
    totalAnimalsInMixedBaskets: number;
  };
}

const MixedLotsAnalytics: React.FC = () => {
  const [selectedFlupsy, setSelectedFlupsy] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('30');

  // Query per i dati delle composizioni miste
  const { data: mixedLotsData, isLoading, error, refetch } = useQuery<MixedLotsResponse>({
    queryKey: ['/api/analytics/mixed-lots-composition', selectedFlupsy, selectedPeriod],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedFlupsy !== 'all') params.append('flupsyId', selectedFlupsy);
      params.append('period', selectedPeriod);
      
      const response = await fetch(`/api/analytics/mixed-lots-composition?${params}`);
      if (!response.ok) {
        throw new Error('Errore nel caricamento dati composizione lotti misti');
      }
      return response.json();
    }
  });

  // Query per la lista FLUPSY
  const { data: flupsyData } = useQuery({
    queryKey: ['/api/flupsys'],
    queryFn: async () => {
      const response = await fetch('/api/flupsys');
      return response.json();
    }
  });

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case 'alto': return 'destructive';
      case 'medio': return 'secondary';
      case 'basso': return 'default';
      default: return 'outline';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'alto': return <AlertTriangle className="h-4 w-4" />;
      case 'medio': return <TrendingUp className="h-4 w-4" />;
      case 'basso': return <Zap className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <PageHeader title="Analytics Lotti Misti" />
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4" />
              <p className="text-lg font-semibold">Errore nel caricamento dati</p>
              <p className="text-sm text-muted-foreground mt-2">
                {error instanceof Error ? error.message : 'Errore sconosciuto'}
              </p>
              <Button onClick={() => refetch()} className="mt-4" variant="outline">
                Riprova
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader title="Analytics Lotti Misti" />

      {/* Filtri */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Split className="h-5 w-5" />
            Filtri Analytics
          </CardTitle>
          <CardDescription>
            Personalizza l'analisi dei lotti misti per periodo e FLUPSY
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="min-w-48">
              <label className="text-sm font-medium mb-2 block">FLUPSY</label>
              <Select value={selectedFlupsy} onValueChange={setSelectedFlupsy}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona FLUPSY" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i FLUPSY</SelectItem>
                  {flupsyData?.map((flupsy: any) => (
                    <SelectItem key={flupsy.id} value={flupsy.id.toString()}>
                      {flupsy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-32">
              <label className="text-sm font-medium mb-2 block">Periodo</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 giorni</SelectItem>
                  <SelectItem value="14">14 giorni</SelectItem>
                  <SelectItem value="30">30 giorni</SelectItem>
                  <SelectItem value="60">60 giorni</SelectItem>
                  <SelectItem value="90">90 giorni</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={() => refetch()} variant="outline">
                Aggiorna Dati
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Caricamento analytics lotti misti...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Riepilogo */}
          {mixedLotsData?.summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Cestelli Misti
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {mixedLotsData.summary.totalMixedBaskets}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    cestelli con lotti misti attivi
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Lotti per Cestello
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {mixedLotsData.summary.averageLotsPerBasket.toFixed(1)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    media lotti per cestello misto
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Animali in Lotti Misti
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {mixedLotsData.summary.totalAnimalsInMixedBaskets.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    animali totali coinvolti
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Lista cestelli misti */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Split className="h-5 w-5" />
                Cestelli con Lotti Misti
              </CardTitle>
              <CardDescription>
                Dettaglio composizione e analisi rischio mortalità per ogni cestello
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mixedLotsData?.mixedBaskets && mixedLotsData.mixedBaskets.length > 0 ? (
                <div className="space-y-4">
                  {mixedLotsData.mixedBaskets.map((basket) => (
                    <div key={`${basket.basketId}-${basket.cycleId}`} 
                         className="border rounded-lg p-4 bg-card">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">
                            Cestello {basket.basketPhysical} - {basket.flupsyName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {basket.lotCount} lotti • {basket.totalAnimals.toLocaleString()} animali
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getRiskBadgeVariant(basket.riskLevel)} className="flex items-center gap-1">
                            {getRiskIcon(basket.riskLevel)}
                            Rischio {basket.riskLevel.charAt(0).toUpperCase() + basket.riskLevel.slice(1)}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="bg-muted/50 rounded p-3 mb-3">
                        <h4 className="font-medium text-sm mb-2">Composizione Lotti:</h4>
                        <p className="text-sm leading-relaxed">
                          {basket.compositions}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Mortalità Stimata:
                        </span>
                        <span className={`font-medium ${
                          basket.estimatedMortalityRate > 10 ? 'text-red-600' :
                          basket.estimatedMortalityRate > 5 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {basket.estimatedMortalityRate.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Split className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nessun Cestello Misto Trovato</h3>
                  <p className="text-muted-foreground">
                    Non ci sono cestelli con composizione mista di lotti nel periodo selezionato.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default MixedLotsAnalytics;