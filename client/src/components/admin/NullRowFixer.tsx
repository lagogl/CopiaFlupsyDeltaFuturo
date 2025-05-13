import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

/**
 * Componente per la correzione dei cestelli con fila (row) null
 */
export function NullRowFixer() {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/baskets/fix-null-rows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        toast({
          title: 'Operazione completata',
          description: data.message,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Errore',
          description: data.message,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Errore di connessione',
        description: 'Non è stato possibile comunicare con il server.',
      });
      console.error('Errore durante la richiesta:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Correzione Cestelli con Fila Null</CardTitle>
        <CardDescription>
          Questo strumento corregge i cestelli che hanno un FLUPSY assegnato ma non hanno una fila (DX/SX) specificata.
          I cestelli verranno assegnati alla fila meno occupata del loro FLUPSY.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Input
                id="password"
                placeholder="Password di amministrazione"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" disabled={isLoading || !password}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Elaborazione...' : 'Correggi Cestelli'}
            </Button>
          </div>
        </form>

        {result && (
          <div className="mt-6">
            <Alert variant={result.success ? "default" : "destructive"}>
              <AlertTitle>{result.success ? 'Operazione completata' : 'Errore'}</AlertTitle>
              <AlertDescription>{result.message}</AlertDescription>
            </Alert>

            {result.success && result.details && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Dettagli operazione:</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline">Processati: {result.details.processed}</Badge>
                  <Badge variant="success" className="bg-green-100 text-green-800 hover:bg-green-200">
                    Corretti: {result.details.success}
                  </Badge>
                  {result.details.failed > 0 && (
                    <Badge variant="destructive">Falliti: {result.details.failed}</Badge>
                  )}
                  {result.details.skipped > 0 && (
                    <Badge variant="secondary">Saltati: {result.details.skipped}</Badge>
                  )}
                </div>
                
                {result.details.fixedBaskets && result.details.fixedBaskets.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-500">ID</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-500">FLUPSY</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-500">Fila</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-500">Posizione</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {result.details.fixedBaskets.map((basket: any) => (
                          <tr key={basket.id}>
                            <td className="px-4 py-2">{basket.id}</td>
                            <td className="px-4 py-2">{basket.flupsyName || `FLUPSY ${basket.flupsyId}`}</td>
                            <td className="px-4 py-2 font-medium">{basket.assignedRow}</td>
                            <td className="px-4 py-2">{basket.position}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-gray-500">
        Questa funzione è accessibile solo agli amministratori di sistema.
      </CardFooter>
    </Card>
  );
}

export default NullRowFixer;