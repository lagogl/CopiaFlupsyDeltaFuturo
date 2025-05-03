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
import { Search, Download, FileText, Trash2, Calendar } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

// Componente per il badge di stato del report
const ReportStatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "pending":
      return <Badge variant="outline">In attesa</Badge>;
    case "processing":
      return <Badge variant="secondary" className="bg-blue-500 hover:bg-blue-600">In elaborazione</Badge>;
    case "completed":
      return <Badge className="bg-green-500 hover:bg-green-600">Completato</Badge>;
    case "failed":
      return <Badge variant="destructive">Fallito</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function Reports() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [showSalesReportDialog, setShowSalesReportDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentReportId, setCurrentReportId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date>(new Date(new Date().setDate(1))); // Primo giorno del mese corrente
  const [endDate, setEndDate] = useState<Date>(new Date()); // Oggi
  const [reportFormat, setReportFormat] = useState("pdf");

  // Query per ottenere i report
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["/api/reports", searchQuery, activeTab],
    queryFn: async () => {
      let url = "/api/reports";
      const params = new URLSearchParams();
      
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      
      if (activeTab !== "all") {
        params.append("type", activeTab);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Errore nel recupero dei report");
      }
      return response.json();
    },
  });

  // Funzione per generare un report di vendita
  const handleGenerateSalesReport = async () => {
    try {
      const response = await apiRequest(
        "POST",
        "/api/reports/sales",
        {
          title: `Report vendite ${format(startDate, "dd/MM/yyyy", { locale: it })} - ${format(endDate, "dd/MM/yyyy", { locale: it })}`,
          format: reportFormat,
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
          description: `Analisi delle vendite dal ${format(startDate, "dd/MM/yyyy", { locale: it })} al ${format(endDate, "dd/MM/yyyy", { locale: it })}`
        }
      );
      
      if (response.ok) {
        setShowSalesReportDialog(false);
        queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
        
        const data = await response.json();
        toast({
          title: "Report generato",
          description: "Report di vendita generato con successo",
        });
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

  // Funzione per eliminare un report
  const handleDeleteReport = async () => {
    if (!currentReportId) return;
    
    try {
      const response = await apiRequest(
        "DELETE",
        `/api/reports/${currentReportId}`,
        {}
      );
      
      if (response.ok) {
        setShowDeleteDialog(false);
        queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
        toast({
          title: "Report eliminato",
          description: "Report eliminato con successo",
        });
      } else {
        throw new Error("Errore durante l'eliminazione del report");
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore durante l'eliminazione del report",
        variant: "destructive",
      });
    }
  };

  // Funzione per scaricare un report
  const handleDownloadReport = (reportId: number) => {
    window.open(`/api/reports/${reportId}/download`, "_blank");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Report e Statistiche</h1>
        <div className="flex space-x-2">
          <Button onClick={() => setShowSalesReportDialog(true)}>
            <FileText className="mr-2 h-4 w-4" /> Report Vendite
          </Button>
        </div>
      </div>

      {/* Filtri e ricerca */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cerca report..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Tabs
          defaultValue="all"
          className="w-full"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="grid w-full md:w-[500px] grid-cols-5">
            <TabsTrigger value="all">Tutti</TabsTrigger>
            <TabsTrigger value="sales">Vendite</TabsTrigger>
            <TabsTrigger value="delivery">Consegne</TabsTrigger>
            <TabsTrigger value="inventory">Inventario</TabsTrigger>
            <TabsTrigger value="custom">Personalizzati</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tabella Report */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titolo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Formato</TableHead>
                <TableHead>Data Creazione</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead className="text-right">Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    Caricamento report...
                  </TableCell>
                </TableRow>
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    Nessun report trovato
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report: any) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      {report.title}
                      {report.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {report.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {report.type === "sales"
                          ? "Vendite"
                          : report.type === "delivery"
                          ? "Consegna"
                          : report.type === "inventory"
                          ? "Inventario"
                          : report.type === "production"
                          ? "Produzione"
                          : report.type === "financial"
                          ? "Finanziario"
                          : "Personalizzato"}
                      </Badge>
                    </TableCell>
                    <TableCell className="uppercase">{report.format}</TableCell>
                    <TableCell>
                      {format(new Date(report.createdAt), "dd/MM/yyyy HH:mm", {
                        locale: it,
                      })}
                    </TableCell>
                    <TableCell>
                      <ReportStatusBadge status={report.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        {report.status === "completed" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadReport(report.id)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setCurrentReportId(report.id);
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

      {/* Dialog per generare un report di vendita */}
      <Dialog open={showSalesReportDialog} onOpenChange={setShowSalesReportDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Genera Report Vendite</DialogTitle>
            <DialogDescription>
              Seleziona il periodo di tempo per il quale vuoi generare il report.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col space-y-2">
                <Label htmlFor="startDate">Data Inizio</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="startDate"
                      variant="outline"
                      className="justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "dd/MM/yyyy", { locale: it }) : "Seleziona data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      initialFocus
                      disabled={(date) => date > new Date() || date > endDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-col space-y-2">
                <Label htmlFor="endDate">Data Fine</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="endDate"
                      variant="outline"
                      className="justify-start text-left font-normal"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "dd/MM/yyyy", { locale: it }) : "Seleziona data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      initialFocus
                      disabled={(date) => date > new Date() || date < startDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <Label htmlFor="format">Formato Report</Label>
              <Select
                value={reportFormat}
                onValueChange={setReportFormat}
              >
                <SelectTrigger id="format">
                  <SelectValue placeholder="Seleziona formato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSalesReportDialog(false)}
            >
              Annulla
            </Button>
            <Button type="button" onClick={handleGenerateSalesReport}>
              Genera Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog di conferma eliminazione */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sei sicuro di voler eliminare questo report?</AlertDialogTitle>
            <AlertDialogDescription>
              Questa azione non può essere annullata. Il report verrà eliminato definitivamente dal sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCurrentReportId(null)}>
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteReport} className="bg-red-500 hover:bg-red-600">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}