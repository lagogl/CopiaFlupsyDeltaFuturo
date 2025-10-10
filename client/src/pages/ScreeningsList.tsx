import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { FileText, Download, Filter, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import PageHeader from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SelectionListItem {
  id: number;
  selectionNumber: number;
  date: string;
  purpose: string | null;
  screeningType: string | null;
  referenceSizeId: number | null;
  status: string;
  createdAt: string;
  updatedAt: string | null;
  notes: string | null;
  sourceCount?: number;
  destinationCount?: number;
  totalSourceAnimals?: number;
  totalDestAnimals?: number;
  mortalityAnimals?: number;
  referenceSize?: {
    id: number;
    code: string;
    name: string;
  };
}

interface SelectionsResponse {
  success: boolean;
  selections: SelectionListItem[];
  pagination?: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export default function ScreeningsList() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [screeningNumber, setScreeningNumber] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const queryParams = new URLSearchParams();
  queryParams.set('page', page.toString());
  queryParams.set('pageSize', pageSize.toString());
  if (screeningNumber) queryParams.set('screeningNumber', screeningNumber);
  if (dateFrom) queryParams.set('dateFrom', dateFrom);
  if (dateTo) queryParams.set('dateTo', dateTo);

  const { data: response, isLoading } = useQuery<SelectionsResponse>({
    queryKey: ['/api/selections', page, pageSize, screeningNumber, dateFrom, dateTo],
    queryFn: async () => {
      const res = await fetch(`/api/selections?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch selections');
      return res.json();
    },
  });

  const screenings = response?.selections || [];
  const pagination = response?.pagination;

  const formatNumber = (num: number) => num.toLocaleString('it-IT');
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('it-IT');

  const clearFilters = () => {
    setScreeningNumber("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const hasActiveFilters = screeningNumber || dateFrom || dateTo;

  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader title="Storico Vagliature" />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Vagliature Completate</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            data-testid="button-toggle-filters"
          >
            <Filter className="h-4 w-4 mr-2" />
            {showFilters ? 'Nascondi Filtri' : 'Mostra Filtri'}
          </Button>
        </CardHeader>
        <CardContent>
          {showFilters && (
            <div className="mb-6 p-4 border rounded-lg bg-muted/50 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="filter-number">Numero Vagliatura</Label>
                  <Input
                    id="filter-number"
                    type="number"
                    placeholder="Es. 1"
                    value={screeningNumber}
                    onChange={(e) => {
                      setScreeningNumber(e.target.value);
                      setPage(1);
                    }}
                    data-testid="input-filter-number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter-date-from">Data Da</Label>
                  <Input
                    id="filter-date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setPage(1);
                    }}
                    data-testid="input-filter-date-from"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter-date-to">Data A</Label>
                  <Input
                    id="filter-date-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setPage(1);
                    }}
                    data-testid="input-filter-date-to"
                  />
                </div>
              </div>
              {hasActiveFilters && (
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    data-testid="button-clear-filters"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancella Filtri
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-8 w-8" />
            </div>
          ) : !screenings || screenings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {hasActiveFilters ? 'Nessuna vagliatura trovata con i filtri selezionati' : 'Nessuna vagliatura completata trovata'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numero</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Scopo</TableHead>
                      <TableHead>Taglia Rif.</TableHead>
                      <TableHead className="text-right">Cest. Origine</TableHead>
                      <TableHead className="text-right">Cest. Dest.</TableHead>
                      <TableHead className="text-right">Anim. Origine</TableHead>
                      <TableHead className="text-right">Anim. Dest.</TableHead>
                      <TableHead className="text-right">Mortalità</TableHead>
                      <TableHead className="text-center">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {screenings.map((screening) => {
                      const totalSource = screening.totalSourceAnimals ?? 0;
                      const mortality = screening.mortalityAnimals ?? 0;
                      const mortalityPercent = totalSource > 0
                        ? ((mortality / totalSource) * 100).toFixed(2)
                        : "0";

                      return (
                        <TableRow key={screening.id} data-testid={`row-screening-${screening.id}`}>
                          <TableCell className="font-medium" data-testid={`text-number-${screening.id}`}>
                            #{screening.selectionNumber}
                          </TableCell>
                          <TableCell data-testid={`text-date-${screening.id}`}>
                            {formatDate(screening.date)}
                          </TableCell>
                          <TableCell data-testid={`text-purpose-${screening.id}`}>
                            {screening.purpose || '-'}
                          </TableCell>
                          <TableCell data-testid={`text-size-${screening.id}`}>
                            {screening.referenceSize?.code || '-'}
                          </TableCell>
                          <TableCell className="text-right" data-testid={`text-source-count-${screening.id}`}>
                            {screening.sourceCount ?? 0}
                          </TableCell>
                          <TableCell className="text-right" data-testid={`text-dest-count-${screening.id}`}>
                            {screening.destinationCount ?? 0}
                          </TableCell>
                          <TableCell className="text-right" data-testid={`text-source-animals-${screening.id}`}>
                            {formatNumber(screening.totalSourceAnimals ?? 0)}
                          </TableCell>
                          <TableCell className="text-right" data-testid={`text-dest-animals-${screening.id}`}>
                            {formatNumber(screening.totalDestAnimals ?? 0)}
                          </TableCell>
                          <TableCell className="text-right" data-testid={`text-mortality-${screening.id}`}>
                            <Badge variant={Number(mortalityPercent) > 10 ? "destructive" : "secondary"}>
                              {formatNumber(mortality)} ({mortalityPercent}%)
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex gap-2 justify-center">
                              <Link href={`/screenings/${screening.id}`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  data-testid={`button-view-${screening.id}`}
                                >
                                  <FileText className="h-4 w-4 mr-1" />
                                  Dettagli
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(`/api/selections/${screening.id}/report.pdf`, '_blank')}
                                data-testid={`button-pdf-${screening.id}`}
                              >
                                <Download className="h-4 w-4 mr-1" />
                                PDF
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                    Pagina {pagination.page} di {pagination.totalPages} ({pagination.totalCount} risultati totali)
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={!pagination.hasPreviousPage}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Precedente
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={!pagination.hasNextPage}
                      data-testid="button-next-page"
                    >
                      Successiva
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
