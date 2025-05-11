import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function FlupsyPositionsSelector() {
  const [, navigate] = useLocation();
  
  // Carica la lista di FLUPSY
  const { data: flupsys = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/flupsys'],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!flupsys || flupsys.length === 0) {
    return (
      <div className="container py-8 px-4 mx-auto">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Nessuna unità FLUPSY trovata</h1>
          <p className="text-muted-foreground mb-6">
            Non è stato possibile trovare unità FLUPSY attive nel sistema.
          </p>
          <Button asChild>
            <a href="/">Torna alla Dashboard</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-8 mx-auto">
      <div className="space-y-4 max-w-5xl mx-auto">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-3xl font-bold">Gestione Posizioni FLUPSY</h1>
          <p className="text-muted-foreground">
            Seleziona un'unità FLUPSY per visualizzare e gestire le sue posizioni
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {flupsys.map((flupsy: any) => (
            <Card 
              key={flupsy.id} 
              className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/flupsy-positions/${flupsy.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-bold">{flupsy.name}</CardTitle>
                  <Badge variant={flupsy.active ? "default" : "secondary"}>
                    {flupsy.active ? "Attivo" : "Inattivo"}
                  </Badge>
                </div>
                <CardDescription>{flupsy.location || "Nessuna posizione specificata"}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-sm">
                  <div>
                    <p className="text-muted-foreground">Posizioni totali</p>
                    <p className="font-semibold">{flupsy.maxPositions}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Ceste attive</p>
                    <p className="font-semibold">{flupsy.activeBaskets || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Disponibilità</p>
                    <p className="font-semibold">{flupsy.freePositions || 0} libere</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}