import { useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Search, Plus, Edit, Trash2, FileText, RefreshCw, Ban, CheckCircle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Link } from "wouter";

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

export default function Orders() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteOrderId, setDeleteOrderId] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Query per ottenere gli ordini
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["/api/orders", searchQuery, statusFilter],
    queryFn: async () => {
      let url = "/api/orders";
      const params = new URLSearchParams();
      
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Errore nel recupero degli ordini");
      }
      return response.json();
    },
  });

  // Query per ottenere le statistiche degli ordini
  const { data: stats } = useQuery({
    queryKey: ["/api/orders-stats"],
    queryFn: async () => {
      const response = await fetch("/api/orders-stats");
      if (!response.ok) {
        throw new Error("Errore nel recupero delle statistiche");
      }
      return response.json();
    },
  });

  // Funzione per aggiornare lo stato di un ordine
  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      const response = await apiRequest(
        "PATCH", 
        `/api/orders/${orderId}/status`,
        { status: newStatus }
      );
      
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/orders-stats"] });
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

  // Funzione per gestire l'eliminazione di un ordine
  const handleDeleteOrder = async () => {
    if (!deleteOrderId) return;
    
    try {
      const response = await apiRequest(
        "DELETE",
        `/api/orders/${deleteOrderId}`,
        {}
      );
      
      if (response.ok) {
        setShowDeleteDialog(false);
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/orders-stats"] });
        toast({
          title: "Ordine eliminato",
          description: "Ordine eliminato con successo",
        });
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

  // Funzione per generare un report di consegna
  const handleGenerateDeliveryReport = async (orderId: number) => {
    try {
      const response = await apiRequest(
        "POST",
        "/api/reports/delivery",
        {
          orderId,
          title: "Documento di Trasporto",
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Gestione Ordini</h1>
        <Link href="/orders/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Nuovo Ordine
          </Button>
        </Link>
      </div>

      {/* Dashboard di statistiche */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totale Ordini</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fatturato Totale</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(stats.totalSales)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ordini Completati</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedOrders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Da Pagare</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.paymentStatusBreakdown?.pending || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtri e ricerca */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca ordini..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Tabs
          defaultValue="all"
          className="w-full"
          value={statusFilter}
          onValueChange={setStatusFilter}
        >
          <TabsList className="grid w-full md:w-[500px] grid-cols-5">
            <TabsTrigger value="all">Tutti</TabsTrigger>
            <TabsTrigger value="draft">Bozze</TabsTrigger>
            <TabsTrigger value="processing">In Lavorazione</TabsTrigger>
            <TabsTrigger value="shipped">Spediti</TabsTrigger>
            <TabsTrigger value="completed">Completati</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tabella Ordini */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Totale</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    Caricamento ordini...
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    Nessun ordine trovato
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.orderNumber}
                    </TableCell>
                    <TableCell>{order.clientName}</TableCell>
                    <TableCell>
                      {format(new Date(order.orderDate), "dd/MM/yyyy", {
                        locale: it,
                      })}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </TableCell>
                    <TableCell>
                      {formatPrice(order.totalAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Link href={`/orders/${order.id}`}>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {order.status !== "confirmed" && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(order.id, "confirmed")}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Conferma ordine
                              </DropdownMenuItem>
                            )}
                            {order.status !== "processing" && order.status !== "completed" && order.status !== "cancelled" && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(order.id, "processing")}
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                In lavorazione
                              </DropdownMenuItem>
                            )}
                            {order.status !== "shipped" && order.status !== "completed" && order.status !== "cancelled" && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(order.id, "shipped")}
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Spedito
                              </DropdownMenuItem>
                            )}
                            {order.status !== "delivered" && order.status !== "completed" && order.status !== "cancelled" && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(order.id, "delivered")}
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Consegnato
                              </DropdownMenuItem>
                            )}
                            {order.status !== "completed" && order.status !== "cancelled" && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(order.id, "completed")}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Completa ordine
                              </DropdownMenuItem>
                            )}
                            {order.status !== "cancelled" && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(order.id, "cancelled")}
                                className="text-red-600"
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Annulla ordine
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleGenerateDeliveryReport(order.id)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeleteOrderId(order.id);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
            <AlertDialogCancel onClick={() => setDeleteOrderId(null)}>
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