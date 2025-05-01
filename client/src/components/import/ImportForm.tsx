import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Alert, 
  AlertDescription, 
  AlertTitle 
} from "@/components/ui/alert";
import { AlertCircle, AlertTriangle, CheckCircle, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

type ImportAnalysis = {
  totalBaskets: number;
  sourceName: string;
  lotCount: number;
  importDate: string;
};

type ImportState = "idle" | "uploading" | "analyzing" | "reviewed" | "importing" | "completed" | "error";

export default function ImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [importState, setImportState] = useState<ImportState>("idle");
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<any | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setImportState("idle");
      setFilePath(null);
      setAnalysis(null);
      setError(null);
      setImportResult(null);
    }
  };
  
  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "Nessun file selezionato",
        description: "Seleziona un file da importare",
        variant: "destructive"
      });
      return;
    }
    
    setImportState("uploading");
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      // Carica il file
      const response = await fetch("/api/import/upload", {
        method: "POST",
        body: formData,
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || "Errore durante il caricamento del file");
      }
      
      setFilePath(data.filePath);
      setImportState("analyzing");
      
      // Effettua l'analisi del file
      await analyzeFile(data.filePath);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Errore sconosciuto durante il caricamento del file";
      setError(errorMessage);
      setImportState("error");
      
      toast({
        title: "Errore di caricamento",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };
  
  const analyzeFile = async (path: string) => {
    try {
      // Analizza il file caricato
      const response = await apiRequest("POST", "/api/import/analyze", { filePath: path });
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || "Errore durante l'analisi del file");
      }
      
      setAnalysis(data.analysis);
      setImportState("reviewed");
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Errore sconosciuto durante l'analisi del file";
      setError(errorMessage);
      setImportState("error");
      
      toast({
        title: "Errore di analisi",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };
  
  const executeImport = async () => {
    if (!filePath) return;
    
    setImportState("importing");
    
    try {
      // Esegui l'importazione
      const response = await apiRequest("POST", "/api/import/execute", {
        filePath,
        confirm: true
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || "Errore durante l'importazione");
      }
      
      setImportResult(data);
      setImportState("completed");
      
      toast({
        title: "Importazione completata",
        description: `Importazione completata con successo. ID Backup: ${data.backupId}`,
        variant: "default"
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Errore sconosciuto durante l'importazione";
      setError(errorMessage);
      setImportState("error");
      
      toast({
        title: "Errore di importazione",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };
  
  const resetForm = () => {
    setFile(null);
    setFilePath(null);
    setImportState("idle");
    setAnalysis(null);
    setError(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Importazione Dati</CardTitle>
        <CardDescription>
          Importa dati di cestelli e lotti da file JSON
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {importState === "error" && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Errore</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {importState === "completed" && (
          <Alert className="mb-4 bg-green-50 border-green-500 text-green-700">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle>Importazione completata</AlertTitle>
            <AlertDescription>
              L'importazione è stata completata con successo.
              {importResult?.details && (
                <div className="mt-2">
                  <p>Cestelli elaborati: {importResult.details.processedBaskets}</p>
                  <p>Cestelli saltati: {importResult.details.skippedBaskets}</p>
                  <p>Lotti creati: {importResult.details.createdLots}</p>
                  <p>Operazioni create: {importResult.details.createdOperations}</p>
                  {importResult.details.note && (
                    <p className="mt-2 italic text-sm">{importResult.details.note}</p>
                  )}
                </div>
              )}
              <p className="mt-2 text-sm">
                È stato creato un backup del database (ID: {importResult?.backupId}).
              </p>
            </AlertDescription>
          </Alert>
        )}
        
        {(importState === "idle" || importState === "error" || importState === "completed") && (
          <div className="space-y-4">
            <div>
              <p className="text-sm mb-2">Seleziona un file JSON da importare:</p>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              {file && (
                <p className="text-sm mt-2">
                  File selezionato: {file.name} ({Math.round(file.size / 1024)} KB)
                </p>
              )}
            </div>
          </div>
        )}
        
        {importState === "uploading" && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4">Caricamento del file in corso...</p>
          </div>
        )}
        
        {importState === "analyzing" && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4">Analisi del file in corso...</p>
          </div>
        )}
        
        {importState === "importing" && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4">Importazione in corso...</p>
            <p className="text-sm text-muted-foreground mt-2">
              Attendere, potrebbe volerci qualche minuto...
            </p>
          </div>
        )}
        
        {importState === "reviewed" && analysis && (
          <div className="space-y-4 p-4 border rounded-md bg-muted/30">
            <h3 className="text-lg font-medium">Analisi importazione</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Provenienza:</p>
                <p className="font-medium">{analysis.sourceName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data importazione:</p>
                <p className="font-medium">{analysis.importDate}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cestelli totali:</p>
                <p className="font-medium">{analysis.totalBaskets}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lotti:</p>
                <p className="font-medium">{analysis.lotCount}</p>
              </div>
            </div>
            
            <Alert className="bg-amber-50 border-amber-300 text-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertTitle>Verifica prima di procedere</AlertTitle>
              <AlertDescription>
                Controlla attentamente i dati di importazione. L'importazione modificherà il database in modo permanente.
                Un backup del database verrà creato automaticamente prima dell'importazione.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {importState === "idle" && (
          <Button onClick={handleUpload} disabled={!file}>
            <Upload className="h-4 w-4 mr-2" />
            Carica e analizza
          </Button>
        )}
        
        {importState === "reviewed" && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetForm}>
              Annulla
            </Button>
            <Button onClick={executeImport}>
              Procedi con l'importazione
            </Button>
          </div>
        )}
        
        {(importState === "error" || importState === "completed") && (
          <Button onClick={resetForm}>
            Ricomincia
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}