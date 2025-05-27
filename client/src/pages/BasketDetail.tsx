import { useLocation, useRouter } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Calendar, Fish, Weight, Ruler, Activity } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function BasketDetail() {
  const navigate = useRouter()[1];
  const [location] = useLocation();
  const basketId = parseInt(location.split('/').pop() || '0');

  const { data: basket, isLoading, error } = useQuery({
    queryKey: ['/api/baskets', basketId],
    queryFn: () => fetch(`/api/baskets/${basketId}`).then(res => {
      if (!res.ok) throw new Error('Cestello non trovato');
      return res.json();
    }),
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !basket) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Cestello non trovato</h2>
          <p className="text-gray-600 mb-6">Il cestello richiesto non esiste o non è accessibile.</p>
          <Button onClick={() => navigate('/baskets')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna ai cestelli
          </Button>
        </div>
      </div>
    );
  }

  const getStateColor = (state: string) => {
    switch (state) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'available': return 'bg-blue-100 text-blue-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStateLabel = (state: string) => {
    switch (state) {
      case 'active': return 'Attivo';
      case 'available': return 'Disponibile';
      case 'maintenance': return 'Manutenzione';
      default: return state;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/baskets')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Indietro
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Cestello #{basket.physicalNumber}</h1>
            <p className="text-gray-600">{basket.flupsyName}</p>
          </div>
        </div>
        <Badge className={getStateColor(basket.state)}>
          {getStateLabel(basket.state)}
        </Badge>
      </div>

      {/* Informazioni principali */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Posizione */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posizione</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {basket.currentPosition ? `${basket.currentPosition.row}-${basket.currentPosition.position}` : 'Non assegnata'}
            </div>
            <p className="text-xs text-muted-foreground">
              {basket.flupsyName}
            </p>
          </CardContent>
        </Card>

        {/* Ciclo corrente */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ciclo</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {basket.currentCycle ? `#${basket.currentCycle.id}` : 'Nessun ciclo'}
            </div>
            <p className="text-xs text-muted-foreground">
              {basket.currentCycle ? `Iniziato ${formatDate(basket.currentCycle.startDate)}` : 'Cestello disponibile'}
            </p>
          </CardContent>
        </Card>

        {/* Ultima operazione */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ultima operazione</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {basket.lastOperation ? basket.lastOperation.type : 'Nessuna'}
            </div>
            <p className="text-xs text-muted-foreground">
              {basket.lastOperation ? formatDate(basket.lastOperation.date) : 'Mai utilizzato'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Dettagli operativi */}
      {basket.lastOperation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Fish className="h-5 w-5 mr-2" />
              Dati operativi
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {basket.lastOperation.animalCount && (
              <div>
                <p className="text-sm text-muted-foreground">Numero animali</p>
                <p className="text-lg font-semibold">{basket.lastOperation.animalCount.toLocaleString()}</p>
              </div>
            )}
            {basket.lastOperation.totalWeight && (
              <div>
                <p className="text-sm text-muted-foreground">Peso totale</p>
                <p className="text-lg font-semibold">{formatWeight(basket.lastOperation.totalWeight)}</p>
              </div>
            )}
            {basket.lastOperation.averageWeight && (
              <div>
                <p className="text-sm text-muted-foreground">Peso medio</p>
                <p className="text-lg font-semibold">{basket.lastOperation.averageWeight.toFixed(2)} g</p>
              </div>
            )}
            {basket.lastOperation.animalsPerKg && (
              <div>
                <p className="text-sm text-muted-foreground">Animali/kg</p>
                <p className="text-lg font-semibold">{basket.lastOperation.animalsPerKg.toLocaleString()}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Azioni */}
      <div className="flex flex-wrap gap-4">
        {basket.currentCycle && (
          <Button onClick={() => navigate(`/cycles/${basket.currentCycle.id}`)}>
            Vedi ciclo completo
          </Button>
        )}
        <Button variant="outline" onClick={() => navigate(`/operations?basketId=${basket.id}`)}>
          Vedi operazioni
        </Button>
        {basket.state === 'available' && (
          <Button variant="outline" onClick={() => navigate(`/operations/new?basketId=${basket.id}`)}>
            Nuova operazione
          </Button>
        )}
      </div>
    </div>
  );
}