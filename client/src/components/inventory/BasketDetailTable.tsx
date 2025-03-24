import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface BasketData {
  id: number;
  physicalNumber: number;
  flupsyId: number;
  flupsyName: string;
  row: string | null;
  position: number | null;
  state: string;
  currentCycleId: number | null;
  sizeCode: string | null;
  sizeName: string | null;
  color: string | null;
  animalsPerKg: number | null;
  averageWeight: number | null;
  totalAnimals: number | null;
  lastOperationDate: string | null;
  lastOperationType: string | null;
  cycleStartDate: string | null;
  cycleDuration: number | null;
  growthRate: number | null;
}

interface BasketDetailTableProps {
  baskets: BasketData[];
  formatNumberEU: (value: number) => string;
  formatDecimalEU: (value: number) => string;
  formatDateIT: (date: Date | string) => string;
}

const BasketDetailTable: React.FC<BasketDetailTableProps> = ({
  baskets,
  formatNumberEU,
  formatDecimalEU,
  formatDateIT,
}) => {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cesta</TableHead>
            <TableHead>FLUPSY</TableHead>
            <TableHead>Posizione</TableHead>
            <TableHead>Taglia</TableHead>
            <TableHead className="text-right">Animali/kg</TableHead>
            <TableHead className="text-right">Peso medio (mg)</TableHead>
            <TableHead className="text-right">Animali totali</TableHead>
            <TableHead className="text-right">SGR mensile</TableHead>
            <TableHead>Ultima operazione</TableHead>
            <TableHead className="text-right">Età (giorni)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {baskets.map((basket) => (
            <TableRow key={basket.id}>
              <TableCell className="font-medium">{basket.physicalNumber}</TableCell>
              <TableCell>{basket.flupsyName}</TableCell>
              <TableCell>
                {basket.row && basket.position ? 
                  `${basket.row}-${basket.position}` : 
                  'Non posizionata'}
              </TableCell>
              <TableCell>
                {basket.sizeCode ? (
                  <Badge
                    style={{ 
                      backgroundColor: basket.color || 'gray',
                      color: basket.sizeCode && parseInt(basket.sizeCode.replace('T', '')) <= 3 ? 'white' : 'black'
                    }}
                  >
                    {basket.sizeCode}
                  </Badge>
                ) : 'N/D'}
              </TableCell>
              <TableCell className="text-right">
                {basket.animalsPerKg ? formatNumberEU(basket.animalsPerKg) : 'N/D'}
              </TableCell>
              <TableCell className="text-right">
                {basket.averageWeight ? formatDecimalEU(basket.averageWeight) : 'N/D'}
              </TableCell>
              <TableCell className="text-right">
                {basket.totalAnimals ? formatNumberEU(basket.totalAnimals) : 'N/D'}
              </TableCell>
              <TableCell className="text-right">
                {basket.growthRate !== null ? 
                  `${formatDecimalEU(basket.growthRate)}%` : 
                  'N/D'}
              </TableCell>
              <TableCell>
                {basket.lastOperationDate ? 
                  `${formatDateIT(basket.lastOperationDate)} (${basket.lastOperationType})` : 
                  'N/D'}
              </TableCell>
              <TableCell className="text-right">
                {basket.cycleDuration ? formatNumberEU(basket.cycleDuration) : 'N/D'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {baskets.length === 0 && (
        <div className="py-6 text-center text-muted-foreground">
          Nessuna cesta trovata con i filtri selezionati
        </div>
      )}
    </div>
  );
};

export default BasketDetailTable;