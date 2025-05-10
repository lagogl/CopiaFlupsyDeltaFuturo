import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function FlupsyDetails() {
  const { id } = useParams();
  const flupsyId = id ? parseInt(id) : null;
  
  const { data: flupsy, isLoading, error } = useQuery({
    queryKey: [`/api/flupsys/${flupsyId}`],
    enabled: !!flupsyId
  });

  const { data: basketsData } = useQuery({
    queryKey: [`/api/flupsys/${flupsyId}/baskets`],
    enabled: !!flupsyId
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !flupsy) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h2 className="text-2xl font-bold">Errore nel caricamento dei dati</h2>
        <p className="text-muted-foreground">
          Non è stato possibile caricare i dettagli del FLUPSY.
        </p>
        <Button asChild>
          <Link to="/flupsys">Torna all'elenco FLUPSY</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container p-4 mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to="/flupsys">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Dettagli FLUPSY</h1>
      </div>
      
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                {flupsy.name}
                <Badge variant={flupsy.active ? "default" : "outline"}>
                  {flupsy.active ? "Attivo" : "Inattivo"}
                </Badge>
              </CardTitle>
              <CardDescription>{flupsy.location}</CardDescription>
            </div>
            {flupsy.productionCenter && (
              <Badge variant="secondary">Centro: {flupsy.productionCenter}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h3 className="font-medium text-muted-foreground">Statistiche Generali</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="border rounded p-3">
                  <p className="text-sm text-muted-foreground">Cestelli Totali</p>
                  <p className="text-xl font-bold">{flupsy.totalBaskets || 0}/{flupsy.maxPositions}</p>
                </div>
                <div className="border rounded p-3">
                  <p className="text-sm text-muted-foreground">Cestelli Attivi</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{flupsy.activeBaskets || 0}</p>
                </div>
                <div className="border rounded p-3">
                  <p className="text-sm text-muted-foreground">Posizioni Libere</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    {flupsy.maxPositions - (flupsy.totalBaskets || 0)}
                  </p>
                </div>
                <div className="border rounded p-3">
                  <p className="text-sm text-muted-foreground">Media Animali Cesta</p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                    {flupsy.avgAnimalDensity?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium text-muted-foreground">Occupazione</h3>
              <div className="border rounded p-4 space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <p className="text-sm text-muted-foreground">Posizioni Totali</p>
                    <p className="text-sm font-semibold">
                      {flupsy.totalBaskets || 0}/{flupsy.maxPositions}
                    </p>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary rounded-full" 
                      style={{ 
                        width: `${((flupsy.totalBaskets || 0) / flupsy.maxPositions) * 100}%` 
                      }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <p className="text-sm text-muted-foreground">Cestelli Attivi</p>
                    <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {flupsy.activeBasketPercentage || 0}%
                    </p>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full" 
                      style={{ 
                        width: `${flupsy.activeBasketPercentage || 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium text-muted-foreground">Distribuzione Taglie</h3>
              <div className="border rounded p-4">
                {flupsy.sizeDistribution && Object.keys(flupsy.sizeDistribution).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(flupsy.sizeDistribution)
                      .sort(([, countA], [, countB]) => Number(countB) - Number(countA))
                      .slice(0, 6)
                      .map(([size, count]) => {
                        const totalCount = Object.values(flupsy.sizeDistribution).reduce((sum, c) => Number(sum) + Number(c), 0);
                        const percentage = totalCount > 0 ? (Number(count) / totalCount) * 100 : 0;
                        
                        return (
                          <div key={size}>
                            <div className="flex justify-between mb-1">
                              <p className="text-sm font-medium">{size}</p>
                              <p className="text-sm font-semibold">{percentage.toFixed(1)}%</p>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-cyan-500 rounded-full" 
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                ) : (
                  <p className="text-sm text-center text-muted-foreground py-6">
                    Nessun dato disponibile
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {flupsy.description && (
            <div className="pt-2">
              <h3 className="font-medium text-muted-foreground mb-2">Descrizione</h3>
              <div className="border rounded p-4">
                <p className="text-sm">{flupsy.description}</p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-4">
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to={`/flupsys/${flupsy.id}/positions`}>
                Visualizza Posizioni
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/flupsys/${flupsy.id}/baskets`}>
                Visualizza Cestelli
              </Link>
            </Button>
          </div>
          <Button asChild>
            <Link to="/flupsys">
              Torna all'elenco
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}