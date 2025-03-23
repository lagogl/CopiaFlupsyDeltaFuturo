import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import OperationsDropZone from './OperationsDropZone';
import { Scale, ListFilter, Microscope, Scissors, ShoppingCart } from 'lucide-react';

export default function OperationsDropZoneContainer() {
  return (
    <DndProvider backend={HTML5Backend}>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Operazioni rapide</CardTitle>
          <CardDescription>
            Trascina una cesta su una delle operazioni disponibili per eseguirla rapidamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <OperationsDropZone 
              operationType="misura"
              title="Misurazione"
              description="Aggiorna i dati di misurazione della cesta"
              color="blue-500"
              icon={<Microscope className="h-5 w-5" />}
            />
            
            <OperationsDropZone 
              operationType="selezione"
              title="Selezione"
              description="Esegui selezione degli animali nella cesta"
              color="amber-500"
              icon={<ListFilter className="h-5 w-5" />}
            />
            
            <OperationsDropZone 
              operationType="peso"
              title="Peso"
              description="Registra i dati di peso della cesta"
              color="green-500"
              icon={<ScaleIcon className="h-5 w-5" />}
            />
            
            <OperationsDropZone 
              operationType="selezione-vendita"
              title="Sel. Vendita"
              description="Seleziona animali per la vendita"
              color="purple-500"
              icon={<Scissors className="h-5 w-5" />}
            />
            
            <OperationsDropZone 
              operationType="vendita"
              title="Vendita"
              description="Registra una vendita di animali"
              color="red-500"
              icon={<ShoppingCart className="h-5 w-5" />}
            />
          </div>
        </CardContent>
      </Card>
    </DndProvider>
  );
}