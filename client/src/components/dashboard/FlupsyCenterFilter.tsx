import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Filter } from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// Costanti per i centri di produzione
const PRODUCTION_CENTERS = ['Tutti', 'Ca Pisani', 'Goro'];

interface FlupsyCenterFilterProps {
  onFilterChange: (selectedCenter: string, selectedFlupsyIds: number[]) => void;
}

const FlupsyCenterFilter: React.FC<FlupsyCenterFilterProps> = ({ onFilterChange }) => {
  // Stato locale per il centro selezionato e i FLUPSY selezionati
  const [selectedCenter, setSelectedCenter] = useState<string>(() => 
    localStorage.getItem('selectedProductionCenter') || 'Tutti'
  );
  const [selectedFlupsyIds, setSelectedFlupsyIds] = useState<number[]>(() => {
    const saved = localStorage.getItem('selectedFlupsyIds');
    return saved ? JSON.parse(saved) : [];
  });
  const [showFlupsySelector, setShowFlupsySelector] = useState<boolean>(false);

  // Recupera la lista di FLUPSY dal server
  const { data: flupsys } = useQuery({
    queryKey: ['/api/flupsys'],
  });

  // Filtra i FLUPSY in base al centro di produzione selezionato
  const filteredFlupsys = React.useMemo(() => {
    if (!flupsys || !Array.isArray(flupsys)) return [];
    
    if (selectedCenter === 'Tutti') {
      return flupsys;
    }
    
    return flupsys.filter(flupsy => 
      flupsy.productionCenter === selectedCenter || !flupsy.productionCenter
    );
  }, [flupsys, selectedCenter]);

  // Esegui il callback onFilterChange quando cambia la selezione
  useEffect(() => {
    // Salva le preferenze nel localStorage
    localStorage.setItem('selectedProductionCenter', selectedCenter);
    localStorage.setItem('selectedFlupsyIds', JSON.stringify(selectedFlupsyIds));
    
    // Comunica i filtri al componente padre
    onFilterChange(selectedCenter, selectedFlupsyIds);
  }, [selectedCenter, selectedFlupsyIds, onFilterChange]);

  // Se non ci sono FLUPSY selezionati ma abbiamo FLUPSY filtrati, seleziona tutti i FLUPSY filtrati
  useEffect(() => {
    if (selectedFlupsyIds.length === 0 && filteredFlupsys.length > 0) {
      const filteredIds = filteredFlupsys.map(flupsy => flupsy.id);
      setSelectedFlupsyIds(filteredIds);
    }
  }, [filteredFlupsys, selectedFlupsyIds]);

  // Gestisci il cambio di centro di produzione
  const handleCenterChange = (value: string) => {
    setSelectedCenter(value);
    
    // Aggiorna automaticamente i FLUPSY selezionati quando il centro cambia
    if (flupsys && Array.isArray(flupsys)) {
      if (value === 'Tutti') {
        setSelectedFlupsyIds(flupsys.map(f => f.id));
      } else {
        const filteredIds = flupsys
          .filter(f => f.productionCenter === value || !f.productionCenter)
          .map(f => f.id);
        setSelectedFlupsyIds(filteredIds);
      }
    }
  };

  // Seleziona/deseleziona un singolo FLUPSY
  const toggleFlupsy = (id: number) => {
    if (selectedFlupsyIds.includes(id)) {
      setSelectedFlupsyIds(selectedFlupsyIds.filter(fid => fid !== id));
    } else {
      setSelectedFlupsyIds([...selectedFlupsyIds, id]);
    }
  };

  // Seleziona tutti i FLUPSY filtrati
  const selectAllFlupsys = () => {
    setSelectedFlupsyIds(filteredFlupsys.map(f => f.id));
  };

  // Deseleziona tutti i FLUPSY
  const deselectAllFlupsys = () => {
    setSelectedFlupsyIds([]);
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Select value={selectedCenter} onValueChange={handleCenterChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Seleziona centro" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTION_CENTERS.map(center => (
                    <SelectItem key={center} value={center}>
                      {center}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Badge 
                variant="outline" 
                className="cursor-pointer" 
                onClick={() => setShowFlupsySelector(!showFlupsySelector)}
              >
                <Filter className="h-3 w-3 mr-1" />
                {showFlupsySelector ? "Nascondi dettagli" : "Mostra dettagli"}
              </Badge>
            </div>
            
            <div className="text-sm text-gray-500">
              {selectedFlupsyIds.length} FLUPSY selezionati
            </div>
          </div>
          
          {showFlupsySelector && filteredFlupsys.length > 0 && (
            <>
              <Separator />
              
              <div className="flex flex-wrap gap-2">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-xs px-2 py-0 h-6"
                  onClick={selectAllFlupsys}
                >
                  Seleziona tutti
                </Button>
                
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-xs px-2 py-0 h-6"
                  onClick={deselectAllFlupsys}
                >
                  Deseleziona tutti
                </Button>
                
                <Separator orientation="vertical" className="h-6" />
                
                {filteredFlupsys.map(flupsy => (
                  <Button
                    key={flupsy.id}
                    size="sm"
                    variant="ghost"
                    className={`text-xs px-2 py-0 h-6 ${selectedFlupsyIds.includes(flupsy.id) ? 'bg-primary/10' : ''}`}
                    onClick={() => toggleFlupsy(flupsy.id)}
                  >
                    {flupsy.name}
                  </Button>
                ))}
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FlupsyCenterFilter;