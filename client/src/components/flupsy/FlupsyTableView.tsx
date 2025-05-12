import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, RefreshCw, Trash2 } from "lucide-react";

interface Flupsy {
  id: number;
  name: string;
  location?: string;
  description?: string;
  active: boolean;
  maxPositions: number;
  productionCenter?: string;
  totalBaskets?: number;
  activeBaskets?: number;
  availableBaskets?: number;
  freePositions?: number;
  totalAnimals?: number;
  sizeDistribution?: Record<string, number>;
  avgAnimalDensity?: number;
  activeBasketPercentage?: number;
}

interface FlupsyTableViewProps {
  flupsys: Flupsy[];
  userRole?: string;
  onEdit: (flupsy: Flupsy) => void;
  onDelete: (flupsy: Flupsy) => void;
  onPopulate: (flupsy: Flupsy) => void;
}

export default function FlupsyTableView({
  flupsys,
  userRole,
  onEdit,
  onDelete,
  onPopulate,
}: FlupsyTableViewProps) {
  // Controllo se l'utente ha i permessi per modificare/eliminare
  const canModify = userRole === 'admin' || userRole === 'user';

  // Vista mobile con card invece che tabella
  const MobileView = () => (
    <div className="space-y-4">
      {flupsys && flupsys.length > 0 ? (
        flupsys.map((flupsy) => (
          <div key={flupsy.id} className="bg-white dark:bg-gray-800 rounded-lg border p-4 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 mr-2">
                <div className="font-bold text-base">{flupsy.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{flupsy.location || '-'}</div>
                {flupsy.description && (
                  <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{flupsy.description}</div>
                )}
              </div>
              <Badge variant={flupsy.active ? "default" : "secondary"} className="text-xs shrink-0">
                {flupsy.active ? "Attivo" : "Inattivo"}
              </Badge>
            </div>
            
            {flupsy.totalAnimals && flupsy.totalAnimals > 0 && (
              <div className="mb-2 flex items-center">
                <Badge className="bg-cyan-100 text-cyan-900 dark:bg-cyan-900/30 dark:text-cyan-200 border-cyan-200 dark:border-cyan-800 flex items-center gap-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium">Totale animali:</span> 
                    <span className="text-xs font-bold">{flupsy.totalAnimals.toLocaleString()}</span>
                  </div>
                </Badge>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 my-2">
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Cestelli Attivi</div>
                <div className="font-medium text-blue-600 dark:text-blue-400 text-sm">{flupsy.activeBaskets || 0}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Occupazione</div>
                <div className="flex items-center">
                  <div className="h-2 w-12 bg-muted rounded-full overflow-hidden mr-1.5">
                    <div 
                      className="h-full bg-blue-500 rounded-full" 
                      style={{ width: `${flupsy.activeBasketPercentage || 0}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-bold">{flupsy.activeBasketPercentage || 0}%</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Media Animali/Cesta</div>
                <div className="font-medium text-amber-600 dark:text-amber-400 text-sm">
                  {flupsy.avgAnimalDensity?.toLocaleString() || 0}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Posizioni</div>
                <div className="text-sm">{flupsy.totalBaskets || 0}/{flupsy.maxPositions || 0}</div>
              </div>
            </div>
            
            {/* Mostra le taglie principali */}
            {flupsy.sizeDistribution && Object.keys(flupsy.sizeDistribution).length > 0 && (
              <div className="mb-2 border-t pt-2 mt-2">
                <div className="text-xs text-muted-foreground mb-1">Taglie Principali</div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(flupsy.sizeDistribution || {})
                    .sort(([, countA], [, countB]) => Number(countB) - Number(countA))
                    .slice(0, 3)
                    .map(([size, count]) => {
                      const totalCount = Object.values(flupsy.sizeDistribution || {}).reduce(
                        (sum, c) => Number(sum) + Number(c), 0
                      );
                      const percentage = totalCount > 0 ? (Number(count) / totalCount) * 100 : 0;
                      
                      return (
                        <Badge key={size} variant="outline" className="bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800 text-xs">
                          {size}: {percentage.toFixed(1)}%
                        </Badge>
                      );
                    })
                  }
                  {flupsy.sizeDistribution && Object.keys(flupsy.sizeDistribution).length > 3 && (
                    <span className="text-xs text-muted-foreground">+{Object.keys(flupsy.sizeDistribution).length - 3}</span>
                  )}
                </div>
              </div>
            )}
            
            {/* Barre di progresso per posizioni libere e occupazione attiva */}
            <div className="grid grid-cols-1 gap-2 mb-3 mt-2">
              <div>
                <div className="text-xs text-muted-foreground mb-0.5">Posizioni Libere</div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full" 
                    style={{ 
                      width: `${((flupsy.maxPositions - (flupsy.totalBaskets || 0)) / flupsy.maxPositions) * 100}%` 
                    }}
                  ></div>
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="text-xs text-green-600 dark:text-green-400">
                    {flupsy.maxPositions - (flupsy.totalBaskets || 0)} disponibili
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ID: {flupsy.id}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Pulsanti di azione */}
            <div className="flex justify-end gap-1 mt-2 border-t pt-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs"
                onClick={() => onEdit(flupsy)}
              >
                <Edit className="h-3 w-3 mr-1" />
                Modifica
              </Button>
              
              {canModify && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs text-emerald-600 border-emerald-200"
                    onClick={() => onPopulate(flupsy)}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Aggiorna
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs text-red-600 border-red-200"
                    onClick={() => onDelete(flupsy)}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Elimina
                  </Button>
                </>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg border">
          <p className="text-gray-500 dark:text-gray-400">Nessuna unità FLUPSY trovata.</p>
        </div>
      )}
    </div>
  );

  // Vista desktop con tabella
  const DesktopView = () => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">ID</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Posizione</TableHead>
            <TableHead className="text-center">Stato</TableHead>
            <TableHead className="text-center">Cestelli<br/>Attivi</TableHead>
            <TableHead className="text-center">% Ocupaz.<br/>Attivi</TableHead>
            <TableHead className="text-center">Media Animali<br/>Cesta</TableHead>
            <TableHead className="text-center">Totale<br/>Animali</TableHead>
            <TableHead className="text-center">Posizioni<br/>Usate/Totali</TableHead>
            <TableHead className="text-center">Taglie Principali</TableHead>
            <TableHead className="text-right">Azioni</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {flupsys && flupsys.length > 0 ? (
            flupsys.map((flupsy) => (
              <TableRow key={flupsy.id}>
                <TableCell className="font-medium">{flupsy.id}</TableCell>
                <TableCell>
                  <div className="font-semibold">{flupsy.name}</div>
                  {flupsy.description && (
                    <div className="text-xs text-muted-foreground mt-1">{flupsy.description}</div>
                  )}
                </TableCell>
                <TableCell>{flupsy.location || '-'}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={flupsy.active ? "default" : "secondary"} className="text-xs">
                    {flupsy.active ? "Attivo" : "Inattivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-center font-medium text-blue-600 dark:text-blue-400">
                  {flupsy.activeBaskets || 0}
                </TableCell>
                <TableCell className="text-center font-medium">
                  <div className="flex flex-col items-center justify-center">
                    <div className="h-2 w-16 bg-muted rounded-full overflow-hidden mb-1">
                      <div 
                        className="h-full bg-blue-500 rounded-full" 
                        style={{ 
                          width: `${flupsy.activeBasketPercentage || 0}%` 
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold">
                      {flupsy.activeBasketPercentage || 0}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center font-medium text-amber-600 dark:text-amber-400">
                  {flupsy.avgAnimalDensity?.toLocaleString() || 0}
                </TableCell>
                <TableCell className="text-center font-medium text-cyan-600 dark:text-cyan-400">
                  {flupsy.totalAnimals?.toLocaleString() || 0}
                </TableCell>
                <TableCell className="text-center">
                  {flupsy.totalBaskets || 0}/{flupsy.maxPositions || 0}
                </TableCell>
                <TableCell>
                  {flupsy.sizeDistribution && Object.keys(flupsy.sizeDistribution).length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(flupsy.sizeDistribution || {})
                        .sort(([, countA], [, countB]) => Number(countB) - Number(countA))
                        .slice(0, 3)
                        .map(([size, count]) => {
                          const totalCount = Object.values(flupsy.sizeDistribution || {}).reduce((sum, c) => Number(sum) + Number(c), 0);
                          const percentage = totalCount > 0 ? (Number(count) / totalCount) * 100 : 0;
                          
                          return (
                            <Badge key={size} variant="outline" className="bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800">
                              {size}: {percentage.toFixed(1)}%
                            </Badge>
                          );
                        })
                      }
                      {flupsy.sizeDistribution && Object.keys(flupsy.sizeDistribution).length > 3 && (
                        <span className="text-xs text-muted-foreground">+{Object.keys(flupsy.sizeDistribution).length - 3}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Nessun dato</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => onEdit(flupsy)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    {canModify && (
                      <>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-emerald-600 hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-400"
                          onClick={() => onPopulate(flupsy)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400"
                          onClick={() => onDelete(flupsy)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={10} className="h-24 text-center">
                <p className="text-gray-500 dark:text-gray-400">Nessuna unità FLUPSY trovata.</p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  // Restituisce vista desktop su schermi grandi e vista mobile su schermi piccoli
  return (
    <>
      <div className="hidden md:block">
        <DesktopView />
      </div>
      <div className="md:hidden">
        <MobileView />
      </div>
    </>
  );
}