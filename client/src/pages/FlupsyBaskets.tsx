import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function FlupsyBaskets() {
  const { id } = useParams();
  const flupsyId = id ? parseInt(id) : null;
  
  // Ottieni i dettagli del FLUPSY
  const { data: flupsy, isLoading: flupsyLoading } = useQuery({
    queryKey: [`/api/flupsys/${flupsyId}`],
    enabled: !!flupsyId
  });

  // Ottieni i cestelli per questo FLUPSY
  const { data: baskets, isLoading: basketsLoading } = useQuery({
    queryKey: [`/api/flupsys/${flupsyId}/baskets`],
    enabled: !!flupsyId
  });

  const isLoading = flupsyLoading || basketsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container p-4 mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link to={`/flupsys/${flupsyId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Cestelli {flupsy?.name}</h1>
          <p className="text-muted-foreground">{flupsy?.location}</p>
        </div>
      </div>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Numero</TableHead>
              <TableHead>Riga</TableHead>
              <TableHead>Posizione</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead>Ciclo Attivo</TableHead>
              <TableHead className="text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {baskets && baskets.length > 0 ? (
              baskets.map((basket) => (
                <TableRow key={basket.id}>
                  <TableCell className="font-medium">{basket.physicalNumber}</TableCell>
                  <TableCell>{basket.row || '-'}</TableCell>
                  <TableCell>{basket.position || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={basket.state === 'active' ? "success" : "outline"}>
                      {basket.state === 'active' ? 'Attivo' : 'Inattivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {basket.currentCycleId ? (
                      <Badge variant="secondary">{basket.cycleCode || basket.currentCycleId}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Nessun ciclo</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/baskets?id=${basket.id}`}>
                        Dettagli
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                  Nessun cestello trovato per questo FLUPSY
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="flex justify-between">
        <Button variant="outline" asChild>
          <Link to={`/flupsys/${flupsyId}`}>
            Torna ai dettagli
          </Link>
        </Button>
        <Button variant="default" asChild>
          <Link to="/flupsys">
            Torna all'elenco FLUPSY
          </Link>
        </Button>
      </div>
    </div>
  );
}