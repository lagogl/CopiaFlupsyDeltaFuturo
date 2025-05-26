import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, Loader2, AlertCircle } from "lucide-react";

interface CompletionStep {
  id: string;
  label: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  description?: string;
}

interface CompletionProgressDialogProps {
  isOpen: boolean;
  steps: CompletionStep[];
  currentStep: number;
  totalSteps: number;
  onClose?: () => void;
}

export default function CompletionProgressDialog({
  isOpen,
  steps,
  currentStep,
  totalSteps,
  onClose
}: CompletionProgressDialogProps) {
  const progressPercentage = Math.round((currentStep / totalSteps) * 100);

  const getStepIcon = (step: CompletionStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'in-progress':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStepTextColor = (step: CompletionStep) => {
    switch (step.status) {
      case 'completed':
        return 'text-green-700';
      case 'in-progress':
        return 'text-blue-700 font-medium';
      case 'error':
        return 'text-red-700';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            Completamento Vagliatura in Corso
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Barra di progresso principale */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="text-xs text-center text-muted-foreground">
              {currentStep} di {totalSteps} operazioni completate
            </div>
          </div>

          {/* Lista dei passaggi */}
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  step.status === 'in-progress' 
                    ? 'bg-blue-50 border-blue-200' 
                    : step.status === 'completed'
                    ? 'bg-green-50 border-green-200'
                    : step.status === 'error'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getStepIcon(step)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${getStepTextColor(step)}`}>
                    {step.label}
                  </div>
                  {step.description && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {step.description}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Messaggio di stato */}
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-800 font-medium">
              Operazione in corso...
            </div>
            <div className="text-xs text-blue-600 mt-1">
              Non chiudere questa finestra e non ricaricare la pagina
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}