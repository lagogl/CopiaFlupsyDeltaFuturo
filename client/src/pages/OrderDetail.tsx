import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { ArrowLeft, Download, FileText, Trash2, RefreshCw, Ban, CheckCircle, Plus } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Componente per il badge di stato dell'ordine
const OrderStatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "draft":
      return <Badge variant="outline">Bozza</Badge>;
    case "confirmed":
      return <Badge variant="secondary">Confermato</Badge>;
    case "processing":
      return <Badge variant="secondary" className="bg-blue-500 hover:bg-blue-600">In lavorazione</Badge>;
    case "ready":
      return <Badge className="bg-purple-500 hover:bg-purple-600">Pronto</Badge>;
    case "shipped":
      return <Badge className="bg-orange-500 hover:bg-orange-600">Spedito</Badge>;
    case "delivered":
      return <Badge className="bg-green-500 hover:bg-green-600">Consegnato</Badge>;
    case "completed":
      return <Badge className="bg-green-700 hover:bg-green-800">Completato</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Annullato</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// Componente per il badge di stato del pagamento
const PaymentStatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "pending":
      return <Badge variant="outline">Da pagare</Badge>;
    case "partial":
      return <Badge variant="secondary">Parziale</Badge>;
    case "paid":
      return <Badge className="bg-green-500 hover:bg-green-600">Pagato</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

// Schema per la validazione del pagamento
const paymentSchema = z.object({
  amount: z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: "L'importo deve essere un numero positivo",
  }),
  paymentDate: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: "Data non valida",
  }),
  paymentType: z.string().min(1, "Il tipo di pagamento è obbligatorio"),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export default function OrderDetail() {
  const { id } = useParams();
  const orderId = parseInt(id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: "",
      paymentDate: format(new Date(), "yyyy-MM-dd"),
      paymentType: "bank_transfer",
      reference: "",
      notes: "",
    },
  });

  // Query per ottenere i dettagli dell'ordine
  const { data: order, isLoading, isError } = useQuery({
    queryKey: [`/api/orders/${orderId}`],
    queryFn: async () => {
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) {
        throw new Error("Errore nel recupero dei dettagli dell'ordine");
      }
      return response.json();
    },
    enabled: !isNaN(orderId),
  });

  // Se l'ID non è valido, reindirizza alla pagina degli ordini
  useEffect(() => {
    if (isNaN(orderId)) {
      navigate("/orders");
    }
  }, [orderId, navigate]);

  // Funzione per aggiornare lo stato di un ordine
  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await apiRequest(
        "PATCH", 
        `/api/orders/${orderId}/status`,
        { status: newStatus }
      );
      
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
        toast({
          title: "Stato aggiornato",
          description: "Stato dell'ordine aggiornato con successo",
        });
      } else {
        throw new Error("Errore durante l'aggiornamento dello stato");
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante l'aggiornamento dello stato",
        variant: "destructive",
      });
    }
  };

  // Funzione per eliminare un ordine
  const handleDeleteOrder = async () => {
    try {
      const response = await apiRequest(
        "DELETE",
        `/api/orders/${orderId}`,
        {}
      );
      
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
        toast({
          title: "Ordine eliminato",
          description: "Ordine eliminato con successo",
        });
        navigate("/orders");
      } else {
        throw new Error("Errore durante l'eliminazione dell'ordine");
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante l'eliminazione dell'ordine",
        variant: "destructive",
      });
    }
  };

  // Funzione per aggiungere un pagamento
  const handleAddPayment = async (data: PaymentFormValues) => {
    try {
      const paymentData = {
        ...data,
        amount: parseFloat(data.amount),
      };
      
      const response = await apiRequest(
        "POST",
        `/api/orders/${orderId}/payments`,
        paymentData
      );
      
      if (response.ok) {
        setShowPaymentDialog(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
        toast({
          title: "Pagamento aggiunto",
          description: "Pagamento registrato con successo",
        });
      } else {
        throw new Error("Errore durante l'aggiunta del pagamento");
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante l'aggiunta del pagamento",
        variant: "destructive",
      });
    }
  };

  // Funzione per generare un report di consegna
  const handleGenerateDeliveryReport = async () => {
    try {
      const response = await apiRequest(
        "POST",
        "/api/reports/delivery",
        {
          orderId,
          title: `Documento di Trasporto - ${order?.orderNumber}`,
          format: "pdf"
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Report generato",
          description: "Report di consegna generato con successo",
        });
        
        // Apri il report generato in una nuova scheda
        window.open(`/api/reports/${data.id}/download`, "_blank");
      } else {
        throw new Error("Errore durante la generazione del report");
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante la generazione del report",
        variant: "destructive",
      });
    }
  };

  // Formatta il prezzo in euro
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <span className="text-lg">Caricamento ordine...</span>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="p-6">
        <div className="flex items-center mb-6">
          <Button variant="ghost" className="mr-4" onClick={() => navigate("/orders")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Torna agli ordini
          </Button>
        </div>
        <div className="text-center py-10">
          <h2 className="text-xl font-semibold">Ordine non trovato</h2>
          <p className="mt-2">L'ordine richiesto non esiste o si è verificato un errore.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center">
          <Button variant="ghost" className="mr-4" onClick={() => navigate("/orders")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Torna agli ordini
          </Button>
          <h1 className="text-2xl font-bold">
            Ordine #{order.orderNumber}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowPaymentDialog(true)}>
            <Plus className="mr-2 h-4 w-4" /> Pagamento
          </Button>
          <Button variant="outline" onClick={handleGenerateDeliveryReport}>
            <FileText className="mr-2 h-4 w-4" /> DDT
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" /> Stato
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {order.status !== "confirmed" && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange("confirmed")}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Conferma ordine
                </DropdownMenuItem>
              )}
              {order.status !== "processing" && order.status !== "completed" && order.status !== "cancelled" && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange("processing")}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  In lavorazione
                </DropdownMenuItem>
              )}
              {order.status !== "shipped" && order.status !== "completed" && order.status !== "cancelled" && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange("shipped")}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Spedito
                </DropdownMenuItem>
              )}
              {order.status !== "delivered" && order.status !== "completed" && order.status !== "cancelled" && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange("delivered")}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Consegnato
                </DropdownMenuItem>
              )}
              {order.status !== "completed" && order.status !== "cancelled" && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange("completed")}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Completa ordine
                </DropdownMenuItem>
              )}
              {order.status !== "cancelled" && (
                <DropdownMenuItem
                  onClick={() => handleStatusChange("cancelled")}
                  className="text-red-600"
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Annulla ordine
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Elimina
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Ordine */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Dettagli Ordine</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Stato Ordine</Label>
                <div className="mt-1">
                  <OrderStatusBadge status={order.status} />
                </div>
              </div>
              <div>
                <Label>Stato Pagamento</Label>
                <div className="mt-1">
                  <PaymentStatusBadge status={order.paymentStatus} />
                </div>
              </div>
              <div>
                <Label>Data Ordine</Label>
                <div className="mt-1 text-sm">
                  {format(new Date(order.orderDate), "dd MMMM yyyy", { locale: it })}
                </div>
              </div>
              <div>
                <Label>Cliente</Label>
                <div className="mt-1 text-sm font-medium">{order.clientName}</div>
              </div>
              <div>
                <Label>Totale</Label>
                <div className="mt-1 text-xl font-semibold">
                  {formatPrice(order.totalAmount)}
                </div>
              </div>
              <div>
                <Label>Data Consegna Richiesta</Label>
                <div className="mt-1 text-sm">
                  {order.requestedDeliveryDate
                    ? format(new Date(order.requestedDeliveryDate), "dd MMMM yyyy", { locale: it })
                    : "Non specificata"}
                </div>
              </div>
              {order.notes && (
                <div className="md:col-span-2">
                  <Label>Note</Label>
                  <div className="mt-1 text-sm p-2 bg-muted rounded-md">{order.notes}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pagamenti */}
        <Card>
          <CardHeader>
            <CardTitle>Pagamenti</CardTitle>
            <CardDescription>
              Totale: {formatPrice(order.totalAmount)}
              {order.paymentStatus !== "paid" && (
                <div className="mt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto"
                    onClick={() => {
                      form.setValue("amount", (order.totalAmount - (order.payments?.reduce((sum, p) => sum + p.amount, 0) || 0)).toString());
                      setShowPaymentDialog(true);
                    }}
                  >
                    <Plus className="mr-2 h-3 w-3" /> Aggiungi Pagamento
                  </Button>
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(!order.payments || order.payments.length === 0) ? (
              <div className="text-center py-4 text-muted-foreground">
                Nessun pagamento registrato
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Importo</TableHead>
                    <TableHead>Metodo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.payments.map((payment, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {format(new Date(payment.paymentDate), "dd/MM/yyyy", { locale: it })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatPrice(payment.amount)}
                      </TableCell>
                      <TableCell>
                        {payment.paymentType === "cash" && "Contanti"}
                        {payment.paymentType === "card" && "Carta"}
                        {payment.paymentType === "bank_transfer" && "Bonifico"}
                        {payment.paymentType === "check" && "Assegno"}
                        {!["cash", "card", "bank_transfer", "check"].includes(payment.paymentType) && payment.paymentType}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Articoli Ordine */}
      <Card>
        <CardHeader>
          <CardTitle>Articoli Ordinati</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrizione</TableHead>
                <TableHead className="text-right">Quantità</TableHead>
                <TableHead className="text-right">Prezzo Unit.</TableHead>
                <TableHead className="text-right">Totale</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items && order.items.length > 0 ? (
                order.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {item.description}
                      {item.notes && (
                        <div className="text-xs text-muted-foreground">
                          {item.notes}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantity} {item.unit}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(item.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(item.totalPrice)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    Nessun articolo nell'ordine
                  </TableCell>
                </TableRow>
              )}
              {(order.discount || order.shipping_amount) && (
                <>
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-medium">
                      Subtotale
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(order.subtotalAmount || order.totalAmount)}
                    </TableCell>
                  </TableRow>
                  {order.discountAmount > 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-right text-muted-foreground">
                        Sconto{" "}
                        {order.discountRate > 0 && `(${order.discountRate}%)`}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        -{formatPrice(order.discountAmount)}
                      </TableCell>
                    </TableRow>
                  )}
                  {order.shippingAmount > 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-right text-muted-foreground">
                        Spese di spedizione
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatPrice(order.shippingAmount)}
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
              <TableRow>
                <TableCell colSpan={2} />
                <TableCell className="text-right font-medium">
                  Totale Ordine
                </TableCell>
                <TableCell className="text-right font-bold">
                  {formatPrice(order.totalAmount)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog per aggiungere un pagamento */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Aggiungi pagamento</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddPayment)} className="space-y-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Importo</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data pagamento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paymentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Metodo di pagamento</FormLabel>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      {...field}
                    >
                      <option value="bank_transfer">Bonifico bancario</option>
                      <option value="cash">Contanti</option>
                      <option value="card">Carta di credito/debito</option>
                      <option value="check">Assegno</option>
                    </select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Riferimento</FormLabel>
                    <FormControl>
                      <Input placeholder="es: Fattura 123, Bonifico ..." {...field} />
                    </FormControl>
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
                      <Textarea placeholder="Note aggiuntive..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPaymentDialog(false)}
                >
                  Annulla
                </Button>
                <Button type="submit">Salva pagamento</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog di conferma eliminazione */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro di voler eliminare questo ordine?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. L'ordine verrà eliminato definitivamente dal sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrder} className="bg-red-500 hover:bg-red-600">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}