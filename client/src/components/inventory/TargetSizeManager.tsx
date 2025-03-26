import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, addDays } from "date-fns";
import { it } from "date-fns/locale";
import { Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, PlusIcon, CheckCircleIcon, XCircleIcon, ClockIcon, InfoIcon } from "lucide-react";

interface TargetSizeAnnotation {
  id: number;
  basketId: number;
  targetSizeId: number;
  status: "pending" | "reached" | "canceled";
  predictedDate: string;
  reachedDate: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  basket?: {
    id: number;
    physicalNumber: number;
    flupsyId: number;
    row: string | null;
    position: number | null;
  };
  targetSize?: {
    id: number;
    code: string;
    name: string;
  };
}

interface Size {
  id: number;
  code: string;
  name: string;
  sizeMm: number | null;
  minAnimalsPerKg: number | null;
  maxAnimalsPerKg: number | null;
}

interface Basket {
  id: number;
  physicalNumber: number;
  flupsyId: number;
  row: string | null;
  position: number | null;
  state: string;
  currentCycleId: number | null;
}

// Schema per la creazione di una nuova annotazione
const createAnnotationSchema = z.object({
  basketId: z.number({
    required_error: "Seleziona una cesta",
  }),
  targetSizeId: z.number({
    required_error: "Seleziona una taglia target",
  }),
  predictedDate: z.string({
    required_error: "Inserisci una data prevista",
  }),
  notes: z.string().nullable().optional(),
});

type CreateAnnotationValues = z.infer<typeof createAnnotationSchema>;

export function TargetSizeManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("pending");

  // Recupera le annotazioni di taglia
  const { data: annotations, isLoading } = useQuery({
    queryKey: ['/api/target-size-annotations'],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Recupera le taglie
  const { data: sizes } = useQuery({
    queryKey: ['/api/sizes'],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Recupera i cestelli con cicli attivi
  const { data: baskets } = useQuery({
    queryKey: ['/api/baskets'],
    queryFn: getQueryFn<Basket[]>({ on401: "throw" }),
  });

  // Form per la creazione di una nuova annotazione
  const form = useForm<CreateAnnotationValues>({
    resolver: zodResolver(createAnnotationSchema),
    defaultValues: {
      notes: null,
    },
  });

  // Mutazione per creare una nuova annotazione
  const createAnnotation = useMutation({
    mutationFn: async (values: CreateAnnotationValues) => {
      return await apiRequest("POST", "/api/target-size-annotations", values);
    },
    onSuccess: () => {
      toast({
        title: "Annotazione creata",
        description: "L'annotazione di taglia è stata creata con successo.",
      });
      setIsCreateDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/target-size-annotations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tp3000-baskets'] });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore durante la creazione dell'annotazione: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Mutazione per aggiornare lo stato di un'annotazione
  const updateAnnotationStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: "reached" | "canceled" }) => {
      return await apiRequest("PATCH", `/api/target-size-annotations/${id}`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Stato aggiornato",
        description: "Lo stato dell'annotazione è stato aggiornato con successo.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/target-size-annotations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/tp3000-baskets'] });
    },
    onError: (error) => {
      toast({
        title: "Errore",
        description: `Si è verificato un errore durante l'aggiornamento dello stato: ${error}`,
        variant: "destructive",
      });
    },
  });

  // Filtra le annotazioni in base allo stato
  const pendingAnnotations = annotations?.filter((a) => a.status === "pending") || [];
  const reachedAnnotations = annotations?.filter((a) => a.status === "reached") || [];
  const canceledAnnotations = annotations?.filter((a) => a.status === "canceled") || [];

  // Formatta la data in italiano
  const formatDateIT = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), "d MMMM yyyy", { locale: it });
    } catch (e) {
      return dateStr;
    }
  };

  // Calcola i giorni rimanenti
  const getDaysRemaining = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateStr);
    targetDate.setHours(0, 0, 0, 0);
    
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // Gestisce l'invio del form
  const onSubmit = (values: CreateAnnotationValues) => {
    createAnnotation.mutate(values);
  };

  // Restituisce solo i cestelli con cicli attivi
  const activeBasketsWithCycles = baskets?.filter((b) => b.currentCycleId !== null) || [];

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Gestione Annotazioni Taglia</CardTitle>
          <CardDescription>
            Monitora e gestisci le previsioni di raggiungimento delle taglie commerciali
          </CardDescription>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon className="mr-2 h-4 w-4" />
              Nuova Annotazione
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuova Annotazione di Taglia</DialogTitle>
              <DialogDescription>
                Crea una nuova annotazione per monitorare quando una cesta raggiungerà una taglia commerciale specifica.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="basketId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cesta</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona una cesta" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {activeBasketsWithCycles.map((basket) => (
                            <SelectItem key={basket.id} value={basket.id.toString()}>
                              #{basket.physicalNumber}
                              {basket.row && basket.position && ` (${basket.row}-${basket.position})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Solo le ceste con cicli attivi possono essere monitorate
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="targetSizeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Taglia Target</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona una taglia target" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sizes?.map((size) => (
                            <SelectItem key={size.id} value={size.id.toString()}>
                              {size.code} - {size.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        La taglia commerciale che prevedi la cesta raggiungerà
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="predictedDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Prevista</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </FormControl>
                      <FormDescription>
                        La data in cui prevedi che la cesta raggiungerà questa taglia
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Inserisci eventuali note..." 
                          {...field} 
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Informazioni aggiuntive o contesto per questa predizione
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createAnnotation.isPending}>
                    {createAnnotation.isPending ? "Creazione in corso..." : "Crea Annotazione"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="pending" className="relative">
              In Attesa
              {pendingAnnotations.length > 0 && (
                <Badge className="ml-2 bg-amber-500">{pendingAnnotations.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="reached">
              Raggiunte
              {reachedAnnotations.length > 0 && (
                <Badge className="ml-2 bg-emerald-500">{reachedAnnotations.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="canceled">
              Annullate
              {canceledAnnotations.length > 0 && (
                <Badge className="ml-2 bg-gray-500">{canceledAnnotations.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : pendingAnnotations.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                <InfoIcon size={48} className="mb-2 text-gray-400" />
                <p className="text-center">Nessuna annotazione in attesa</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cesta</TableHead>
                    <TableHead>Taglia Target</TableHead>
                    <TableHead>Data Prevista</TableHead>
                    <TableHead>Giorni Rimanenti</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingAnnotations.map((annotation) => {
                    const daysRemaining = getDaysRemaining(annotation.predictedDate);
                    
                    return (
                      <TableRow key={annotation.id}>
                        <TableCell>
                          <div className="font-medium">
                            <Link to={`/operazioni/cestello/${annotation.basketId}`} className="text-primary hover:underline">
                              #{annotation.basket?.physicalNumber}
                            </Link>
                          </div>
                          {annotation.basket?.row && annotation.basket?.position && (
                            <div className="text-sm text-gray-500">
                              Posizione: {annotation.basket.row}-{annotation.basket.position}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {annotation.targetSize?.code} - {annotation.targetSize?.name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                            {formatDateIT(annotation.predictedDate)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              daysRemaining <= 3
                                ? "bg-red-500"
                                : daysRemaining <= 7
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }
                          >
                            {daysRemaining === 0
                              ? "Oggi"
                              : daysRemaining === 1
                              ? "Domani"
                              : `${daysRemaining} giorni`}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate">
                            {annotation.notes || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-emerald-500 text-emerald-500 hover:bg-emerald-50"
                              onClick={() => updateAnnotationStatus.mutate({ id: annotation.id, status: "reached" })}
                            >
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                              Raggiunta
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-gray-300 hover:bg-gray-50"
                              onClick={() => updateAnnotationStatus.mutate({ id: annotation.id, status: "canceled" })}
                            >
                              <XCircleIcon className="h-4 w-4 mr-1" />
                              Annulla
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="reached">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : reachedAnnotations.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                <InfoIcon size={48} className="mb-2 text-gray-400" />
                <p className="text-center">Nessuna annotazione raggiunta</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cesta</TableHead>
                    <TableHead>Taglia Target</TableHead>
                    <TableHead>Data Prevista</TableHead>
                    <TableHead>Data Raggiunta</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reachedAnnotations.map((annotation) => (
                    <TableRow key={annotation.id}>
                      <TableCell>
                        <div className="font-medium">
                          <Link to={`/operazioni/cestello/${annotation.basketId}`} className="text-primary hover:underline">
                            #{annotation.basket?.physicalNumber}
                          </Link>
                        </div>
                        {annotation.basket?.row && annotation.basket?.position && (
                          <div className="text-sm text-gray-500">
                            Posizione: {annotation.basket.row}-{annotation.basket.position}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {annotation.targetSize?.code} - {annotation.targetSize?.name}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDateIT(annotation.predictedDate)}</TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-500">
                          {annotation.reachedDate ? formatDateIT(annotation.reachedDate) : "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate">
                          {annotation.notes || "-"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="canceled">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
              </div>
            ) : canceledAnnotations.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-gray-500">
                <InfoIcon size={48} className="mb-2 text-gray-400" />
                <p className="text-center">Nessuna annotazione annullata</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cesta</TableHead>
                    <TableHead>Taglia Target</TableHead>
                    <TableHead>Data Prevista</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {canceledAnnotations.map((annotation) => (
                    <TableRow key={annotation.id} className="opacity-70">
                      <TableCell>
                        <div className="font-medium">
                          <Link to={`/operazioni/cestello/${annotation.basketId}`} className="text-primary hover:underline">
                            #{annotation.basket?.physicalNumber}
                          </Link>
                        </div>
                        {annotation.basket?.row && annotation.basket?.position && (
                          <div className="text-sm text-gray-500">
                            Posizione: {annotation.basket.row}-{annotation.basket.position}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {annotation.targetSize?.code} - {annotation.targetSize?.name}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDateIT(annotation.predictedDate)}</TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate">
                          {annotation.notes || "-"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}