import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/PageHeading";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, FileText, ShoppingCart, MoveRight, AlertCircle, Filter } from "lucide-react";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

// Tipo per le operazioni di selezione
interface Selection {
  id: number;
  date: string;
  selectionNumber: number;
  purpose: string | null;
  status: 'draft' | 'completed' | 'cancelled';
  notes: string | null;
  createdAt: string;
}

// Tipo per le statistiche
interface SelectionStats {
  selections: {
    total: number;
    completed: number;
    draft: number;
    cancelled: number;
  };
  baskets: {
    total: number;
    sold: number;
    placed: number;
  };
}

export default function Selection() {
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  
  // Query per recuperare l'elenco delle selezioni
  const { data: selections, isLoading: isLoadingSelections, error: selectionsError } = useQuery({
    queryKey: ['/api/selections', statusFilter],
    queryFn: async () => {
      const url = statusFilter
        ? `/api/selections?status=${statusFilter}`
        : '/api/selections';
      return apiRequest<Selection[]>(url);
    }
  });
  
  // Query per recuperare le statistiche
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/selections/statistics'],
    queryFn: async () => {
      return apiRequest<SelectionStats>('/api/selections/statistics');
    }
  });
  
  // Gestione del filtro per stato
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value === 'all' ? null : value);
  };
  
  // Formattazione della data
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: it });
  };
  
  // Stile badge in base allo stato
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completata</Badge>;
      case 'draft':
        return <Badge variant="outline">Bozza</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Annullata</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };
  
  // Redirect alla creazione di una nuova selezione
  const handleNewSelection = () => {
    navigate('/selection/new');
  };
  
  return (
    <div className="container mx-auto py-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Selezioni", href: "/selection" },
        ]}
      />
      
      <div className="flex justify-between items-center mt-2 mb-6">
        <PageHeading
          title="Gestione Selezioni"
          description="Monitora e gestisci le operazioni di selezione"
          icon={<FileText className="h-8 w-8 text-primary"/>}
        />
        
        <Button onClick={handleNewSelection}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nuova Selezione
        </Button>
      </div>
      
      {/* Statistiche dashboard */}
      {isLoadingStats ? (
        <div className="w-full flex justify-center my-8">
          <Spinner size="lg" />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Selezioni</CardTitle>
              <CardDescription>Riepilogo operazioni</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.selections.total}</div>
              <div className="text-sm text-muted-foreground mt-2">
                <span className="font-medium text-green-500">{stats.selections.completed}</span> completate,{" "}
                <span className="font-medium text-yellow-500">{stats.selections.draft}</span> in bozza
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Ceste Vendute</CardTitle>
              <CardDescription>Da operazioni di selezione</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.baskets.sold || 0}</div>
              <div className="text-sm text-muted-foreground mt-2">
                <span className="font-medium">{((stats.baskets.sold / stats.baskets.total) * 100 || 0).toFixed(1)}%</span> del totale
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Ceste Collocate</CardTitle>
              <CardDescription>Distribuite nei FLUPSY</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.baskets.placed || 0}</div>
              <div className="text-sm text-muted-foreground mt-2">
                <span className="font-medium">{((stats.baskets.placed / stats.baskets.total) * 100 || 0).toFixed(1)}%</span> del totale
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
      
      {/* Filtri */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Elenco Selezioni</h2>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9 px-4">
              <Filter className="mr-2 h-3.5 w-3.5" />
              Filtri
              {statusFilter && <Badge variant="secondary" className="ml-2">1</Badge>}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[200px] p-4">
            <div className="space-y-2">
              <h4 className="font-medium">Stato</h4>
              <Select
                defaultValue={statusFilter || 'all'}
                onValueChange={handleStatusFilterChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tutti gli stati" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="completed">Completate</SelectItem>
                  <SelectItem value="draft">Bozze</SelectItem>
                  <SelectItem value="cancelled">Annullate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Tabella Selezioni */}
      {isLoadingSelections ? (
        <div className="w-full flex justify-center my-8">
          <Spinner size="lg" />
        </div>
      ) : selectionsError ? (
        <EmptyState
          icon={<AlertCircle className="h-10 w-10 text-destructive" />}
          title="Errore di caricamento"
          description="Non è stato possibile caricare le selezioni. Riprova più tardi."
          action={
            <Button variant="outline" onClick={() => window.location.reload()}>
              Ricarica la pagina
            </Button>
          }
        />
      ) : selections && selections.length > 0 ? (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Scopo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selections.map((selection) => (
                  <TableRow key={selection.id}>
                    <TableCell className="font-medium">{selection.selectionNumber}</TableCell>
                    <TableCell>{formatDate(selection.date)}</TableCell>
                    <TableCell>{selection.purpose || "—"}</TableCell>
                    <TableCell>{getStatusBadge(selection.status)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {selection.notes || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" asChild>
                        <Link to={`/selection/${selection.id}`}>
                          Dettagli <MoveRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          icon={<FileText className="h-10 w-10 text-muted-foreground" />}
          title="Nessuna selezione trovata"
          description={
            statusFilter
              ? "Non sono presenti selezioni che corrispondono ai filtri selezionati."
              : "Non è ancora stata creata alcuna selezione. Crea la tua prima selezione per iniziare."
          }
          action={
            <Button onClick={handleNewSelection}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuova Selezione
            </Button>
          }
        />
      )}
    </div>
  );
}