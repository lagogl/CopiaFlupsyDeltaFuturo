import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import DraggableFlupsyVisualizer from '@/components/dashboard/DraggableFlupsyVisualizer';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

export default function FlupsyDragDrop() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link to="/flupsys">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Gestione Posizioni FLUPSY</h1>
            <p className="text-gray-500">Trascina e rilascia i cestelli per gestire le posizioni</p>
          </div>
        </div>
      </div>

      {/* Utilizziamo DndProvider per abilitare drag and drop */}
      <DndProvider backend={HTML5Backend}>
        <DraggableFlupsyVisualizer />
      </DndProvider>

      <div className="flex justify-end">
        <Button asChild>
          <Link to="/flupsys">
            Torna all'elenco FLUPSY
          </Link>
        </Button>
      </div>
    </div>
  );
}