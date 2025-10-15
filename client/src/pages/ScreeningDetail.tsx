import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Download, FileText } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";

interface ScreeningDetail {
  id: number;
  screeningNumber: number;
  date: string;
  purpose: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  referenceSize: { code: string; name: string } | null;
  sourceBaskets: Array<{
    id: number;
    basketId: number;
    cycleId: number;
    animalCount: number | null;
    totalWeight: number | null;
    animalsPerKg: number | null;
    dismissed: boolean;
    flupsyName?: string | null;
  }>;
  destinationBaskets: Array<{
    id: number;
    basketId: number;
    cycleId: number;
    category: string | null;
    animalCount: number | null;
    totalWeight: number | null;
    animalsPerKg: number | null;
    flupsyId: number | null;
    flupsyName?: string | null;
    row: string | null;
    position: number | null;
    positionAssigned: boolean;
    size?: { id: number; code: string; name: string } | null;
  }>;
}

export default function ScreeningDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const { data, isLoading } = useQuery<{
    screening: {
      id: number;
      screeningNumber: number;
      date: string;
      purpose: string | null;
      status: string;
      notes: string | null;
      createdAt: string;
      referenceSize?: { code: string; name: string } | null;
    };
    sourceBaskets: Array<any>;
    destinationBaskets: Array<any>;
  }>({
    queryKey: [`/api/screenings/${id}`],
    enabled: !!id
  });

  const screening = data ? {
    ...data.screening,
    sourceBaskets: data.sourceBaskets || [],
    destinationBaskets: data.destinationBaskets || []
  } : undefined;

  const formatNumber = (num: number | null) => 
    num !== null ? num.toLocaleString('it-IT') : '-';
  
  const formatDate = (dateStr: string) => 
    new Date(dateStr).toLocaleDateString('it-IT');
  
  const formatDateTime = (dateStr: string) => 
    `${new Date(dateStr).toLocaleDateString('it-IT')} ${new Date(dateStr).toLocaleTimeString('it-IT')}`;

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex justify-center py-20">
        <Spinner className="h-12 w-12" />
      </div>
    );
  }

  if (!screening) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-20">
          <p className="text-muted-foreground">Vagliatura non trovata</p>
          <Button onClick={() => navigate('/screenings')} className="mt-4">
            Torna all'elenco
          </Button>
        </div>
      </div>
    );
  }

  const totalSourceAnimals = (screening.sourceBaskets || []).reduce((sum, b) => sum + (b.animalCount || 0), 0);
  const totalDestAnimals = (screening.destinationBaskets || []).reduce((sum, b) => sum + (b.animalCount || 0), 0);
  const mortalityAnimals = totalSourceAnimals - totalDestAnimals;
  const mortalityPercent = totalSourceAnimals > 0
    ? ((mortalityAnimals / totalSourceAnimals) * 100).toFixed(2)
    : 0;

  // Calcola totalizzatori per taglia
  const sizeStats = (screening.destinationBaskets || []).reduce((acc, basket) => {
    const sizeCode = basket.size?.code;
    if (sizeCode && basket.animalCount) {
      if (!acc[sizeCode]) {
        acc[sizeCode] = { total: 0, sold: 0, repositioned: 0 };
      }
      acc[sizeCode].total += basket.animalCount;
      
      if (basket.category === 'Venduta') {
        acc[sizeCode].sold += basket.animalCount;
      } else if (basket.category === 'Riposizionata') {
        acc[sizeCode].repositioned += basket.animalCount;
      }
    }
    return acc;
  }, {} as Record<string, { total: number; sold: number; repositioned: number }>);

  const sortedSizes = Object.entries(sizeStats).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title={`Vagliatura #${screening.screeningNumber}`} />
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate('/screenings')}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>
          <Button
            onClick={() => window.open(`/api/selections/${screening.id}/report.pdf`, '_blank')}
            data-testid="button-print-pdf"
          >
            <Download className="h-4 w-4 mr-2" />
            Stampa PDF
          </Button>
        </div>
      </div>

      {/* Informazioni Generali */}
      <Card>
        <CardHeader>
          <CardTitle>Informazioni Generali</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Data</div>
              <div className="font-medium" data-testid="text-date">{formatDate(screening.date)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Scopo</div>
              <div className="font-medium" data-testid="text-purpose">{screening.purpose || 'Non specificato'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Taglia di Riferimento</div>
              <div className="font-medium" data-testid="text-reference-size">
                {screening.referenceSize?.code || 'N/D'}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Stato</div>
              <Badge variant={screening.status === 'completed' ? 'default' : 'secondary'} data-testid="badge-status">
                {screening.status === 'completed' ? 'Completata' : screening.status}
              </Badge>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Data Creazione</div>
              <div className="text-sm" data-testid="text-created-at">{formatDateTime(screening.createdAt)}</div>
            </div>
          </div>
          {screening.notes && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <div className="text-sm font-medium mb-1">Note</div>
              <div className="text-sm" data-testid="text-notes">{screening.notes}</div>
            </div>
          )}

          {/* Totalizzatori per Taglia */}
          {sortedSizes.length > 0 && (
            <div className="mt-6">
              <div className="text-sm font-semibold mb-3 text-muted-foreground">Totalizzatori per Taglia</div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {sortedSizes.map(([sizeCode, stats]) => (
                  <div key={sizeCode} className="p-3 border rounded-lg bg-card">
                    <div className="font-semibold text-sm mb-2">{sizeCode}</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Totale:</span>
                        <span className="font-medium">{formatNumber(stats.total)}</span>
                      </div>
                      {stats.sold > 0 && (
                        <div className="flex justify-between text-orange-600 dark:text-orange-400">
                          <span>Venduti:</span>
                          <span className="font-medium">{formatNumber(stats.sold)}</span>
                        </div>
                      )}
                      {stats.repositioned > 0 && (
                        <div className="flex justify-between text-blue-600 dark:text-blue-400">
                          <span>Ripos.:</span>
                          <span className="font-medium">{formatNumber(stats.repositioned)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Riepilogo */}
      <Card>
        <CardHeader>
          <CardTitle>Riepilogo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="text-sm text-blue-600 dark:text-blue-400">Cestelli Origine</div>
              <div className="text-2xl font-bold mt-1" data-testid="text-source-count">{(screening.sourceBaskets || []).length}</div>
              <div className="text-sm text-blue-600 dark:text-blue-400 mt-1" data-testid="text-source-animals">
                Animali: {formatNumber(totalSourceAnimals)}
              </div>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-sm text-green-600 dark:text-green-400">Cestelli Destinazione</div>
              <div className="text-2xl font-bold mt-1" data-testid="text-dest-count">{(screening.destinationBaskets || []).length}</div>
              <div className="text-sm text-green-600 dark:text-green-400 mt-1" data-testid="text-dest-animals">
                Animali: {formatNumber(totalDestAnimals)}
              </div>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
              <div className="text-sm text-red-600 dark:text-red-400">Mortalità</div>
              <div className="text-2xl font-bold mt-1" data-testid="text-mortality-count">{formatNumber(mortalityAnimals)}</div>
              <div className="text-sm text-red-600 dark:text-red-400 mt-1" data-testid="text-mortality-percent">
                {mortalityPercent}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cestelli Origine */}
      <Card>
        <CardHeader>
          <CardTitle>Cestelli Origine</CardTitle>
          <CardDescription>{(screening.sourceBaskets || []).length} cestelli</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cestello ID</TableHead>
                <TableHead>Ciclo ID</TableHead>
                <TableHead>FLUPSY</TableHead>
                <TableHead className="text-right">Animali</TableHead>
                <TableHead className="text-right">Peso (kg)</TableHead>
                <TableHead className="text-right">Animali/kg</TableHead>
                <TableHead className="text-center">Dismisso</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(screening.sourceBaskets || []).map((basket) => (
                <TableRow key={basket.id} data-testid={`row-source-${basket.id}`}>
                  <TableCell>{basket.basketId}</TableCell>
                  <TableCell>{basket.cycleId}</TableCell>
                  <TableCell>{basket.flupsyName || '-'}</TableCell>
                  <TableCell className="text-right">{formatNumber(basket.animalCount)}</TableCell>
                  <TableCell className="text-right">{formatNumber(basket.totalWeight)}</TableCell>
                  <TableCell className="text-right">{formatNumber(basket.animalsPerKg)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={basket.dismissed ? 'default' : 'secondary'}>
                      {basket.dismissed ? 'Sì' : 'No'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Cestelli Destinazione */}
      <Card>
        <CardHeader>
          <CardTitle>Cestelli Destinazione</CardTitle>
          <CardDescription>{(screening.destinationBaskets || []).length} cestelli</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cestello ID</TableHead>
                <TableHead>Ciclo ID</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>FLUPSY</TableHead>
                <TableHead className="text-right">Animali</TableHead>
                <TableHead className="text-right">Peso (kg)</TableHead>
                <TableHead className="text-right">Animali/kg</TableHead>
                <TableHead>Posizione</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(screening.destinationBaskets || []).map((basket) => (
                <TableRow key={basket.id} data-testid={`row-dest-${basket.id}`}>
                  <TableCell>{basket.basketId}</TableCell>
                  <TableCell>{basket.cycleId}</TableCell>
                  <TableCell>{basket.category || '-'}</TableCell>
                  <TableCell>{basket.flupsyName || '-'}</TableCell>
                  <TableCell className="text-right">{formatNumber(basket.animalCount)}</TableCell>
                  <TableCell className="text-right">{formatNumber(basket.totalWeight)}</TableCell>
                  <TableCell className="text-right">{formatNumber(basket.animalsPerKg)}</TableCell>
                  <TableCell>
                    {basket.positionAssigned ? (
                      <Badge variant="outline">
                        {basket.row}{basket.position}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Non assegnata</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
