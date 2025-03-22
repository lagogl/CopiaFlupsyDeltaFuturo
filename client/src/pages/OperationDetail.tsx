import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getOperationTypeLabel, getOperationTypeColor, formatNumberWithCommas } from "@/lib/utils";
import { ArrowLeft, Calendar, Info, FileText, Tag, Scale, Package, Users, Droplets } from "lucide-react";

export default function OperationDetail() {
  const [, params] = useRoute('/operations/:id');
  const operationId = params?.id ? parseInt(params.id) : null;

  // Fetch operation details
  const { data: operation, isLoading: operationLoading } = useQuery({
    queryKey: ['/api/operations', operationId],
    queryFn: operationId ? () => fetch(`/api/operations/${operationId}`).then(res => res.json()) : undefined,
    enabled: !!operationId
  });

  // Fetch related data if operation is available
  const { data: basket } = useQuery({
    queryKey: ['/api/baskets', operation?.basketId],
    queryFn: operation?.basketId ? () => fetch(`/api/baskets/${operation.basketId}`).then(res => res.json()) : undefined,
    enabled: !!operation?.basketId
  });

  const { data: cycle } = useQuery({
    queryKey: ['/api/cycles', operation?.cycleId],
    queryFn: operation?.cycleId ? () => fetch(`/api/cycles/${operation.cycleId}`).then(res => res.json()) : undefined,
    enabled: !!operation?.cycleId
  });

  const { data: size } = useQuery({
    queryKey: ['/api/sizes', operation?.sizeId],
    queryFn: operation?.sizeId ? () => fetch(`/api/sizes/${operation.sizeId}`).then(res => res.json()) : undefined,
    enabled: !!operation?.sizeId
  });

  const { data: lot } = useQuery({
    queryKey: ['/api/lots', operation?.lotId],
    queryFn: operation?.lotId ? () => fetch(`/api/lots/${operation.lotId}`).then(res => res.json()) : undefined,
    enabled: !!operation?.lotId
  });

  const { data: flupsy } = useQuery({
    queryKey: ['/api/flupsys', basket?.flupsyId],
    queryFn: basket?.flupsyId ? () => fetch(`/api/flupsys/${basket.flupsyId}`).then(res => res.json()) : undefined,
    enabled: !!basket?.flupsyId
  });

  // Loading state
  if (operationLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Link href="/operations">
            <Button variant="ghost" className="mr-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Torna alle operazioni
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Caricamento dettagli operazione...</h1>
        </div>
        <div className="grid gap-6 animate-pulse">
          <div className="h-24 bg-gray-200 rounded-lg"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  // 404 state
  if (!operation && !operationLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold mb-4">Operazione non trovata</h1>
          <p className="mb-6">L'operazione richiesta non esiste o è stata rimossa.</p>
          <Link href="/operations">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Torna all'elenco delle operazioni
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Helper function to format dates
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: it });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div className="flex items-center mb-4 md:mb-0">
          <Link href="/operations">
            <Button variant="ghost" className="mr-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Torna alle operazioni
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              Operazione #{operation.id} - {getOperationTypeLabel(operation.type)}
            </h1>
            <div className="text-sm text-muted-foreground">
              {formatDate(operation.date)}
            </div>
          </div>
        </div>
        
        <div>
          <Badge className={getOperationTypeColor(operation.type)}>
            {getOperationTypeLabel(operation.type)}
          </Badge>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Informazioni base
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium text-muted-foreground">Data:</span>
                <span className="font-medium">{formatDate(operation.date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium text-muted-foreground">Tipo:</span>
                <span className="font-medium">{getOperationTypeLabel(operation.type)}</span>
              </div>
              {cycle && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Ciclo:</span>
                  <Link href={`/cycles/${cycle.id}`}>
                    <span className="font-medium text-primary hover:underline cursor-pointer">
                      #{cycle.id}
                    </span>
                  </Link>
                </div>
              )}
              {basket && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Cesta:</span>
                  <span className="font-medium">#{basket.physicalNumber}</span>
                </div>
              )}
              {flupsy && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Flupsy:</span>
                  <span className="font-medium">{flupsy.name}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              <div className="flex items-center">
                <Scale className="h-4 w-4 mr-2" />
                Dati di peso e conteggio
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {operation.animalsPerKg && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Animali/kg:</span>
                  <span className="font-medium">{formatNumberWithCommas(operation.animalsPerKg)}</span>
                </div>
              )}
              {operation.animalsPerKg && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Peso medio:</span>
                  <span className="font-medium">
                    {formatNumberWithCommas(1000000 / operation.animalsPerKg)} mg
                  </span>
                </div>
              )}
              {operation.animalCount && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Numero animali:</span>
                  <span className="font-medium">{formatNumberWithCommas(operation.animalCount)}</span>
                </div>
              )}
              {operation.totalWeight && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Peso totale:</span>
                  <span className="font-medium">{formatNumberWithCommas(operation.totalWeight)} g</span>
                </div>
              )}
              {size && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Taglia:</span>
                  <span className="font-medium">{size.code} - {size.name}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              <div className="flex items-center">
                <Package className="h-4 w-4 mr-2" />
                Informazioni lotto
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lot ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Lotto:</span>
                    <Link href={`/lots/${lot.id}`}>
                      <span className="font-medium text-primary hover:underline cursor-pointer">
                        #{lot.id}
                      </span>
                    </Link>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Fornitore:</span>
                    <span className="font-medium">{lot.supplier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Data arrivo:</span>
                    <span className="font-medium">{formatDate(lot.arrivalDate)}</span>
                  </div>
                  {lot.quality && (
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Qualità:</span>
                      <span className="font-medium">{lot.quality}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  <p>Nessun lotto associato</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Notes section */}
      {operation.notes && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Note
            </CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap">
            {operation.notes}
          </CardContent>
        </Card>
      )}
      
      {/* Actions */}
      <div className="flex justify-end mt-6 space-x-2">
        <Link href={`/operations/edit/${operation.id}`}>
          <Button variant="outline">
            Modifica operazione
          </Button>
        </Link>
        {cycle && (
          <Link href={`/cycles/${cycle.id}`}>
            <Button>
              Vai al ciclo
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}