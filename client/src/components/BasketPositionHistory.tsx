import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { format } from "date-fns";
import { it } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ArrowRight, Clock, MapPin } from "lucide-react";

interface BasketPositionHistoryProps {
  basketId: number;
}

export default function BasketPositionHistory({ basketId }: BasketPositionHistoryProps) {
  const { data: positionHistory, isLoading } = useQuery({
    queryKey: [`/api/baskets/${basketId}/positions`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!basketId
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!positionHistory || positionHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-lg border border-dashed">
        <MapPin className="h-12 w-12 text-muted-foreground mb-2" />
        <h3 className="text-lg font-medium">Nessuna cronologia di posizione</h3>
        <p className="text-sm text-muted-foreground text-center max-w-md mt-1">
          Questa cesta non ha mai avuto una posizione assegnata o non ha movimenti registrati.
        </p>
      </div>
    );
  }

  // Sort from newest to oldest
  const sortedHistory = [...positionHistory].sort(
    (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="px-2 py-1 text-xs">
          <CalendarDays className="h-3.5 w-3.5 mr-1" />
          <span>Cronologia posizioni</span>
        </Badge>
        <Badge variant="outline" className="px-2 py-1 text-xs">
          <Clock className="h-3.5 w-3.5 mr-1" />
          <span>{positionHistory.length} movimenti</span>
        </Badge>
      </div>

      <Table>
        <TableCaption>Cronologia completa delle posizioni della cesta</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Data inizio</TableHead>
            <TableHead>Data fine</TableHead>
            <TableHead>Fila</TableHead>
            <TableHead>Posizione</TableHead>
            <TableHead>Durata</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedHistory.map((position) => {
            const startDate = new Date(position.startDate);
            const endDate = position.endDate ? new Date(position.endDate) : null;
            
            // Calculate duration in days
            const durationInDays = endDate 
              ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
              : Math.ceil((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            
            const isActive = !position.endDate;

            return (
              <TableRow key={position.id} className={cn(isActive && "bg-accent/20")}>
                <TableCell className="font-medium">
                  {format(startDate, "d MMMM yyyy", {locale: it})}
                </TableCell>
                <TableCell>
                  {endDate 
                    ? format(endDate, "d MMMM yyyy", {locale: it})
                    : <Badge variant="secondary">Attuale</Badge>
                  }
                </TableCell>
                <TableCell className="font-mono">{position.row}</TableCell>
                <TableCell className="font-mono">{position.position}</TableCell>
                <TableCell>
                  {durationInDays} {durationInDays === 1 ? "giorno" : "giorni"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}