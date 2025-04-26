import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";

interface LotInventoryPanelProps {
  lotId: number;
  lotName?: string;
}

// Tipi per i dati
interface InventoryTransaction {
  id: number;
  lotId: number;
  date: string;
  transactionType: string;
  animalCount: number;
  notes: string | null;
  referenceOperationId: number | null;
  createdAt: string;
}

interface MortalityRecord {
  id: number;
  lotId: number;
  calculationDate: string;
  initialCount: number;
  currentCount: number;
  soldCount: number;
  mortalityCount: number;
  mortalityPercentage: number;
  notes: string | null;
}

interface InventoryData {
  initialCount: number;
  currentCount: number;
  soldCount: number;
  mortalityCount: number;
  mortalityPercentage: number;
}

// Componente principale per il pannello dell'inventario dei lotti
export default function LotInventoryPanel({ lotId, lotName }: LotInventoryPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");

  // Query per ottenere i dati dell'inventario corrente
  const inventoryQuery = useQuery({
    queryKey: ["/api/lot-inventory", lotId, "current"],
    queryFn: async () => {
      const response = await fetch(`/api/lot-inventory/${lotId}/current`);
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      return data.inventory as InventoryData;
    },
    enabled: !!lotId,
  });

  // Query per ottenere le transazioni del lotto
  const transactionsQuery = useQuery({
    queryKey: ["/api/lot-inventory", lotId, "transactions"],
    queryFn: async () => {
      const response = await fetch(`/api/lot-inventory/${lotId}/transactions`);
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      return data.transactions as InventoryTransaction[];
    },
    enabled: !!lotId,
  });

  // Query per ottenere la cronologia delle mortalità
  const mortalityHistoryQuery = useQuery({
    queryKey: ["/api/lot-inventory", lotId, "mortality-history"],
    queryFn: async () => {
      const response = await fetch(`/api/lot-inventory/${lotId}/mortality-history`);
      const data = await response.json();
      if (!data.success) throw new Error(data.message);
      return data.records as MortalityRecord[];
    },
    enabled: !!lotId,
  });

  // Mutation per registrare un nuovo calcolo di mortalità
  const recordMortalityMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/lot-inventory/${lotId}/mortality-calculation`, {
        method: "POST",
        data: { notes },
      });
    },
    onSuccess: () => {
      toast({
        title: "Calcolo di mortalità registrato",
        description: "Il calcolo di mortalità è stato registrato con successo",
      });
      setNotes("");
      // Invalida le query per aggiornare i dati
      queryClient.invalidateQueries({ queryKey: ["/api/lot-inventory", lotId, "mortality-history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/lot-inventory", lotId, "current"] });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore: ${error}`,
        variant: "destructive",
      });
    },
  });

  const handleRecordMortality = () => {
    recordMortalityMutation.mutate();
  };

  // Traduzione dei tipi di transazione
  const translateTransactionType = (type: string) => {
    const translations: Record<string, string> = {
      "arrivo-lotto": "Arrivo lotto",
      "vendita": "Vendita",
      "trasferimento": "Trasferimento",
      "mortalita": "Mortalità",
      "aggiustamento": "Aggiustamento",
    };
    return translations[type] || type;
  };

  // Formatta il numero con 2 decimali e separatore di migliaia
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("it-IT", {
      maximumFractionDigits: 2,
    }).format(num);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Inventario Lotto {lotName || `#${lotId}`}</CardTitle>
        <CardDescription>
          Tracciamento degli animali e calcolo della mortalità
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">Riepilogo</TabsTrigger>
            <TabsTrigger value="transactions">Transazioni</TabsTrigger>
            <TabsTrigger value="mortality">Mortalità</TabsTrigger>
          </TabsList>

          {/* Tab Riepilogo */}
          <TabsContent value="summary">
            {inventoryQuery.isLoading ? (
              <div className="space-y-4 py-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : inventoryQuery.isError ? (
              <div className="py-4 text-center text-destructive">
                Errore nel caricamento dei dati
              </div>
            ) : (
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Conteggio iniziale</Label>
                    <div className="text-2xl font-bold">
                      {formatNumber(inventoryQuery.data.initialCount)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Conteggio attuale</Label>
                    <div className="text-2xl font-bold">
                      {formatNumber(inventoryQuery.data.currentCount)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Venduti</Label>
                    <div className="text-xl">
                      {formatNumber(inventoryQuery.data.soldCount)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Mortalità</Label>
                    <div className="text-xl">
                      {formatNumber(inventoryQuery.data.mortalityCount)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Percentuale mortalità</Label>
                    <div className="text-xl">
                      {inventoryQuery.data.mortalityPercentage.toFixed(2)}%
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tasso di mortalità</Label>
                  <Progress 
                    value={inventoryQuery.data.mortalityPercentage} 
                    max={100} 
                    className="h-4"
                  />
                </div>

                <div className="space-y-2 pt-4">
                  <Label htmlFor="mortality-notes">Note (opzionale)</Label>
                  <Textarea
                    id="mortality-notes"
                    placeholder="Inserisci eventuali note sul calcolo della mortalità"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <Button 
                  onClick={handleRecordMortality}
                  disabled={recordMortalityMutation.isPending}
                  className="w-full"
                >
                  {recordMortalityMutation.isPending 
                    ? "Registrazione in corso..." 
                    : "Registra calcolo di mortalità"}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Tab Transazioni */}
          <TabsContent value="transactions">
            {transactionsQuery.isLoading ? (
              <div className="space-y-2 py-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : transactionsQuery.isError ? (
              <div className="py-4 text-center text-destructive">
                Errore nel caricamento delle transazioni
              </div>
            ) : transactionsQuery.data.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Nessuna transazione registrata
              </div>
            ) : (
              <Table>
                <TableCaption>Elenco delle transazioni per questo lotto</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Quantità</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionsQuery.data.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {format(new Date(transaction.date), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          transaction.transactionType === "arrivo-lotto" 
                            ? "default" 
                            : transaction.transactionType === "vendita" 
                              ? "destructive" 
                              : "secondary"
                        }>
                          {translateTransactionType(transaction.transactionType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {transaction.animalCount > 0 ? "+" : ""}
                        {formatNumber(transaction.animalCount)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {transaction.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* Tab Mortalità */}
          <TabsContent value="mortality">
            {mortalityHistoryQuery.isLoading ? (
              <div className="space-y-2 py-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : mortalityHistoryQuery.isError ? (
              <div className="py-4 text-center text-destructive">
                Errore nel caricamento dei dati di mortalità
              </div>
            ) : mortalityHistoryQuery.data.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Nessun calcolo di mortalità registrato
              </div>
            ) : (
              <Table>
                <TableCaption>Cronologia dei calcoli di mortalità</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Iniziale</TableHead>
                    <TableHead className="text-right">Attuale</TableHead>
                    <TableHead className="text-right">Venduti</TableHead>
                    <TableHead className="text-right">Mortalità</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mortalityHistoryQuery.data.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {format(new Date(record.calculationDate), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(record.initialCount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(record.currentCount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(record.soldCount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(record.mortalityCount)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {record.mortalityPercentage.toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-xs text-muted-foreground">
          Ultimo aggiornamento: {
            !inventoryQuery.isLoading && !inventoryQuery.isError 
              ? format(new Date(), "dd/MM/yyyy HH:mm:ss")
              : "-"
          }
        </div>
        <Button 
          variant="outline" 
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/lot-inventory", lotId] });
          }}
        >
          Aggiorna
        </Button>
      </CardFooter>
    </Card>
  );
}