import { ReactNode } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Clock, InfoIcon } from 'lucide-react';
import { useLocation } from 'wouter';

interface StatCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  changeText: string;
  changeType: 'success' | 'error' | 'warning' | 'info';
  linkTo?: string; // Percorso per la navigazione quando viene cliccato
  cardColor?: string; // Colore di sfondo personalizzato
  secondaryInfo?: string; // Informazione secondaria da visualizzare sotto il valore principale
}

export default function StatCard({ 
  title, 
  value, 
  icon, 
  changeText, 
  changeType, 
  linkTo, 
  cardColor 
}: StatCardProps) {
  const [, setLocation] = useLocation();

  const getIcon = () => {
    switch (changeType) {
      case 'success':
        return <ArrowUpCircle className="h-4 w-4 mr-1" />;
      case 'error':
        return <ArrowDownCircle className="h-4 w-4 mr-1" />;
      case 'warning':
        return <Clock className="h-4 w-4 mr-1" />;
      case 'info':
        return <InfoIcon className="h-4 w-4 mr-1" />;
    }
  };

  const getTextColor = () => {
    switch (changeType) {
      case 'success':
        return 'text-success';
      case 'error':
        return 'text-error';
      case 'warning':
        return 'text-warning';
      case 'info':
        return 'text-info';
    }
  };

  const getCardColorStyle = () => {
    if (cardColor) return cardColor;

    switch (changeType) {
      case 'success':
        return 'from-green-50 to-green-100 border-l-4 border-green-500';
      case 'error':
        return 'from-red-50 to-red-100 border-l-4 border-red-500';
      case 'warning':
        return 'from-yellow-50 to-yellow-100 border-l-4 border-yellow-500';
      case 'info':
        return 'from-blue-50 to-blue-100 border-l-4 border-blue-500';
      default:
        return 'bg-white';
    }
  };

  const handleClick = () => {
    if (linkTo) {
      setLocation(linkTo);
    }
  };

  return (
    <div 
      className={`rounded-lg shadow-md p-6 transition-all duration-200 bg-gradient-to-br ${getCardColorStyle()} 
                  ${linkTo ? 'cursor-pointer hover:shadow-lg transform hover:-translate-y-1' : ''}`}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-700 text-sm font-medium">{title}</p>
          <h3 className="text-3xl font-bold text-gray-800 mt-1">{value}</h3>
        </div>
        {icon}
      </div>
      <div className="mt-4">
        <div className={`flex items-center ${getTextColor()}`}>
          {getIcon()}
          <span className="text-xs font-medium">{changeText}</span>
        </div>
      </div>
    </div>
  );
}
