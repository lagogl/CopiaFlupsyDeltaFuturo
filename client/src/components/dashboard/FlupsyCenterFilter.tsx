import React, { useState, useEffect } from "react";
import { Check, Filter, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FlupsyCenterFilterProps {
  onFilterChange: (selectedCenter: string, selectedFlupsyIds: number[]) => void;
}

export default function FlupsyCenterFilter({ onFilterChange }: FlupsyCenterFilterProps) {
  // Stato per il centro di produzione selezionato
  const [selectedCenter, setSelectedCenter] = useState<string>("");
  
  // Stato per il filtro di ricerca
  const [searchTerm, setSearchTerm] = useState<string>("");
  
  // Stato per il popover
  const [isOpen, setIsOpen] = useState(false);

  // Recupera i FLUPSY dal server
  const { data: flupsys, isLoading } = useQuery({ 
    queryKey: ['/api/flupsys'] 
  });

  // All'inizializzazione, carica le preferenze salvate
  useEffect(() => {
    const savedCenter = localStorage.getItem("selectedProductionCenter") || "";
    setSelectedCenter(savedCenter);
    
    // Calcola gli ID dei FLUPSY appartenenti al centro salvato
    if (flupsys && savedCenter) {
      const ids = flupsys
        .filter((flupsy: any) => 
          flupsy.productionCenter === savedCenter || !savedCenter
        )
        .map((flupsy: any) => flupsy.id);
      
      onFilterChange(savedCenter, ids);
    } else if (flupsys && !savedCenter) {
      // Se non c'è un centro salvato, seleziona tutti i FLUPSY
      const allIds = flupsys.map((flupsy: any) => flupsy.id);
      onFilterChange("", allIds);
    }
  }, [flupsys]);

  // Ottieni la lista unica dei centri di produzione
  const productionCenters = React.useMemo(() => {
    if (!flupsys) return [];
    
    const centers = new Set<string>();
    flupsys.forEach((flupsy: any) => {
      if (flupsy.productionCenter) {
        centers.add(flupsy.productionCenter);
      }
    });
    
    return Array.from(centers).sort();
  }, [flupsys]);

  // Filtra i centri in base al termine di ricerca
  const filteredCenters = React.useMemo(() => {
    if (!searchTerm) return productionCenters;
    
    return productionCenters.filter(center => 
      center.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [productionCenters, searchTerm]);

  // Gestisce la selezione di un centro
  const handleCenterSelect = (center: string) => {
    setSelectedCenter(center);
    localStorage.setItem("selectedProductionCenter", center);
    setIsOpen(false);
    
    // Calcola gli ID dei FLUPSY del centro selezionato
    if (flupsys) {
      const ids = flupsys
        .filter((flupsy: any) => 
          flupsy.productionCenter === center || !center
        )
        .map((flupsy: any) => flupsy.id);
      
      onFilterChange(center, ids);
    }
  };

  // Gestisce il reset del filtro
  const handleReset = () => {
    setSelectedCenter("");
    localStorage.removeItem("selectedProductionCenter");
    setIsOpen(false);
    
    // Seleziona tutti i FLUPSY
    if (flupsys) {
      const allIds = flupsys.map((flupsy: any) => flupsy.id);
      onFilterChange("", allIds);
    }
  };

  // Conteggio dei FLUPSY per ogni centro
  const getCenterCount = (center: string) => {
    if (!flupsys) return 0;
    
    return flupsys.filter((flupsy: any) => 
      flupsy.productionCenter === center
    ).length;
  };

  // Conteggio totale dei FLUPSY
  const getTotalCount = () => {
    if (!flupsys) return 0;
    return flupsys.length;
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filtra FLUPSY per Centro
          </CardTitle>
          
          {selectedCenter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8"
            >
              <X className="h-4 w-4 mr-1" /> Rimuovi filtro
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center flex-wrap gap-2">
          {/* Filtro "Tutti" */}
          <Badge
            variant={!selectedCenter ? "default" : "outline"}
            className="cursor-pointer hover:bg-primary/90 transition-colors"
            onClick={handleReset}
          >
            Tutti ({getTotalCount()})
          </Badge>
          
          {/* PopOver per selezionare il centro */}
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                {selectedCenter ? (
                  <>
                    Centro: <span className="font-bold ml-1">{selectedCenter}</span>
                  </>
                ) : (
                  <>Seleziona Centro</>
                )}
              </Button>
            </PopoverTrigger>
            
            <PopoverContent className="w-80 p-0" align="start">
              <div className="p-4 border-b">
                <h4 className="font-medium mb-2">Centri di Produzione</h4>
                <Input
                  placeholder="Cerca centro..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-2"
                />
                
                {searchTerm && filteredCenters.length === 0 && (
                  <p className="text-sm text-gray-500 italic">
                    Nessun centro trovato
                  </p>
                )}
              </div>
              
              <div className="max-h-80 overflow-auto p-2">
                {/* Lista dei centri */}
                {filteredCenters.map((center) => (
                  <div
                    key={center}
                    className={`
                      flex items-center justify-between p-2 rounded
                      ${selectedCenter === center ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-100'}
                      cursor-pointer mb-1
                    `}
                    onClick={() => handleCenterSelect(center)}
                  >
                    <div className="flex items-center">
                      <div className="w-5">
                        {selectedCenter === center && (
                          <Check className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <span className="ml-2">{center}</span>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      {getCenterCount(center)}
                    </Badge>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Visualizzazione del centro selezionato */}
          {selectedCenter && (
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
              {selectedCenter} ({getCenterCount(selectedCenter)})
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}