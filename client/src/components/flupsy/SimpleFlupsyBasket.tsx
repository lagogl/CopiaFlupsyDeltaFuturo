import React from 'react';
import { format } from 'date-fns';

interface Props {
  basket: any;
  onClick?: (basketId: number) => void;
}

/**
 * Componente estremamente semplificato per la visualizzazione dei cestelli FLUPSY
 * Creato per risolvere i problemi di visualizzazione
 */
const SimpleFlupsyBasket: React.FC<Props> = ({ basket, onClick }) => {
  if (!basket) {
    return (
      <div 
        className="p-2 rounded border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col justify-center items-center"
        style={{minHeight: "90px", minWidth: "80px"}}
      >
        <div className="text-xs text-gray-400">Vuoto</div>
      </div>
    );
  }

  // Colore di default per cestelli con ciclo attivo
  const bgColor = basket.currentCycleId ? 'bg-blue-50' : 'bg-gray-50';
  const borderColor = basket.currentCycleId ? 'border-blue-500' : 'border-gray-300';
  
  return (
    <div
      className={`p-2 rounded border-2 ${bgColor} ${borderColor} flex flex-col cursor-pointer hover:shadow-md transition-shadow`}
      style={{minHeight: "90px", minWidth: "80px"}}
      onClick={() => onClick && onClick(basket.id)}
      data-basket-id={basket.id}
    >
      <div className="font-bold text-xs">CESTA #{basket.physicalNumber}</div>
      
      {basket.currentCycleId && (
        <div className="text-[10px] bg-blue-100 rounded px-1 mt-1 text-blue-800">
          Ciclo {basket.currentCycleId}
        </div>
      )}
      
      {!basket.currentCycleId && (
        <div className="text-[10px] mt-1 text-gray-500">
          Disponibile
        </div>
      )}
    </div>
  );
};

export default SimpleFlupsyBasket;