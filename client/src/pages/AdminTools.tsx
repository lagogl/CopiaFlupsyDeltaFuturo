import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Check } from "lucide-react";
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function AdminTools() {
  const [table, setTable] = useState('lots');
  const [startValue, setStartValue] = useState('1');
  const [adminToken, setAdminToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [sequences, setSequences] = useState<any[]>([]);
  const [showSequences, setShowSequences] = useState(false);
  
  const { toast } = useToast();
  
  const resetSequence = async () => {
    if (!window.confirm(`Sei sicuro di voler resettare la sequenza ID della tabella ${table}? Questa operazione non può essere annullata.`)) {
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const parsedStartValue = parseInt(startValue, 10);
      if (isNaN(parsedStartValue) || parsedStartValue < 1) {
        throw new Error('Il valore iniziale deve essere un numero intero positivo.');
      }
      
      const response = await apiRequest({
        url: '/api/admin/reset-sequence',
        method: 'POST',
        body: {
          table,
          startValue: parsedStartValue,
          adminToken
        }
      });
      
      setResult(response);
      
      toast({
        title: 'Sequenza resettata',
        description: `La sequenza ID per la tabella ${table} è stata resettata con successo.`,
        variant: 'default',
      });
      
    } catch (err: any) {
      console.error('Errore durante il reset della sequenza:', err);
      setError(err.message || 'Si è verificato un errore durante il reset della sequenza.');
      
      toast({
        title: 'Errore',
        description: err.message || 'Si è verificato un errore durante il reset della sequenza.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  const getSequences = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest(`/api/admin/sequences?adminToken=${encodeURIComponent(adminToken)}`);
      
      if (response.success) {
        setSequences(response.sequences);
        setShowSequences(true);
      } else {
        throw new Error(response.message || 'Errore sconosciuto');
      }
    } catch (err: any) {
      console.error('Errore durante il recupero delle sequenze:', err);
      setError(err.message || 'Si è verificato un errore durante il recupero delle sequenze.');
      
      toast({
        title: 'Errore',
        description: err.message || 'Si è verificato un errore durante il recupero delle sequenze.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Strumenti di Amministrazione</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Reset Sequenza ID</CardTitle>
          <CardDescription>
            Questo strumento permette di resettare il contatore automatico dell'ID di una tabella.
            Utilizza questa funzione con cautela poiché potrebbe causare conflitti se esistono già record con gli ID che verranno assegnati.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="grid gap-3">
              <Label htmlFor="admin-token">Token di Amministrazione</Label>
              <Input
                id="admin-token"
                type="password"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                placeholder="Inserisci il token di amministrazione"
              />
              <p className="text-sm text-gray-500">
                Richiesto per l'autenticazione. Contatta l'amministratore di sistema se non conosci il token.
              </p>
            </div>
            
            <div className="grid gap-3">
              <Label htmlFor="table-select">Tabella</Label>
              <Select value={table} onValueChange={setTable}>
                <SelectTrigger id="table-select">
                  <SelectValue placeholder="Seleziona una tabella" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lots">Lotti (lots)</SelectItem>
                  <SelectItem value="baskets">Cestelli (baskets)</SelectItem>
                  <SelectItem value="operations">Operazioni (operations)</SelectItem>
                  <SelectItem value="cycles">Cicli (cycles)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-3">
              <Label htmlFor="start-value">Valore Iniziale</Label>
              <Input
                id="start-value"
                type="number"
                min="1"
                value={startValue}
                onChange={(e) => setStartValue(e.target.value)}
                placeholder="Valore da cui iniziare (es. 1)"
              />
              <p className="text-sm text-gray-500">
                Il prossimo ID assegnato sarà questo numero. Assicurati che non esista già un record con questo ID.
              </p>
            </div>
            
            <div className="flex gap-3">
              <Button 
                onClick={resetSequence} 
                disabled={loading || !adminToken}
                className="w-full"
              >
                {loading ? 'Elaborazione...' : 'Reset Sequenza ID'}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={getSequences} 
                disabled={loading || !adminToken}
                className="w-full"
              >
                Mostra Sequenze Attuali
              </Button>
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Errore</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {result && result.success && (
              <Alert variant="default" className="bg-green-50 border-green-200">
                <Check className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-700">Operazione Completata</AlertTitle>
                <AlertDescription className="text-green-600">
                  {result.message}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
      
      {showSequences && sequences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Stato Corrente Sequenze</CardTitle>
            <CardDescription>
              Ecco lo stato attuale dei contatori ID per le tabelle principali.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="p-2 text-left">Tabella</th>
                    <th className="p-2 text-left">Nome Sequenza</th>
                    <th className="p-2 text-left">Ultimo Valore</th>
                    <th className="p-2 text-left">Prossimo ID</th>
                  </tr>
                </thead>
                <tbody>
                  {sequences.map((seq, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-muted/50' : ''}>
                      <td className="p-2 border">{seq.table}</td>
                      <td className="p-2 border font-mono text-xs">{seq.sequenceName || 'N/A'}</td>
                      <td className="p-2 border text-right">{seq.lastValue || 'N/A'}</td>
                      <td className="p-2 border text-right font-medium">{seq.nextValue || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}