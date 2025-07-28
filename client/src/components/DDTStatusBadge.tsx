import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, FileText, CheckCircle, HelpCircle } from 'lucide-react';

interface DDTStatusBadgeProps {
  stato: 'nessuno' | 'locale' | 'inviato' | string;
  className?: string;
}

export const DDTStatusBadge: React.FC<DDTStatusBadgeProps> = ({ stato, className = '' }) => {
  const getStatusConfig = () => {
    switch (stato) {
      case 'nessuno':
        return { 
          variant: 'destructive' as const, 
          text: 'Nessun DDT', 
          icon: AlertCircle,
          className: 'bg-red-100 text-red-800 border-red-200'
        };
      case 'locale':
        return { 
          variant: 'secondary' as const, 
          text: 'DDT Locale', 
          icon: FileText,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
        };
      case 'inviato':
        return { 
          variant: 'default' as const, 
          text: 'Inviato', 
          icon: CheckCircle,
          className: 'bg-green-100 text-green-800 border-green-200'
        };
      default:
        return { 
          variant: 'outline' as const, 
          text: 'N/A', 
          icon: HelpCircle,
          className: 'bg-gray-100 text-gray-600 border-gray-200'
        };
    }
  };
  
  const { variant, text, icon: Icon, className: statusClassName } = getStatusConfig();
  
  return (
    <Badge variant={variant} className={`${statusClassName} ${className}`}>
      <Icon className="w-3 h-3 mr-1" />
      {text}
    </Badge>
  );
};

export default DDTStatusBadge;