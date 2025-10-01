import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, Copy, AlertCircle, FileText } from "lucide-react";

interface BasketSupply {
  basketId: number;
  basketPhysicalNumber: number;
  operationId: number;
  sizeCode: string;
  sizeName: string;
  totalAnimals: number;
  totalWeightKg: number;
  animalsPerKg: number;
}

interface BagConfiguration {
  sizeCode: string;
  animalCount: number;
  originalWeight: number;
  weightLoss: number;
  wastePercentage: number;
  originalAnimalsPerKg: number;
  notes?: string;
  allocations: Array<{
    sourceOperationId: number;
    sourceBasketId: number;
    allocatedAnimals: number;
    allocatedWeight: number;
    sourceAnimalsPerKg: number;
    sourceSizeCode: string;
  }>;
}

interface Props {
  baseSupplyByBasket: Record<number, BasketSupply>;
  bagConfigs: BagConfiguration[];
  remainingByBasket: Record<number, number>;
  allocatedByBasket: Record<number, number>;
  onAddBag: (basketId: number, animalCount: number, netWeightKg: number, identifier?: string, section?: string) => void;
  onRemoveBag: (index: number) => void;
  onCloneBag: (index: number) => void;
  onUpdateBag: (index: number, updates: Partial<BagConfiguration>) => void;
  onSave: () => void;
  onGeneratePDF: () => void;
  isSaving: boolean;
  currentSaleId: number | null;
}

export default function AdvancedSalesConfigTab({
  baseSupplyByBasket,
  bagConfigs,
  remainingByBasket,
  allocatedByBasket,
  onAddBag,
  onRemoveBag,
  onCloneBag,
  onUpdateBag,
  onSave,
  onGeneratePDF,
  isSaving,
  currentSaleId
}: Props) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedBasketId, setSelectedBasketId] = useState<number | null>(null);
  const [newBagAnimals, setNewBagAnimals] = useState("");
  const [newBagWeightKg, setNewBagWeightKg] = useState("");
  const [newBagIdentifier, setNewBagIdentifier] = useState("");
  const [newBagSection, setNewBagSection] = useState("");

  const basketsArray = Object.values(baseSupplyByBasket);
  const hasValidationErrors = Object.values(remainingByBasket).some(r => r < 0);

  const handleAddBagSubmit = () => {
    if (!selectedBasketId || !newBagAnimals || !newBagWeightKg) return;
    
    onAddBag(
      selectedBasketId,
      parseInt(newBagAnimals),
      parseFloat(newBagWeightKg),
      newBagIdentifier,
      newBagSection
    );
    
    // Reset form
    setShowAddDialog(false);
    setSelectedBasketId(null);
    setNewBagAnimals("");
    setNewBagWeightKg("");
    setNewBagIdentifier("");
    setNewBagSection("");
  };

  const calculateAnimalsPerKg = (bag: BagConfiguration): number => {
    const netWeightGrams = bag.originalWeight - bag.weightLoss;
    return bag.animalCount / (netWeightGrams / 1000);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Dettagli Sacchi</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Inserisci i dettagli per ogni sacco
            </p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-add-bag">
                <Plus className="h-4 w-4" />
                Aggiungi Sacco
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Aggiungi Nuovo Sacco</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Cestello Sorgente</Label>
                  <Select
                    value={selectedBasketId?.toString()}
                    onValueChange={(v) => setSelectedBasketId(parseInt(v))}
                  >
                    <SelectTrigger data-testid="select-basket">
                      <SelectValue placeholder="Seleziona cestello" />
                    </SelectTrigger>
                    <SelectContent>
                      {basketsArray.map((supply) => (
                        <SelectItem 
                          key={supply.basketId} 
                          value={supply.basketId.toString()}
                          data-testid={`basket-option-${supply.basketId}`}
                        >
                          #{supply.basketPhysicalNumber} - {supply.sizeCode} 
                          ({(remainingByBasket[supply.basketId] || 0).toLocaleString()} disponibili)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Identificativo</Label>
                  <Input
                    placeholder="A, B, C..."
                    value={newBagIdentifier}
                    onChange={(e) => setNewBagIdentifier(e.target.value)}
                    data-testid="input-identifier"
                  />
                </div>
                <div>
                  <Label>Sezione</Label>
                  <Select value={newBagSection} onValueChange={setNewBagSection}>
                    <SelectTrigger data-testid="select-section">
                      <SelectValue placeholder="Seleziona sezione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">-</SelectItem>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="C">C</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Animali Calcolati</Label>
                  <Input
                    type="number"
                    placeholder="Es. 50000"
                    value={newBagAnimals}
                    onChange={(e) => setNewBagAnimals(e.target.value)}
                    data-testid="input-animals"
                  />
                </div>
                <div>
                  <Label>Peso Netto (kg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Es. 25.00"
                    value={newBagWeightKg}
                    onChange={(e) => setNewBagWeightKg(e.target.value)}
                    data-testid="input-weight"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleAddBagSubmit}
                  disabled={!selectedBasketId || !newBagAnimals || !newBagWeightKg}
                  data-testid="button-submit-bag"
                >
                  Aggiungi
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Validation Errors */}
        {hasValidationErrors && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Attenzione: alcuni cestelli hanno più animali allocati di quelli disponibili!
              Rimuovi o modifica i sacchi per procedere.
            </AlertDescription>
          </Alert>
        )}

        {/* Cestelli Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {basketsArray.map((supply) => {
            const allocated = allocatedByBasket[supply.basketId] || 0;
            const remaining = remainingByBasket[supply.basketId] || 0;
            const isOverAllocated = remaining < 0;
            
            return (
              <Card key={supply.basketId} className={isOverAllocated ? "border-red-500" : ""}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    Cestello #{supply.basketPhysicalNumber}
                    <Badge variant="outline">{supply.sizeCode}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Disponibili:</span>
                    <span className="font-medium">{supply.totalAnimals.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Allocati:</span>
                    <span className="font-medium">{allocated.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rimanenti:</span>
                    <span className={`font-medium ${isOverAllocated ? 'text-red-500' : 'text-green-600'}`}>
                      {remaining.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Bags Table */}
        {bagConfigs.length > 0 ? (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sacco #</TableHead>
                  <TableHead>Identificativo</TableHead>
                  <TableHead>Sezione</TableHead>
                  <TableHead>Peso Netto (kg)</TableHead>
                  <TableHead>Scarto (%)</TableHead>
                  <TableHead>Animali/kg</TableHead>
                  <TableHead>Animali Calcolati</TableHead>
                  <TableHead>Taglia</TableHead>
                  <TableHead>Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bagConfigs.map((bag, index) => {
                  const netWeightKg = (bag.originalWeight - bag.weightLoss) / 1000;
                  const animalsPerKg = calculateAnimalsPerKg(bag);
                  const basketId = bag.allocations[0].sourceBasketId;
                  const supply = baseSupplyByBasket[basketId];
                  
                  // Parse notes for identifier/section
                  const noteParts = (bag.notes || "").split(" - ");
                  const identifier = noteParts[0] || "-";
                  const section = noteParts[1] || "-";
                  
                  return (
                    <TableRow key={index} data-testid={`bag-row-${index}`}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <Input
                          value={identifier}
                          onChange={(e) => {
                            const newNotes = [e.target.value, section].filter(Boolean).join(" - ");
                            onUpdateBag(index, { notes: newNotes });
                          }}
                          className="w-20"
                          data-testid={`input-identifier-${index}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={section}
                          onValueChange={(v) => {
                            const newNotes = [identifier, v].filter(Boolean).join(" - ");
                            onUpdateBag(index, { notes: newNotes });
                          }}
                        >
                          <SelectTrigger className="w-20" data-testid={`select-section-${index}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="-">-</SelectItem>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={netWeightKg.toFixed(2)}
                          onChange={(e) => {
                            const newNetWeightGrams = parseFloat(e.target.value) * 1000;
                            onUpdateBag(index, { originalWeight: newNetWeightGrams });
                          }}
                          className="w-24"
                          data-testid={`input-weight-${index}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={bag.wastePercentage}
                          onChange={(e) => {
                            onUpdateBag(index, { wastePercentage: parseFloat(e.target.value) || 0 });
                          }}
                          className="w-20"
                          data-testid={`input-waste-${index}`}
                        />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{animalsPerKg.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={bag.animalCount}
                          onChange={(e) => {
                            const newCount = parseInt(e.target.value) || 0;
                            onUpdateBag(index, { 
                              animalCount: newCount,
                              allocations: [{
                                ...bag.allocations[0],
                                allocatedAnimals: newCount
                              }]
                            });
                          }}
                          className="w-28"
                          data-testid={`input-animals-${index}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{bag.sizeCode}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onCloneBag(index)}
                            data-testid={`button-clone-${index}`}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveBag(index)}
                            data-testid={`button-remove-${index}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Nessun sacco configurato. Clicca "Aggiungi Sacco" per iniziare.
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            onClick={onSave}
            disabled={isSaving || bagConfigs.length === 0 || hasValidationErrors}
            className="flex-1"
            data-testid="button-save-config"
          >
            {isSaving ? "Salvataggio..." : "Salva Configurazione"}
          </Button>
          
          {currentSaleId && bagConfigs.length > 0 && (
            <Button
              onClick={onGeneratePDF}
              variant="outline"
              className="flex-1"
              data-testid="button-generate-pdf"
            >
              <FileText className="h-4 w-4 mr-2" />
              Genera PDF
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
