import { useState, useRef, useEffect } from 'react';
import { X, Move, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

interface DraggableCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: {
    sampleWeight: number;
    sampleCount: number;
    totalWeight: number;
    deadCount: number;
    animalCount: number;
    animalsPerKg: number;
    mortalityRate: number;
    position: number;
  }) => void;
  initialData?: {
    sampleWeight?: number;
    sampleCount?: number;
    totalWeight?: number;
    deadCount?: number;
    animalsPerKg?: number;
    position?: number;
  };
}

export default function DraggableCalculator({ 
  isOpen, 
  onClose, 
  onConfirm, 
  initialData = {} 
}: DraggableCalculatorProps) {
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Dati del calcolatore
  const [sampleWeight, setSampleWeight] = useState(initialData.sampleWeight || 1);
  const [sampleCount, setSampleCount] = useState(initialData.sampleCount || 100);
  const [totalWeight, setTotalWeight] = useState(initialData.totalWeight || 10);
  const [deadCount, setDeadCount] = useState(initialData.deadCount || 0);
  const [animalsPerKg, setAnimalsPerKg] = useState(initialData.animalsPerKg || 100000);
  const [basketPosition, setBasketPosition] = useState(initialData.position || 1);
  
  const calculatorRef = useRef<HTMLDivElement>(null);
  
  // Calcoli automatici
  const totalSample = sampleCount + deadCount;
  const mortalityRate = totalSample > 0 ? Math.round((deadCount / totalSample) * 100) : 0;
  const mortalityFactor = 1 - (mortalityRate / 100);
  
  // Calcola animali per kg dal campione (peso campione in grammi / numero animali vivi * 1000)
  const calculatedAnimalsPerKg = sampleWeight > 0 && sampleCount > 0 
    ? Math.round((sampleCount / sampleWeight) * 1000) 
    : animalsPerKg;
  
  const theoreticalAnimals = totalWeight * calculatedAnimalsPerKg;
  const animalCount = Math.round(theoreticalAnimals * mortalityFactor);
  
  // Gestione drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };
  
  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = Math.max(0, Math.min(window.innerWidth - 300, e.clientX - dragStart.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragStart.y));
      setPosition({ x: newX, y: newY });
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);
  
  const handleConfirm = () => {
    onConfirm({
      sampleWeight,
      sampleCount,
      totalWeight,
      deadCount,
      animalCount,
      animalsPerKg,
      mortalityRate,
      position: basketPosition
    });
  };
  
  if (!isOpen) return null;
  
  return (
    <div
      ref={calculatorRef}
      className="fixed z-50 select-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: isMinimized ? '200px' : '280px'
      }}
      onMouseDown={handleMouseDown}
    >
      <Card className="shadow-lg border-2 border-blue-200 bg-white">
        {/* Header draggable */}
        <div className="drag-handle flex items-center justify-between p-2 bg-blue-50 border-b cursor-move hover:bg-blue-100 transition-colors">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Calcolatore</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-blue-200"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              <Move className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-red-200"
              onClick={onClose}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        {!isMinimized && (
          <div className="p-3 space-y-3">
            {/* Grid compatto 2x3 */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <Label className="text-xs text-green-700">Peso Campione (g)</Label>
                <Input
                  type="number"
                  value={sampleWeight}
                  onChange={(e) => setSampleWeight(Number(e.target.value))}
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs text-blue-700">N° Animali Vivi</Label>
                <Input
                  type="number"
                  value={sampleCount}
                  onChange={(e) => setSampleCount(Number(e.target.value))}
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs text-orange-700">Peso Totale (kg)</Label>
                <Input
                  type="number"
                  value={totalWeight}
                  onChange={(e) => setTotalWeight(Number(e.target.value))}
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs text-red-700">Animali Morti</Label>
                <Input
                  type="number"
                  value={deadCount}
                  onChange={(e) => setDeadCount(Number(e.target.value))}
                  className="h-7 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs text-purple-700">Animali/Kg</Label>
                <div className="h-7 px-2 py-1 border rounded text-xs bg-gray-50 text-gray-700 flex items-center">
                  {calculatedAnimalsPerKg.toLocaleString('it-IT')}
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-700">Posizione</Label>
                <div className="h-7 px-2 py-1 border rounded text-xs bg-gray-50 text-gray-700 flex items-center">
                  {basketPosition}
                </div>
              </div>
            </div>
            
            {/* Risultati compatti */}
            <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-blue-600">Totale Animali:</span>
                <span className="font-medium">{animalCount.toLocaleString('it-IT')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-600">Mortalità:</span>
                <span className="font-medium">{mortalityRate}%</span>
              </div>
            </div>
            
            {/* Bottoni compatti */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onClose}
                className="flex-1 h-7 text-xs"
              >
                Annulla
              </Button>
              <Button 
                size="sm" 
                onClick={handleConfirm}
                className="flex-1 h-7 text-xs"
              >
                Conferma
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}