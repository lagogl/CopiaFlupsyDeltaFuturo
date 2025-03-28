import React, { useState } from 'react';
import { NfcTag } from '../utils/nfcSimulator';
import { Button } from '@/components/ui/button';
import { 
  Scale, 
  Ruler, 
  ClipboardList, 
  BarChart2, 
  AlertTriangle,
  Tag,
  Clock,
  FileText,
  ChevronRight
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

interface NfcQuickActionsProps {
  tag: NfcTag;
}

const NfcQuickActions: React.FC<NfcQuickActionsProps> = ({ tag }) => {
  // Potremmo fare un redirect alla pagina di operazione, ma per ora
  // simula l'apertura dell'operazione
  const handleOperation = (operationType: string) => {
    toast({
      title: `Operazione ${operationType}`,
      description: `Hai avviato un'operazione di tipo "${operationType}" per la cesta #${tag.basketId || 'N/D'}`,
    });
  };

  // Genera una classe di colore basata sul tipo di operazione
  const getOperationTypeClass = (type: string) => {
    switch (type) {
      case 'misura':
        return 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200';
      case 'peso':
        return 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200';
      case 'prima-attivazione':
        return 'bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200';
    }
  };

  // Funzione per ottenere l'icona in base al tipo di operazione
  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'misura':
        return <Ruler className="h-4 w-4" />;
      case 'peso':
        return <Scale className="h-4 w-4" />;
      case 'prima-attivazione':
        return <Tag className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-3">
      {/* Azioni Principali */}
      <div className="grid grid-cols-2 gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                className="w-full py-6 flex flex-col items-center justify-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                variant="outline"
                onClick={() => handleOperation('misura')}
              >
                <Ruler className="h-5 w-5" />
                <span>Misura</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Avvia un'operazione di misurazione per questa cesta</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                className="w-full py-6 flex flex-col items-center justify-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                variant="outline"
                onClick={() => handleOperation('peso')}
              >
                <Scale className="h-5 w-5" />
                <span>Peso</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Avvia un'operazione di peso per questa cesta</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Azioni Secondarie */}
      <div className="grid grid-cols-3 gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                className="py-2 flex flex-col items-center justify-center gap-1"
                variant="outline"
                size="sm"
                onClick={() => handleOperation('cronologia')}
              >
                <ClipboardList className="h-4 w-4" />
                <span className="text-xs">Cronologia</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Visualizza la cronologia delle operazioni</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                className="py-2 flex flex-col items-center justify-center gap-1"
                variant="outline"
                size="sm"
                onClick={() => handleOperation('statistiche')}
              >
                <BarChart2 className="h-4 w-4" />
                <span className="text-xs">Statistiche</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Visualizza le statistiche di crescita</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                className="py-2 flex flex-col items-center justify-center gap-1"
                variant="outline"
                size="sm"
                onClick={() => handleOperation('mortalita')}
              >
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs">Mortalità</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Registra un'operazione di mortalità</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Dettagli Operazioni */}
      <Accordion type="single" collapsible className="border rounded-md">
        <AccordionItem value="operations">
          <AccordionTrigger className="px-4 text-sm hover:no-underline hover:bg-gray-50">
            Ultime Operazioni
          </AccordionTrigger>
          <AccordionContent className="px-0">
            <div className="divide-y">
              {/* Se ci sono operazioni le mostriamo (usiamo un mock qui) */}
              {tag.lastOperation ? (
                <div className="px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getOperationIcon(tag.lastOperation.type)}
                    <div>
                      <div className="font-medium text-sm">
                        {tag.lastOperation.type.charAt(0).toUpperCase() + tag.lastOperation.type.slice(1)}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {tag.lastOperation.date ? 
                          format(new Date(tag.lastOperation.date), 'dd/MM/yyyy', { locale: it }) :
                          'Data non disponibile'
                        }
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                  Nessuna operazione registrata
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default NfcQuickActions;