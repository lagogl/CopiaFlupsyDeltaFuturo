import { ReactNode } from 'react';
import { ArrowUpCircle, ArrowDownCircle, Clock, InfoIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  changeText: string;
  changeType: 'success' | 'error' | 'warning' | 'info';
}

export default function StatCard({ title, value, icon, changeText, changeType }: StatCardProps) {
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

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
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
