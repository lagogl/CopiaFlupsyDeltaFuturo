import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { FileText, Download } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

interface ScreeningListItem {
  id: number;
  screeningNumber: number;
  date: string;
  purpose: string | null;
  status: string;
  referenceSize: { code: string } | null;
  sourceCount: number;
  destinationCount: number;
  totalSourceAnimals: number;
  totalDestAnimals: number;
  mortalityAnimals: number;
}

export default function ScreeningsList() {
  const { data: screenings, isLoading } = useQuery<ScreeningListItem[]>({
    queryKey: ['/api/screenings'],
  });

  const formatNumber = (num: number) => num.toLocaleString('it-IT');
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('it-IT');

  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader title="Storico Vagliature" />

      <Card>
        <CardHeader>
          <CardTitle>Vagliature Completate</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="h-8 w-8" />
            </div>
          ) : !screenings || screenings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nessuna vagliatura completata trovata
            </div>
          ) : (
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
                    const mortalityPercent = screening.totalSourceAnimals > 0
                      ? ((screening.mortalityAnimals / screening.totalSourceAnimals) * 100).toFixed(2)
                      : 0;

                    return (
                      <TableRow key={screening.id} data-testid={`row-screening-${screening.id}`}>
                        <TableCell className="font-medium" data-testid={`text-number-${screening.id}`}>
                          #{screening.screeningNumber}
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
                          {screening.sourceCount}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-dest-count-${screening.id}`}>
                          {screening.destinationCount}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-source-animals-${screening.id}`}>
                          {formatNumber(screening.totalSourceAnimals)}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-dest-animals-${screening.id}`}>
                          {formatNumber(screening.totalDestAnimals)}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-mortality-${screening.id}`}>
                          <Badge variant={Number(mortalityPercent) > 10 ? "destructive" : "secondary"}>
                            {formatNumber(screening.mortalityAnimals)} ({mortalityPercent}%)
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
                              onClick={() => window.open(`/api/screenings/${screening.id}/report.pdf`, '_blank')}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
