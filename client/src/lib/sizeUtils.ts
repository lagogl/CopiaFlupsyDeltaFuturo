/**
 * Utility per la gestione uniforme dei colori e stili delle taglie in tutta l'applicazione
 */

/**
 * Restituisce il colore appropriato per una taglia specifica in formato esadecimale
 * @param sizeCode - Codice della taglia (es. 'TP-500')
 * @returns Codice colore esadecimale
 */
export function getSizeColor(sizeCode: string): string {
  // Verifica se il codice della taglia è in formato TP-XXXX
  if (!sizeCode.startsWith('TP-')) return '#1f2937'; // Default grigio scuro
  
  // Estrai il numero dalla taglia
  const sizeNum = parseInt(sizeCode.replace('TP-', ''));
  
  // Assegna colori in base alla gamma di dimensioni
  if (sizeNum <= 500) {
    return '#a855f7'; // purple-500
  } else if (sizeNum <= 1000) {
    return '#ec4899'; // pink-500
  } else if (sizeNum <= 2000) {
    return '#f43f5e'; // rose-500
  } else if (sizeNum <= 3000) {
    return '#ef4444'; // red-500
  } else if (sizeNum <= 4000) {
    return '#f97316'; // orange-500
  } else if (sizeNum <= 6000) {
    return '#f59e0b'; // amber-500
  } else if (sizeNum <= 7000) {
    return '#84cc16'; // lime-500
  } else if (sizeNum <= 8000) {
    return '#22c55e'; // green-500
  } else if (sizeNum <= 9000) {
    return '#14b8a6'; // teal-500
  } else if (sizeNum <= 10000) {
    return '#0ea5e9'; // sky-500
  } else {
    return '#000000'; // black
  }
}

/**
 * Restituisce lo stile CSS per il badge di una taglia
 * @param sizeCode - Codice della taglia
 * @returns Oggetto con le proprietà di stile CSS
 */
export function getSizeBadgeStyle(sizeCode: string): React.CSSProperties {
  const color = getSizeColor(sizeCode);
  
  return {
    backgroundColor: `${color}15`,
    color: color,
    borderColor: `${color}50`,
    borderWidth: '1px'
  };
}

/**
 * Restituisce le classi tailwind per lo stile del badge di una taglia
 * @param sizeCode - Codice della taglia
 * @returns Stringa con le classi Tailwind
 */
export function getSizeBadgeClass(sizeCode: string): string {
  if (!sizeCode.startsWith('TP-')) return 'bg-gray-100 text-gray-800 border-gray-300';
  
  const sizeNum = parseInt(sizeCode.replace('TP-', ''));
  
  if (sizeNum <= 500) {
    return 'bg-purple-100 text-purple-800 border-purple-300';
  } else if (sizeNum <= 1000) {
    return 'bg-pink-100 text-pink-800 border-pink-300';
  } else if (sizeNum <= 2000) {
    return 'bg-rose-100 text-rose-800 border-rose-300';
  } else if (sizeNum <= 3000) {
    return 'bg-red-100 text-red-800 border-red-300';
  } else if (sizeNum <= 4000) {
    return 'bg-orange-100 text-orange-800 border-orange-300';
  } else if (sizeNum <= 6000) {
    return 'bg-amber-100 text-amber-800 border-amber-300';
  } else if (sizeNum <= 7000) {
    return 'bg-lime-100 text-lime-800 border-lime-300';
  } else if (sizeNum <= 8000) {
    return 'bg-green-100 text-green-800 border-green-300';
  } else if (sizeNum <= 9000) {
    return 'bg-teal-100 text-teal-800 border-teal-300';
  } else if (sizeNum <= 10000) {
    return 'bg-sky-100 text-sky-800 border-sky-300';
  } else {
    return 'bg-gray-900 text-white border-gray-700';
  }
}