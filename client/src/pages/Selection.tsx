import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Plus, FileText, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { PageHeading } from "@/components/PageHeading";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/EmptyState";
import { formatDate } from "@/lib/utils";
import type { Selection } from "@shared/schema";

export default function VagliaturaPage() {
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch selezioni
  const { data: selections, isLoading } = useQuery({
    queryKey: ["/api/selections"],
    staleTime: 1000 * 60, // 1 minuto
  });

  // Filtri sulle selezioni
  const filteredSelections = selections?.filter((selection: Selection) => {
    // Filtro per stato
    if (statusFilter !== "all" && selection.status !== statusFilter) {
      return false;
    }

    // Filtro per testo di ricerca
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      const selectionNumber = selection.selectionNumber.toString();
      const purpose = selection.purpose || "";
      
      return (
        selectionNumber.includes(searchLower) ||
        purpose.toLowerCase().includes(searchLower) ||
        formatDate(new Date(selection.date)).includes(searchLower)
      );
    }

    return true;
  });

  // Ottiene il badge corretto in base allo stato
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="success" className="ml-2">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completata
          </Badge>
        );
      case "draft":
        return (
          <Badge variant="secondary" className="ml-2">
            <Clock className="h-3 w-3 mr-1" />
            Bozza
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="destructive" className="ml-2">
            <AlertCircle className="h-3 w-3 mr-1" />
            Annullata
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/" },
              { label: "Vagliatura", href: "/selection" },
            ]}
          />
          <PageHeading
            title="Gestione Vagliatura"
            description="Gestisci le operazioni di vagliatura per trasferire gli animali tra le ceste"
            icon={<FileText className="h-6 w-6" />}
            className="mt-2"
          />
        </div>
        <Button
          onClick={() => navigate("/selection/new")}
          className="flex-shrink-0"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuova Vagliatura
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Elenco Vagliature</CardTitle>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <Input
              placeholder="Cerca per numero, scopo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Stato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti gli stati</SelectItem>
                <SelectItem value="draft">Bozze</SelectItem>
                <SelectItem value="completed">Completate</SelectItem>
                <SelectItem value="cancelled">Annullate</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : filteredSelections?.length ? (
            <div className="space-y-4">
              {filteredSelections.map((selection: Selection) => (
                <Link
                  key={selection.id}
                  href={`/selection/${selection.id}`}
                >
                  <div className="border rounded-md p-4 hover:border-primary hover:bg-accent/50 cursor-pointer transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center">
                          <h3 className="text-lg font-medium">
                            Vagliatura #{selection.selectionNumber}
                          </h3>
                          {getStatusBadge(selection.status)}
                        </div>
                        <p className="text-muted-foreground">
                          {formatDate(new Date(selection.date))}
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                        <Badge>{selection.purpose}</Badge>
                        {selection.screeningType && (
                          <Badge variant="outline">
                            {selection.screeningType === "sopra_vaglio"
                              ? "Sopra Vaglio"
                              : "Sotto Vaglio"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<FileText className="h-12 w-12 text-muted-foreground" />}
              title="Nessuna vagliatura trovata"
              description={
                search || statusFilter !== "all"
                  ? "Prova a cambiare i filtri di ricerca"
                  : "Inizia creando una nuova vagliatura"
              }
              action={
                !search && statusFilter === "all" ? (
                  <Button
                    onClick={() => navigate("/selection/new")}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuova Vagliatura
                  </Button>
                ) : null
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}