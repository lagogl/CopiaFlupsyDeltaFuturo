import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, TrendingUp, TrendingDown, BarChart3, Building2 } from "lucide-react";
import { format } from "date-fns";
import PageHeader from "@/components/PageHeader";

interface GiacenzeData {
  success: boolean;
  data: {
    dateFrom: string;
    dateTo: string;
    flupsyId: number | null;
    totale_giacenza: number;
    totale_entrate: number;
    totale_uscite: number;
    dettaglio_operazioni: {
      'prima-attivazione': number;
      'ripopolamento': number;
      'cessazione': number;
      'vendita': number;
    };
    dettaglio_taglie: Array<{
      code: string;
      name: string;
      entrate: number;
      uscite: number;
      giacenza: number;
    }>;
    dettaglio_flupsys: Array<{
      id: number;
      name: string;
      entrate: number;
      uscite: number;
      giacenza: number;
    }>;
    operations_by_date: Record<string, Array<{
      id: number;
      type: string;
      animalCount: number;
      basketNumber: number;
      flupsyName: string;
      sizeCode: string;
    }>>;
    statistiche: {
      numero_operazioni: number;
      giorni_analizzati: number;
      media_giornaliera: number;
    };
    calculationTime: string;
  };
}

interface GiacenzeSummaryData {
  success: boolean;
  data: {
    dateFrom: string;
    dateTo: string;
    totale_giacenza: number;
    totale_entrate: number;
    totale_uscite: number;
    numero_operazioni: number;
    cestelli_coinvolti: number;
    flupsys_coinvolti: number;
  };
}

export default function GiacenzeRange() {
  const [dateFrom, setDateFrom] = useState("2025-08-01");
  const [dateTo, setDateTo] = useState("2025-08-31");
  const [flupsyId, setFlupsyId] = useState("");
  const [showDetails, setShowDetails] = useState(false);

  // Query per giacenze dettagliate
  const { 
    data: giacenzeData, 
    isLoading: isLoadingDetailed,
    error: detailedError,
    refetch: refetchDetailed 
  } = useQuery<GiacenzeData>({
    queryKey: ['/api/giacenze/range', dateFrom, dateTo, flupsyId],
    queryFn: async () => {
      const params = new URLSearchParams({
        dateFrom,
        dateTo,
        ...(flupsyId && { flupsyId })
      });
      
      const response = await fetch(`/api/giacenze/range?${params}`);
      if (!response.ok) {
        throw new Error(`${response.status}: ${await response.text()}`);
      }
      return response.json();
    },
    enabled: false, // Manual trigger
  });

  // Query per riepilogo rapido
  const { 
    data: summaryData, 
    isLoading: isLoadingSummary,
    error: summaryError,
    refetch: refetchSummary 
  } = useQuery<GiacenzeSummaryData>({
    queryKey: ['/api/giacenze/summary', dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams({ dateFrom, dateTo });
      const response = await fetch(`/api/giacenze/summary?${params}`);
      if (!response.ok) {
        throw new Error(`${response.status}: ${await response.text()}`);
      }
      return response.json();
    },
    enabled: false, // Manual trigger
  });

  // Query per lista FLUPSY
  const { data: flupsysList } = useQuery({
    queryKey: ["/api/flupsys"],
    staleTime: 300000, // 5 minuti
  });

  const handleCalculateDetailed = () => {
    setShowDetails(true);
    refetchDetailed();
  };

  const handleCalculateSummary = () => {
    setShowDetails(false);
    refetchSummary();
  };

  const formatNumber = (num: number) => num.toLocaleString('it-IT');

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Calcolo Giacenze Personalizzate"
        subtitle="Calcola le giacenze esatte tra due date specifiche"
      />

      {/* Form di input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Parametri di Ricerca
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">Data Inizio</Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateTo">Data Fine</Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flupsyId">FLUPSY (opzionale)</Label>
              <select
                id="flupsyId"
                value={flupsyId}
                onChange={(e) => setFlupsyId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tutti i FLUPSY</option>
                {flupsysList?.map((flupsy: any) => (
                  <option key={flupsy.id} value={flupsy.id}>
                    {flupsy.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 pt-2">
            <Button 
              onClick={handleCalculateSummary}
              disabled={isLoadingSummary}
              variant="outline"
            >
              {isLoadingSummary ? "Calcolando..." : "Riepilogo Rapido"}
            </Button>
            <Button 
              onClick={handleCalculateDetailed}
              disabled={isLoadingDetailed}
            >
              {isLoadingDetailed ? "Calcolando..." : "Calcolo Dettagliato"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Risultati Riepilogo */}
      {summaryData?.success && !showDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Riepilogo Giacenze
              <Badge variant="outline">
                {format(new Date(summaryData.data.dateFrom), "dd/MM/yyyy")} - {format(new Date(summaryData.data.dateTo), "dd/MM/yyyy")}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatNumber(summaryData.data.totale_giacenza)}
                </div>
                <div className="text-sm text-gray-500">Giacenza Totale</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatNumber(summaryData.data.totale_entrate)}
                </div>
                <div className="text-sm text-gray-500">Entrate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {formatNumber(summaryData.data.totale_uscite)}
                </div>
                <div className="text-sm text-gray-500">Uscite</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {formatNumber(summaryData.data.numero_operazioni)}
                </div>
                <div className="text-sm text-gray-500">Operazioni</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {formatNumber(summaryData.data.cestelli_coinvolti)}
                </div>
                <div className="text-sm text-gray-500">Cestelli</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {formatNumber(summaryData.data.flupsys_coinvolti)}
                </div>
                <div className="text-sm text-gray-500">FLUPSY</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risultati Dettagliati */}
      {giacenzeData?.success && showDetails && (
        <div className="space-y-6">
          {/* Panoramica */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Panoramica Dettagliata
                <Badge variant="outline">
                  {format(new Date(giacenzeData.data.dateFrom), "dd/MM/yyyy")} - {format(new Date(giacenzeData.data.dateTo), "dd/MM/yyyy")}
                </Badge>
                <Badge variant="secondary">
                  {giacenzeData.data.calculationTime}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {formatNumber(giacenzeData.data.totale_giacenza)}
                  </div>
                  <div className="text-sm text-gray-500">Giacenza Totale</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <div className="text-2xl font-bold text-green-600">
                      {formatNumber(giacenzeData.data.totale_entrate)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">Entrate Totali</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <TrendingDown className="h-5 w-5 text-red-500" />
                    <div className="text-2xl font-bold text-red-600">
                      {formatNumber(giacenzeData.data.totale_uscite)}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">Uscite Totali</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">
                    {formatNumber(giacenzeData.data.statistiche.numero_operazioni)}
                  </div>
                  <div className="text-sm text-gray-500">
                    Operazioni ({giacenzeData.data.statistiche.media_giornaliera}/giorno)
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dettaglio per Taglia */}
          <Card>
            <CardHeader>
              <CardTitle>Giacenze per Taglia</CardTitle>
            </CardHeader>
            <CardContent>
              {giacenzeData.data.dettaglio_taglie.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {giacenzeData.data.dettaglio_taglie
                    .sort((a, b) => b.giacenza - a.giacenza)
                    .map((taglia) => (
                    <div key={taglia.code} className="p-4 border rounded-lg">
                      <div className="font-semibold text-lg">{taglia.code}</div>
                      <Separator className="my-2" />
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-green-600">Entrate:</span>
                          <span className="font-medium">{formatNumber(taglia.entrate)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-600">Uscite:</span>
                          <span className="font-medium">{formatNumber(taglia.uscite)}</span>
                        </div>
                        <div className="flex justify-between font-semibold pt-1 border-t">
                          <span>Giacenza:</span>
                          <span className="text-blue-600">{formatNumber(taglia.giacenza)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Nessuna giacenza trovata nel periodo specificato</p>
              )}
            </CardContent>
          </Card>

          {/* Dettaglio per FLUPSY */}
          {giacenzeData.data.dettaglio_flupsys.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Giacenze per FLUPSY
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {giacenzeData.data.dettaglio_flupsys
                    .sort((a, b) => b.giacenza - a.giacenza)
                    .map((flupsy) => (
                    <div key={flupsy.id} className="p-4 border rounded-lg">
                      <div className="font-semibold text-lg">{flupsy.name}</div>
                      <Separator className="my-2" />
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-green-600">Entrate:</span>
                          <span className="font-medium">{formatNumber(flupsy.entrate)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-600">Uscite:</span>
                          <span className="font-medium">{formatNumber(flupsy.uscite)}</span>
                        </div>
                        <div className="flex justify-between font-semibold pt-1 border-t">
                          <span>Giacenza:</span>
                          <span className="text-blue-600">{formatNumber(flupsy.giacenza)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Errori */}
      {(detailedError || summaryError) && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Errore</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">
              {detailedError?.message || summaryError?.message}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}