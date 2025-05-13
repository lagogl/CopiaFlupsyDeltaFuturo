import React, { useState, useEffect } from "react";
import { Check, Filter, X, List, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Flupsy {
  id: number;
  name: string;
  productionCenter: string | null;
  location: string;
  maxPositions: number;
  active: boolean;
}

interface FlupsySelectorProps {
  selectedCenter: string;
  selectedFlupsyIds: number[];
  onSelectionChange: (selectedFlupsyIds: number[]) => void;
}

export default function FlupsySelector({ 
  selectedCenter, 
  selectedFlupsyIds, 
  onSelectionChange 
}: FlupsySelectorProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

  // Recupera i FLUPSY dal server
  const { data: allFlupsys, isLoading } = useQuery<Flupsy[]>({ 
    queryKey: ['/api/flupsys'] 
  });

  // Filtra i FLUPSY in base al centro selezionato
  const centerFlupsys = React.useMemo(() => {
    if (!allFlupsys) return [];
    
    return allFlupsys.filter(flupsy => 
      !selectedCenter || flupsy.productionCenter === selectedCenter
    );
  }, [allFlupsys, selectedCenter]);

  // Filtra i FLUPSY in base al termine di ricerca
  const filteredFlupsys = React.useMemo(() => {
    if (!searchTerm) return centerFlupsys;
    
    const term = searchTerm.toLowerCase();
    return centerFlupsys.filter(flupsy => 
      flupsy.name.toLowerCase().includes(term) || 
      flupsy.location.toLowerCase().includes(term)
    );
  }, [centerFlupsys, searchTerm]);

  // Gestisce la selezione/deselezione di tutti i FLUPSY
  const handleSelectAll = () => {
    if (selectedFlupsyIds.length === centerFlupsys.length) {
      // Se tutti sono già selezionati, deseleziona tutti
      onSelectionChange([]);
    } else {
      // Altrimenti seleziona tutti
      onSelectionChange(centerFlupsys.map(f => f.id));
    }
  };

  // Gestisce la selezione/deselezione di un singolo FLUPSY
  const handleToggleFlupsy = (flupsyId: number) => {
    if (selectedFlupsyIds.includes(flupsyId)) {
      // Se già selezionato, rimuovilo
      onSelectionChange(selectedFlupsyIds.filter(id => id !== flupsyId));
    } else {
      // Altrimenti aggiungilo
      onSelectionChange([...selectedFlupsyIds, flupsyId]);
    }
  };

  // Per sapere se tutti i FLUPSY sono selezionati
  const allSelected = centerFlupsys.length > 0 && 
    selectedFlupsyIds.length === centerFlupsys.length;

  // Per sapere se almeno alcuni FLUPSY sono selezionati
  const someSelected = selectedFlupsyIds.length > 0 && 
    selectedFlupsyIds.length < centerFlupsys.length;

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <List className="h-5 w-5 mr-2" />
            Seleziona FLUPSY
          </CardTitle>
          
          {selectedFlupsyIds.length > 0 && selectedFlupsyIds.length < centerFlupsys.length && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectionChange(centerFlupsys.map(f => f.id))}
              className="h-8"
            >
              <Check className="h-4 w-4 mr-1" /> Seleziona tutti
            </Button>
          )}
          
          {selectedFlupsyIds.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectionChange([])}
              className="h-8 text-destructive"
            >
              <X className="h-4 w-4 mr-1" /> Deseleziona tutti
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center space-x-2 mb-2">
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                {selectedFlupsyIds.length === 0 ? (
                  "Seleziona FLUPSY"
                ) : (
                  <>
                    {selectedFlupsyIds.length} {selectedFlupsyIds.length === 1 ? "FLUPSY" : "FLUPSY"} selezionati
                  </>
                )}
              </Button>
            </PopoverTrigger>
            
            <PopoverContent className="w-80 p-0" align="start">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">Lista FLUPSY</h4>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="select-all"
                      checked={allSelected}
                      onClick={handleSelectAll}
                      className={someSelected ? "opacity-50" : ""}
                    />
                    <Label htmlFor="select-all" className="text-xs cursor-pointer">
                      {allSelected ? "Deseleziona tutti" : "Seleziona tutti"}
                    </Label>
                  </div>
                </div>
                
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cerca FLUPSY..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              
              <ScrollArea className="max-h-[300px]">
                <div className="p-2">
                  {filteredFlupsys.length === 0 ? (
                    <p className="text-sm text-center py-3 text-muted-foreground">
                      {searchTerm ? "Nessun FLUPSY trovato" : "Nessun FLUPSY disponibile"}
                    </p>
                  ) : (
                    filteredFlupsys.map((flupsy) => (
                      <div
                        key={flupsy.id}
                        className={`
                          flex items-center p-2 rounded
                          ${selectedFlupsyIds.includes(flupsy.id) ? 'bg-blue-50 border border-blue-100' : 'hover:bg-gray-50'}
                          cursor-pointer mb-1
                        `}
                        onClick={() => handleToggleFlupsy(flupsy.id)}
                      >
                        <Checkbox 
                          checked={selectedFlupsyIds.includes(flupsy.id)}
                          className="mr-2"
                          onCheckedChange={() => handleToggleFlupsy(flupsy.id)}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{flupsy.name}</span>
                          <span className="text-xs text-muted-foreground">{flupsy.location}</span>
                        </div>
                        {flupsy.maxPositions && (
                          <Badge variant="outline" className="ml-auto">
                            {flupsy.maxPositions} pos.
                          </Badge>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
          
          {/* Badges per i FLUPSY selezionati */}
          <ScrollArea className="w-full max-h-[100px]">
            <div className="flex flex-wrap gap-1 p-1">
              {selectedFlupsyIds.length > 0 && allFlupsys && (
                <>
                  {selectedFlupsyIds.map(id => {
                    const flupsy = allFlupsys.find(f => f.id === id);
                    if (!flupsy) return null;
                    
                    return (
                      <Badge 
                        key={id}
                        variant="secondary"
                        className="px-2 py-1 rounded-md flex items-center mb-1"
                      >
                        {flupsy.name}
                        <X
                          className="h-3 w-3 ml-1 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFlupsy(id);
                          }}
                        />
                      </Badge>
                    );
                  })}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}