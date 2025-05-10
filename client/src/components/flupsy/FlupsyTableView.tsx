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

interface FlupsyTableViewProps {
  flupsys: any[];
  userRole?: string;
  onEdit: (flupsy: any) => void;
  onDelete: (flupsy: any) => void;
  onPopulate: (flupsy: any) => void;
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

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">ID</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Posizione</TableHead>
            <TableHead className="text-center">Stato</TableHead>
            <TableHead className="text-center">Cestelli Attivi</TableHead>
            <TableHead className="text-center">Cestelli Disponibili</TableHead>
            <TableHead className="text-center">Totale Animali</TableHead>
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
                <TableCell className="text-center font-medium text-green-600 dark:text-green-400">
                  {flupsy.availableBaskets || 0}
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
                      {Object.entries(flupsy.sizeDistribution)
                        .sort(([, countA], [, countB]) => Number(countB) - Number(countA))
                        .slice(0, 3)
                        .map(([size, count]) => {
                          const totalCount = Object.values(flupsy.sizeDistribution).reduce((sum, c) => Number(sum) + Number(c), 0);
                          const percentage = totalCount > 0 ? (Number(count) / totalCount) * 100 : 0;
                          
                          return (
                            <Badge key={size} variant="outline" className="bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800">
                              {size}: {percentage.toFixed(1)}%
                            </Badge>
                          );
                        })
                      }
                      {Object.keys(flupsy.sizeDistribution).length > 3 && (
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
}