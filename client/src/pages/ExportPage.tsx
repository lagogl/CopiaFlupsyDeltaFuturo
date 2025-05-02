import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar, 
  Download, 
  FileBadge, 
  FileJson, 
  Info, 
  Settings
} from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';

export default function ExportPage() {
  const [fornitore, setFornitore] = useState('Flupsy Manager');
  const [dataEsportazione, setDataEsportazione] = useState<Date | undefined>(new Date());
  const [showPreview, setShowPreview] = useState(false);
  
  // Recupera l'anteprima dei dati di esportazione
  const { data: previewData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['/api/export/giacenze', fornitore, dataEsportazione?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (fornitore) params.append('fornitore', fornitore);
      if (dataEsportazione) params.append('data', dataEsportazione.toISOString());
      
      const response = await fetch(`/api/export/giacenze?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Errore durante il recupero dei dati di esportazione');
      }
      return response.json();
    },
    enabled: showPreview, // Esegui la query solo quando l'utente richiede l'anteprima
  });
  
  // Funzione per avviare il download del file JSON
  const handleDownload = () => {
    const params = new URLSearchParams();
    if (fornitore) params.append('fornitore', fornitore);
    if (dataEsportazione) params.append('data', dataEsportazione.toISOString());
    params.append('download', 'true');
    
    // Crea il link per il download
    const downloadUrl = `/api/export/giacenze?${params.toString()}`;
    
    // Crea un elemento <a> temporaneo per il download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `giacenze_export_${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: 'Download avviato',
      description: 'Il file JSON delle giacenze è in download',
    });
  };
  
  // Formatta la data per la visualizzazione
  const formatDate = (date?: Date) => {
    if (!date) return '';
    return format(date, 'dd MMMM yyyy', { locale: it });
  };
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Esportazione Giacenze</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Configurazione Esportazione</CardTitle>
              <CardDescription>
                Configura i parametri per l'esportazione delle giacenze nel formato JSON standard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fornitore">Nome Fornitore</Label>
                  <Input 
                    id="fornitore" 
                    value={fornitore} 
                    onChange={(e) => setFornitore(e.target.value)}
                    placeholder="Nome del fornitore per l'esportazione" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Data Esportazione</Label>
                  <DatePicker 
                    date={dataEsportazione} 
                    setDate={setDataEsportazione} 
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground">
                    Data che verrà utilizzata come data_importazione nel file JSON
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowPreview(true);
                  refetch();
                }}
              >
                <FileBadge className="mr-2 h-4 w-4" />
                Anteprima
              </Button>
              <Button onClick={handleDownload}>
                <Download className="mr-2 h-4 w-4" />
                Scarica JSON
              </Button>
            </CardFooter>
          </Card>
          
          {showPreview && (
            <div className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileJson className="mr-2 h-5 w-5" />
                    Anteprima Dati Esportazione
                  </CardTitle>
                  <CardDescription>
                    Verifica i dati prima di scaricare il file JSON
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="py-4 text-center text-muted-foreground">
                      Caricamento anteprima in corso...
                    </div>
                  ) : isError ? (
                    <Alert variant="destructive">
                      <AlertTitle>Errore</AlertTitle>
                      <AlertDescription>
                        {error instanceof Error ? error.message : 'Si è verificato un errore durante il recupero dei dati'}
                      </AlertDescription>
                    </Alert>
                  ) : previewData ? (
                    <div className="overflow-auto">
                      <Tabs defaultValue="preview">
                        <TabsList>
                          <TabsTrigger value="preview">Anteprima</TabsTrigger>
                          <TabsTrigger value="json">JSON Completo</TabsTrigger>
                        </TabsList>
                        <TabsContent value="preview" className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <span className="text-sm font-medium">Data Importazione:</span>
                              <p className="text-sm">{previewData.data_importazione}</p>
                            </div>
                            <div>
                              <span className="text-sm font-medium">Fornitore:</span>
                              <p className="text-sm">{previewData.fornitore}</p>
                            </div>
                          </div>
                          
                          <div>
                            <h3 className="text-sm font-medium mb-2">Giacenze: {previewData.giacenze.length} record</h3>
                            <div className="rounded-md border">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                      Identificativo
                                    </th>
                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                      Taglia
                                    </th>
                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                      Quantità
                                    </th>
                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                      Data Iniziale
                                    </th>
                                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                      Peso (mg)
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {previewData.giacenze.map((giacenza: {
                                    identificativo: string;
                                    taglia: string;
                                    quantita: number;
                                    data_iniziale: string;
                                    mg_vongola: number;
                                  }, index: number) => (
                                    <tr key={index}>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                        {giacenza.identificativo}
                                      </td>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                        {giacenza.taglia}
                                      </td>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                        {giacenza.quantita.toLocaleString('it-IT')}
                                      </td>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                        {giacenza.data_iniziale}
                                      </td>
                                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                        {giacenza.mg_vongola}
                                      </td>
                                    </tr>
                                  ))}
                                  {previewData.giacenze.length === 0 && (
                                    <tr>
                                      <td colSpan={5} className="px-4 py-4 text-center text-sm text-gray-500">
                                        Nessun dato disponibile
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </TabsContent>
                        <TabsContent value="json">
                          <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-96">
                            <pre className="text-xs">{JSON.stringify(previewData, null, 2)}</pre>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  ) : (
                    <div className="py-4 text-center text-muted-foreground">
                      Nessun dato disponibile
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Informazioni</CardTitle>
              <CardDescription>
                Come funziona l'esportazione delle giacenze
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Formato di esportazione</AlertTitle>
                <AlertDescription>
                  Il file JSON esportato segue il formato standard utilizzato dal sistema di importazione giacenze esterne.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Contenuto del file</h3>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>data_importazione</strong>: Data dell'esportazione nel formato YYYY-MM-DD</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>fornitore</strong>: Nome del fornitore specificato</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span><strong>giacenze</strong>: Elenco dei lotti attivi con le relative quantità e taglie</span>
                  </li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Sorgente dei dati</h3>
                <p className="text-sm text-muted-foreground">
                  I dati esportati derivano dai cicli attivi nel sistema, utilizzando le ultime operazioni 
                  di pesatura o misurazione disponibili per ogni cesta.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}