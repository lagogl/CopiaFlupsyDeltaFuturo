import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, FileText, Users, Download, Eye, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

interface Customer {
  id: number;
  externalId: number;
  name: string;
  businessName: string;
  vatNumber?: string;
  city?: string;
  phone?: string;
  email?: string;
}

interface Operation {
  operationId: number;
  basketId: number;
  date: string;
  animalCount: number;
  totalWeight: number;
  animalsPerKg: number;
  sizeCode: string;
  basketPhysicalNumber: number;
}

export default function AdvancedSales() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("sales");

  // Form state
  const [newSaleForm, setNewSaleForm] = useState({
    operationIds: [] as number[],
    customerId: null as number | null,
    saleDate: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  });

  // Queries
  const operationsQuery = useQuery({
    queryKey: ['/api/advanced-sales/operations'],
    queryFn: () => apiRequest('/api/advanced-sales/operations?processed=false')
  });

  const customersQuery = useQuery({
    queryKey: ['/api/advanced-sales/customers'],
    queryFn: () => apiRequest('/api/advanced-sales/customers')
  });

  const salesQuery = useQuery({
    queryKey: ['/api/advanced-sales'],
    queryFn: () => apiRequest('/api/advanced-sales')
  });

  // Mutations
  const createSaleMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/advanced-sales', 'POST', data),
    onSuccess: () => {
      toast({ variant: "success", title: "Successo", description: "Vendita creata con successo" });
      setNewSaleForm({
        operationIds: [],
        customerId: null,
        saleDate: format(new Date(), 'yyyy-MM-dd'),
        notes: ''
      });
      queryClient.invalidateQueries({ queryKey: ['/api/advanced-sales'] });
      setActiveTab("sales");
    },
    onError: (error: any) => {
      toast({ 
        title: "Errore", 
        description: error.message || "Errore nella creazione della vendita",
        variant: "destructive" 
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ saleId, status }: { saleId: number; status: string }) =>
      apiRequest(`/api/advanced-sales/${saleId}/status`, 'PATCH', { status }),
    onSuccess: () => {
      toast({ variant: "success", title: "Successo", description: "Stato vendita aggiornato" });
      queryClient.invalidateQueries({ queryKey: ['/api/advanced-sales'] });
    }
  });

  const createNewSale = () => {
    try {
      if (newSaleForm.operationIds.length === 0) {
        toast({ 
          title: "Errore", 
          description: "Seleziona almeno un'operazione",
          variant: "destructive" 
        });
        return;
      }

      if (!newSaleForm.customerId) {
        toast({ 
          title: "Errore", 
          description: "Seleziona un cliente",
          variant: "destructive" 
        });
        return;
      }

      // Controllo sicurezza per dati clienti
      if (!customersQuery.data?.customers || !Array.isArray(customersQuery.data.customers)) {
        toast({ 
          title: "Errore", 
          description: "Dati clienti non disponibili",
          variant: "destructive" 
        });
        return;
      }

      const selectedCustomer = customersQuery.data.customers.find(c => {
        return c && 
               typeof c === 'object' && 
               c.id === newSaleForm.customerId &&
               c.name;
      });

      if (!selectedCustomer) {
        toast({ 
          title: "Errore", 
          description: "Cliente selezionato non valido o dati incompleti",
          variant: "destructive" 
        });
        return;
      }

      const customerData = {
        id: selectedCustomer.id || 0,
        name: selectedCustomer.name || '',
        businessName: selectedCustomer.businessName || selectedCustomer.name || '',
        vatNumber: selectedCustomer.vatNumber || '',
        city: selectedCustomer.city || '',
        phone: selectedCustomer.phone || '',
        email: selectedCustomer.email || ''
      };

      createSaleMutation.mutate({
        operationIds: newSaleForm.operationIds,
        customerData,
        saleDate: newSaleForm.saleDate,
        notes: newSaleForm.notes
      });
    } catch (error) {
      console.error('Errore nella creazione vendita:', error);
      toast({ 
        title: "Errore", 
        description: "Errore imprevisto nella creazione vendita",
        variant: "destructive" 
      });
    }
  };

  const handleGeneratePDF = (saleId: number) => {
    const link = document.createElement('a');
    link.href = `/api/advanced-sales/${saleId}/generate-pdf`;
    link.download = `vendita-${saleId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "PDF", description: "Generazione PDF avviata" });
  };

  const handleUpdateStatus = (saleId: number, status: string) => {
    updateStatusMutation.mutate({ saleId, status });
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestione Vendite Avanzate</h1>
          <p className="text-muted-foreground">
            Sistema di vendite con selezione clienti da database sincronizzato
          </p>
        </div>
        <Button onClick={() => setActiveTab("new-sale")} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          Nuova Vendita
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Vendite
          </TabsTrigger>
          <TabsTrigger value="new-sale" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nuova Vendita
          </TabsTrigger>
        </TabsList>

        {/* Tab Vendite */}
        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Vendite Avanzate</CardTitle>
            </CardHeader>
            <CardContent>
              {salesQuery.isLoading ? (
                <div>Caricamento vendite...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Numero</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Animali</TableHead>
                      <TableHead className="text-right">Peso</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesQuery.data?.sales?.map((sale: any) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">{sale.saleNumber}</TableCell>
                        <TableCell>{sale.customerName}</TableCell>
                        <TableCell>{format(new Date(sale.saleDate), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-right">
                          {sale.totalAnimals?.toLocaleString() || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {sale.totalWeight ? `${sale.totalWeight} kg` : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            sale.status === 'completed' ? 'default' :
                            sale.status === 'confirmed' ? 'secondary' : 'outline'
                          }>
                            {sale.status === 'completed' ? 'Completata' :
                             sale.status === 'confirmed' ? 'Confermata' : 'Bozza'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={() => handleGeneratePDF(sale.id)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              PDF
                            </Button>

                            {sale.status === 'draft' && (
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => handleUpdateStatus(sale.id, 'confirmed')}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Conferma
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Nuova Vendita */}
        <TabsContent value="new-sale">
          <Card>
            <CardHeader>
              <CardTitle>Crea Nuova Vendita</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Selezione Operazioni */}
              <div>
                <Label className="text-base font-semibold flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-blue-600 rounded border-gray-300"
                    checked={operationsQuery.data?.operations?.length > 0 && newSaleForm.operationIds.length === operationsQuery.data?.operations?.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setNewSaleForm(prev => ({
                          ...prev,
                          operationIds: operationsQuery.data?.operations?.filter(op => op && op.operationId).map((op: Operation) => op.operationId) || []
                        }));
                      } else {
                        setNewSaleForm(prev => ({
                          ...prev,
                          operationIds: []
                        }));
                      }
                    }}
                  />
                  Operazioni Disponibili ({operationsQuery.data?.operations?.length || 0})
                </Label>
                <p className="text-sm text-muted-foreground mb-3">
                  {newSaleForm.operationIds.length > 0 
                    ? `${newSaleForm.operationIds.length} operazione/i selezionate`
                    : "Seleziona le operazioni da includere nella vendita"
                  }
                </p>
                <div className="border rounded-lg p-2 max-h-64 overflow-y-auto bg-gray-50">
                  {operationsQuery.isLoading ? (
                    <div>Caricamento operazioni...</div>
                  ) : operationsQuery.data?.operations?.length === 0 ? (
                    <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">
                      <strong>Nessuna operazione disponibile per vendita.</strong><br/>
                      Le operazioni di tipo "vendita" vengono create automaticamente dal sistema quando i prodotti sono pronti per la vendita.
                      Contatta l'amministratore se necessario.
                    </div>
                  ) : (
                    operationsQuery.data?.operations?.map((operation: Operation) => (
                      <div key={operation.operationId} className="flex items-center space-x-3 py-3 border-b border-gray-100 hover:bg-gray-50 rounded px-2">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          checked={newSaleForm.operationIds.includes(operation.operationId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewSaleForm(prev => ({
                                ...prev,
                                operationIds: [...prev.operationIds, operation.operationId]
                              }));
                            } else {
                              setNewSaleForm(prev => ({
                                ...prev,
                                operationIds: prev.operationIds.filter(id => id !== operation.operationId)
                              }));
                            }
                          }}
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">Operazione #{operation.operationId}</div>
                          <div className="text-xs text-gray-600">
                            Cestello #{operation.basketPhysicalNumber} • {operation.animalCount.toLocaleString()} animali • 
                            {operation.totalWeight} kg • {operation.sizeCode}
                          </div>
                          <div className="text-xs text-gray-500">{format(new Date(operation.date), 'dd/MM/yyyy')}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Selezione Cliente */}
              <div>
                <Label htmlFor="cliente">Cliente</Label>
                {customersQuery.isLoading ? (
                  <div className="text-sm text-gray-500">Caricamento clienti...</div>
                ) : customersQuery.isError ? (
                  <div className="text-sm text-red-500">Errore nel caricamento clienti</div>
                ) : (
                  <Select 
                    value={newSaleForm.customerId?.toString() || ""} 
                    onValueChange={(value) => setNewSaleForm(prev => ({ 
                      ...prev, 
                      customerId: parseInt(value) 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customersQuery.data?.customers?.filter(customer => {
                        return customer && 
                               typeof customer === 'object' && 
                               customer.id && 
                               customer.name && 
                               customer.name.trim() !== '';
                      }).map((customer: Customer) => (
                        <SelectItem key={customer.id} value={customer.id.toString()}>
                          <div className="flex flex-col">
                            <span className="font-medium">{customer.name}</span>
                            {customer.city && customer.city.trim() !== '' && (
                              <span className="text-xs text-gray-500">{customer.city}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Dettagli cliente selezionato */}
              {newSaleForm.customerId && (() => {
                try {
                  if (!customersQuery.data?.customers || !Array.isArray(customersQuery.data.customers)) {
                    return <div className="text-sm text-yellow-600">Dati clienti non disponibili</div>;
                  }

                  const selectedCustomer = customersQuery.data.customers.find(c => {
                    return c && 
                           typeof c === 'object' && 
                           c.id === newSaleForm.customerId;
                  });

                  return selectedCustomer ? (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <h4 className="font-medium text-sm mb-2">Dettagli Cliente</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="font-medium">Nome:</span>
                          <div>{selectedCustomer.name || 'Non disponibile'}</div>
                        </div>
                        {selectedCustomer.vatNumber && selectedCustomer.vatNumber.trim() !== '' && (
                          <div>
                            <span className="font-medium">P.IVA:</span>
                            <div>{selectedCustomer.vatNumber}</div>
                          </div>
                        )}
                        {selectedCustomer.city && selectedCustomer.city.trim() !== '' && (
                          <div>
                            <span className="font-medium">Città:</span>
                            <div>{selectedCustomer.city}</div>
                          </div>
                        )}
                        {selectedCustomer.email && selectedCustomer.email !== '.' && selectedCustomer.email.trim() !== '' && (
                          <div>
                            <span className="font-medium">Email:</span>
                            <div>{selectedCustomer.email}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-yellow-600">Cliente selezionato non trovato</div>
                  );
                } catch (error) {
                  console.error('Errore nel rendering dettagli cliente:', error);
                  return <div className="text-sm text-red-600">Errore nel caricamento dettagli cliente</div>;
                }
              })()}

              {/* Data vendita */}
              <div>
                <Label htmlFor="data-vendita">Data Vendita</Label>
                <Input
                  id="data-vendita"
                  type="date"
                  value={newSaleForm.saleDate}
                  onChange={(e) => setNewSaleForm(prev => ({ ...prev, saleDate: e.target.value }))}
                />
              </div>

              {/* Note */}
              <div>
                <Label htmlFor="note">Note</Label>
                <Textarea
                  id="note"
                  placeholder="Note aggiuntive per la vendita"
                  rows={3}
                  value={newSaleForm.notes}
                  onChange={(e) => setNewSaleForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <Button 
                onClick={createNewSale}
                disabled={createSaleMutation.isPending || newSaleForm.operationIds.length === 0 || !newSaleForm.customerId}
                className="w-full"
              >
                {createSaleMutation.isPending ? "Creazione..." : "Crea Vendita"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}