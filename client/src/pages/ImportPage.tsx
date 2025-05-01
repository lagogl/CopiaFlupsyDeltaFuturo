import { Helmet } from "react-helmet";
import MainLayout from "@/layouts/MainLayout";
import ImportForm from "@/components/import/ImportForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUp, HelpCircle, Upload } from "lucide-react";

export default function ImportPage() {
  return (
    <MainLayout>
      <Helmet>
        <title>Importazione Dati | Flupsy Manager</title>
      </Helmet>
      
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Importazione Dati</h1>
            <p className="text-muted-foreground mt-1">
              Importa dati da file esterni nel sistema
            </p>
          </div>
        </div>
        
        <Tabs defaultValue="import" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="import">
              <FileUp className="h-4 w-4 mr-2" />
              Importa
            </TabsTrigger>
            <TabsTrigger value="help">
              <HelpCircle className="h-4 w-4 mr-2" />
              Guida
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="import" className="space-y-4">
            <ImportForm />
          </TabsContent>
          
          <TabsContent value="help">
            <Card>
              <CardHeader>
                <CardTitle>Guida all'importazione</CardTitle>
                <CardDescription>
                  Come preparare e importare i dati nel sistema
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Formati supportati</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Il sistema supporta l'importazione da file nei seguenti formati:
                  </p>
                  <ul className="list-disc ml-6 mt-2 text-sm">
                    <li>JSON - Formato preferito con struttura dati completa</li>
                    <li>CSV - Formato tabellare (sperimentale)</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium">Struttura del file JSON</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Il file JSON deve contenere i seguenti campi principali:
                  </p>
                  <pre className="bg-muted p-4 rounded-md text-xs mt-2 overflow-auto max-h-80">
{`{
  "data_importazione": "2025-05-01",
  "fonte": "Flupsy Manager",
  "totale_ceste": 10,
  "ceste": [
    {
      "numero_cesta": 101,
      "flupsy": "FLUPSY-01",
      "fila": "SX",
      "posizione": 1,
      "lotto_id": "123",
      "data_attivazione": "2025-04-15",
      "taglia_codice": "TP-450",
      "animali_totali": 5000,
      "animali_per_kg": 2200,
      "peso_medio_mg": 450,
      "note": "Cesta di test",
      "id_sistema_esterno": "EXT-001",
      "stato": "attivo"
    }
    // ...altre ceste
  ],
  "lotti": [
    {
      "id": "123",
      "data_creazione": "2025-04-10",
      "fornitore": "Fornitore Test",
      "descrizione": "Lotto di test",
      "origine": "Import"
    }
    // ...altri lotti
  ],
  "istruzioni_importazione": {
    "gestione_lotti": "Crea nuovi lotti se mancanti",
    "gestione_posizioni": "Salta ceste con posizioni occupate",
    "gestione_flupsy": "Crea nuovi FLUPSY se mancanti",
    "gestione_conflitti": "Saltare le ceste con numero già esistente"
  }
}`}
                  </pre>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium">Processo di importazione</h3>
                  <ol className="list-decimal ml-6 mt-2 text-sm space-y-2">
                    <li>
                      <strong>Caricamento</strong>: Seleziona il file e caricalo nel sistema
                    </li>
                    <li>
                      <strong>Analisi</strong>: Il sistema analizza il file e mostra un riepilogo del contenuto
                    </li>
                    <li>
                      <strong>Conferma</strong>: Verifica i dati e conferma l'importazione
                    </li>
                    <li>
                      <strong>Importazione</strong>: Il sistema crea un backup e importa i dati
                    </li>
                    <li>
                      <strong>Completamento</strong>: Visualizza il risultato dell'importazione
                    </li>
                  </ol>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                  <h3 className="text-lg font-medium text-blue-800">Nota importante</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Prima di procedere con l'importazione, il sistema crea automaticamente un backup del database.
                    In caso di problemi, sarà possibile ripristinare il database dalla pagina di gestione dei backup.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}