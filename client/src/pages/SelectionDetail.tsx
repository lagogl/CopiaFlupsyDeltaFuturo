import React, { useState } from "react";
import { useLocation, useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageHeading } from "@/components/PageHeading";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/EmptyState";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  ArrowLeft,
  FileText,
  PlusCircle,
  ShoppingCart,
  Package,
  Clipboard,
  AlertCircle,
  ChevronRight,
  MoveRight,
  Edit,
  Hash
} from "lucide-react";

// Definizione dei tipi per i dati della selezione
interface Selection {
  id: number;
  date: string;
  selectionNumber: number;
  purpose: string | null;
  screeningType: string | null;
  status: 'draft' | 'completed' | 'cancelled';
  notes: string | null;
  createdAt: string;
  sourceBaskets: SourceBasket[];
  destinationBaskets: DestinationBasket[];
  basketHistory: BasketHistory[];
  lotReferences: LotReference[];
}

interface SourceBasket {
  id: number;
  selectionId: number;
  basketId: number;
  cycleId: number;
  animalCount: number;
  totalWeight: number;
  animalsPerKg: number;
  sizeId: number | null;
  lotId: number | null;
  physicalNumber: number; // campo joinato dalla tabella baskets
  flupsyId: number | null; // campo joinato dalla tabella baskets
  position: string | null; // campo joinato dalla tabella baskets
}

interface DestinationBasket {
  id: number;
  selectionId: number;
  basketId: number;
  cycleId: number;
  destinationType: 'sold' | 'placed';
  flupsyId?: number;
  position?: string;
  animalCount: number;
  liveAnimals: number;
  totalWeight: number;
  animalsPerKg: number;
  sizeId: number | null;
  deadCount: number | null;
  mortalityRate: number | null;
  sampleWeight: number | null;
  sampleCount: number | null;
  notes: string | null;
  physicalNumber: number; // campo joinato dalla tabella baskets
}

interface BasketHistory {
  id: number;
  selectionId: number;
  sourceBasketId: number;
  sourceCycleId: number;
  destinationBasketId: number;
  destinationCycleId: number;
}

interface LotReference {
  id: number;
  selectionId: number;
  destinationBasketId: number;
  destinationCycleId: number;
  lotId: number;
}

interface Size {
  id: number;
  code: string;
  name: string;
  sizeMm: number | null;
  rangeMin: number | null;
  rangeMax: number | null;
}

export default function SelectionDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Query per recuperare i dettagli della selezione
  const { data: selection, isLoading, error } = useQuery({
    queryKey: ['/api/selections', params.id],
    queryFn: async () => {
      return apiRequest<Selection>(`/api/selections/${params.id}`);
    },
  });
  
  // Query per recuperare le informazioni sulle taglie (per riferimento)
  const { data: sizes } = useQuery({
    queryKey: ['/api/sizes'],
    queryFn: async () => {
      return apiRequest<Size[]>('/api/sizes');
    },
  });
  
  // Funzioni di formattazione
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: it });
  };
  
  // Trova il nome della taglia dato l'ID
  const getSizeName = (sizeId: number | null) => {
    if (!sizeId || !sizes) return "—";
    const size = sizes.find(s => s.id === sizeId);
    return size ? size.name : "—";
  };
  
  // Torna alla lista delle selezioni
  const handleBack = () => {
    navigate('/selection');
  };
  
  // Reindirizza per aggiungere una cesta di origine
  const handleAddSourceBasket = () => {
    navigate(`/selection/${params.id}/add-source`);
  };
  
  // Reindirizza per aggiungere una cesta di destinazione
  const handleAddDestinationBasket = () => {
    navigate(`/selection/${params.id}/add-destination`);
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="w-full flex justify-center my-8">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }
  
  if (error || !selection) {
    return (
      <div className="container mx-auto py-6">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Selezioni", href: "/selection" },
            { label: "Dettaglio", href: "#" },
          ]}
        />
        
        <div className="flex items-center mt-2 mb-6">
          <Button variant="ghost" onClick={handleBack} className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Indietro
          </Button>
          
          <PageHeading
            title="Dettaglio Selezione"
            description="Visualizza e gestisci i dettagli dell'operazione"
            icon={<FileText className="h-8 w-8 text-primary"/>}
          />
        </div>
        
        <EmptyState
          icon={<AlertCircle className="h-10 w-10 text-destructive" />}
          title="Errore di caricamento"
          description="Non è stato possibile caricare i dettagli della selezione. La selezione potrebbe non esistere o si è verificato un errore."
          action={
            <Button variant="outline" onClick={handleBack}>
              Torna all'elenco
            </Button>
          }
        />
      </div>
    );
  }
  
  // Oggetto dati caricato correttamente, procedi con il rendering
  return (
    <div className="container mx-auto py-6">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Selezioni", href: "/selection" },
          { label: `Selezione #${selection.selectionNumber}`, href: "#" },
        ]}
      />
      
      <div className="flex items-center mt-2 mb-6">
        <Button variant="ghost" onClick={handleBack} className="mr-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Indietro
        </Button>
        
        <PageHeading
          title={`Selezione #${selection.selectionNumber}`}
          description={`${formatDate(selection.date)} - ${selection.purpose || 'Nessuno scopo specificato'}`}
          icon={<FileText className="h-8 w-8 text-primary"/>}
        />
      </div>
      
      {/* Header Card con dettagli principali e stato */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center">
            <div className="space-y-2">
              <div className="flex items-center">
                <Hash className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground mr-2">Numero:</span>
                <span className="font-semibold">{selection.selectionNumber}</span>
              </div>
              
              <div className="flex items-center">
                <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground mr-2">Data:</span>
                <span>{formatDate(selection.date)}</span>
              </div>
              
              {selection.screeningType && (
                <div className="flex items-center">
                  <ScreeningIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground mr-2">Vaglio:</span>
                  <span>{selection.screeningType}</span>
                </div>
              )}
            </div>
            
            <div className="mt-4 md:mt-0 space-y-2">
              <div className="flex items-center">
                <span className="text-sm text-muted-foreground mr-2">Stato:</span>
                <Badge variant={
                  selection.status === 'completed' ? 'success' :
                  selection.status === 'draft' ? 'outline' :
                  'destructive'
                }>
                  {selection.status === 'completed' ? 'Completata' :
                   selection.status === 'draft' ? 'Bozza' :
                   'Annullata'}
                </Badge>
              </div>
              
              <div className="flex items-center">
                <span className="text-sm text-muted-foreground mr-2">Ceste origine:</span>
                <span className="font-semibold">{selection.sourceBaskets.length}</span>
              </div>
              
              <div className="flex items-center">
                <span className="text-sm text-muted-foreground mr-2">Ceste destinazione:</span>
                <span className="font-semibold">{selection.destinationBaskets.length}</span>
              </div>
            </div>
          </div>
          
          {selection.notes && (
            <>
              <Separator className="my-4" />
              <div>
                <h4 className="text-sm font-medium mb-2">Note</h4>
                <p className="text-sm text-muted-foreground">{selection.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Tabs per organizzare la visualizzazione */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="overview">Panoramica</TabsTrigger>
          <TabsTrigger value="source">Ceste di Origine</TabsTrigger>
          <TabsTrigger value="destination">Ceste di Destinazione</TabsTrigger>
        </TabsList>
        
        {/* Panoramica */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card Ceste di Origine */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Package className="h-5 w-5 mr-2 text-primary" />
                  Ceste di Origine
                </CardTitle>
                <CardDescription>
                  Ceste da cui provengono gli animali
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {selection.sourceBaskets.length > 0 ? (
                  <div className="space-y-4">
                    {selection.sourceBaskets.map((basket) => (
                      <div key={basket.id} className="border rounded-md p-3 hover:bg-accent/50 cursor-pointer">
                        <div className="flex justify-between items-center">
                          <div className="font-semibold">Cesta #{basket.physicalNumber}</div>
                          <Badge variant="outline">{getSizeName(basket.sizeId)}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {basket.animalCount.toLocaleString()} animali · {(basket.totalWeight / 1000).toFixed(1)} kg
                        </div>
                        <div className="text-sm mt-1">
                          <span className="text-muted-foreground">Animali/kg:</span> {basket.animalsPerKg.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">Nessuna cesta di origine</p>
                    {selection.status === 'draft' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={handleAddSourceBasket}
                      >
                        <PlusCircle className="h-3.5 w-3.5 mr-1" />
                        Aggiungi cesta
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
              
              {selection.status === 'draft' && selection.sourceBaskets.length > 0 && (
                <CardFooter>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={handleAddSourceBasket}
                  >
                    <PlusCircle className="h-3.5 w-3.5 mr-1" />
                    Aggiungi cesta
                  </Button>
                </CardFooter>
              )}
            </Card>
            
            {/* Card Ceste di Destinazione */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <Package className="h-5 w-5 mr-2 text-primary" />
                  Ceste di Destinazione
                </CardTitle>
                <CardDescription>
                  Ceste dove sono stati collocati gli animali
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                {selection.destinationBaskets.length > 0 ? (
                  <div className="space-y-4">
                    {selection.destinationBaskets.map((basket) => (
                      <div key={basket.id} className="border rounded-md p-3 hover:bg-accent/50 cursor-pointer">
                        <div className="flex justify-between items-center">
                          <div className="font-semibold">Cesta #{basket.physicalNumber}</div>
                          <Badge variant={basket.destinationType === 'sold' ? 'destructive' : 'success'}>
                            {basket.destinationType === 'sold' ? 'Venduta' : 'Collocata'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {basket.animalCount.toLocaleString()} animali · {(basket.totalWeight / 1000).toFixed(1)} kg
                        </div>
                        <div className="text-sm mt-1">
                          <span className="text-muted-foreground">Animali/kg:</span> {basket.animalsPerKg.toLocaleString()} · 
                          <span className="text-muted-foreground ml-2">Taglia:</span> {getSizeName(basket.sizeId)}
                        </div>
                        {basket.destinationType === 'placed' && basket.position && (
                          <div className="text-sm mt-1">
                            <span className="text-muted-foreground">Posizione:</span> {basket.position}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">Nessuna cesta di destinazione</p>
                    {selection.status === 'draft' && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={handleAddDestinationBasket}
                      >
                        <PlusCircle className="h-3.5 w-3.5 mr-1" />
                        Aggiungi cesta
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
              
              {selection.status === 'draft' && selection.destinationBaskets.length > 0 && (
                <CardFooter>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={handleAddDestinationBasket}
                  >
                    <PlusCircle className="h-3.5 w-3.5 mr-1" />
                    Aggiungi cesta
                  </Button>
                </CardFooter>
              )}
            </Card>
          </div>
        </TabsContent>
        
        {/* Ceste di Origine (vista dettagliata) */}
        <TabsContent value="source">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2 text-primary" />
                Ceste di Origine
              </CardTitle>
              <CardDescription>
                Dettaglio completo delle ceste di origine utilizzate in questa selezione
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {selection.sourceBaskets.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cesta #</TableHead>
                      <TableHead>Animali</TableHead>
                      <TableHead>Peso (kg)</TableHead>
                      <TableHead>Animali/kg</TableHead>
                      <TableHead>Taglia</TableHead>
                      <TableHead>Posizione</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selection.sourceBaskets.map((basket) => (
                      <TableRow key={basket.id}>
                        <TableCell className="font-medium">{basket.physicalNumber}</TableCell>
                        <TableCell>{basket.animalCount.toLocaleString()}</TableCell>
                        <TableCell>{(basket.totalWeight / 1000).toFixed(2)}</TableCell>
                        <TableCell>{basket.animalsPerKg.toLocaleString()}</TableCell>
                        <TableCell>{getSizeName(basket.sizeId)}</TableCell>
                        <TableCell>{basket.position || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  icon={<Package className="h-8 w-8 text-muted-foreground" />}
                  title="Nessuna cesta di origine"
                  description="Non sono state ancora aggiunte ceste di origine a questa selezione."
                  action={
                    selection.status === 'draft' && (
                      <Button onClick={handleAddSourceBasket}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Aggiungi cesta
                      </Button>
                    )
                  }
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Ceste di Destinazione (vista dettagliata) */}
        <TabsContent value="destination">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2 text-primary" />
                Ceste di Destinazione
              </CardTitle>
              <CardDescription>
                Dettaglio completo delle ceste di destinazione utilizzate in questa selezione
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {selection.destinationBaskets.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cesta #</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Animali</TableHead>
                      <TableHead>Peso (kg)</TableHead>
                      <TableHead>Animali/kg</TableHead>
                      <TableHead>Taglia</TableHead>
                      <TableHead>Posizione</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selection.destinationBaskets.map((basket) => (
                      <TableRow key={basket.id}>
                        <TableCell className="font-medium">{basket.physicalNumber}</TableCell>
                        <TableCell>
                          <Badge variant={basket.destinationType === 'sold' ? 'destructive' : 'success'}>
                            {basket.destinationType === 'sold' ? 'Venduta' : 'Collocata'}
                          </Badge>
                        </TableCell>
                        <TableCell>{basket.animalCount.toLocaleString()}</TableCell>
                        <TableCell>{(basket.totalWeight / 1000).toFixed(2)}</TableCell>
                        <TableCell>{basket.animalsPerKg.toLocaleString()}</TableCell>
                        <TableCell>{getSizeName(basket.sizeId)}</TableCell>
                        <TableCell>
                          {basket.destinationType === 'placed' && basket.position
                            ? basket.position
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  icon={<Package className="h-8 w-8 text-muted-foreground" />}
                  title="Nessuna cesta di destinazione"
                  description="Non sono state ancora aggiunte ceste di destinazione a questa selezione."
                  action={
                    selection.status === 'draft' && (
                      <Button onClick={handleAddDestinationBasket}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Aggiungi cesta
                      </Button>
                    )
                  }
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Pulsanti azione principali */}
      <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Torna all'elenco
        </Button>
        
        {selection.status === 'draft' && (
          <>
            <Button onClick={handleAddSourceBasket}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Aggiungi Cesta Origine
            </Button>
            
            <Button variant="secondary" onClick={handleAddDestinationBasket}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Aggiungi Cesta Destinazione
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// Componente icona per il tipo di vaglio (utilizzato nel dettaglio)
function ScreeningIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9 H21" />
      <path d="M3 15 H21" />
      <path d="M9 3 V21" />
      <path d="M15 3 V21" />
    </svg>
  );
}