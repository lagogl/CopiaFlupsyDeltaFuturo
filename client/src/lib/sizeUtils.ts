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
  
  // Assegna colori in base alla gamma di dimensioni - più il numero è alto (taglia più piccola), più il colore è verde
  if (sizeNum >= 10000) {
    return '#22c55e'; // green-500 - più verde per i numeri più alti (animali più piccoli)
  } else if (sizeNum >= 9000) {
    return '#84cc16'; // lime-500
  } else if (sizeNum >= 8000) {
    return '#65a30d'; // lime-600
  } else if (sizeNum >= 7000) {
    return '#f59e0b'; // amber-500
  } else if (sizeNum >= 6000) {
    return '#f97316'; // orange-500
  } else if (sizeNum >= 4000) {
    return '#fb923c'; // orange-400
  } else if (sizeNum >= 3000) {
    return '#f43f5e'; // rose-500
  } else if (sizeNum >= 2000) {
    return '#ec4899'; // pink-500
  } else if (sizeNum >= 1000) {
    return '#ef4444'; // red-500
  } else if (sizeNum >= 500) {
    return '#dc2626'; // red-600 - più rosso per i numeri più bassi (animali più grandi)
  } else {
    return '#b91c1c'; // red-700
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
  
  // Numero più alto (seme più piccolo) = più verde; numero più basso (seme più grande) = più rosso
  if (sizeNum >= 10000) {
    return 'bg-green-100 text-green-800 border-green-300';
  } else if (sizeNum >= 9000) {
    return 'bg-lime-100 text-lime-800 border-lime-300';
  } else if (sizeNum >= 8000) {
    return 'bg-lime-100 text-lime-700 border-lime-300';
  } else if (sizeNum >= 7000) {
    return 'bg-amber-100 text-amber-800 border-amber-300';
  } else if (sizeNum >= 6000) {
    return 'bg-orange-100 text-orange-800 border-orange-300';
  } else if (sizeNum >= 4000) {
    return 'bg-orange-100 text-orange-700 border-orange-300';
  } else if (sizeNum >= 3000) {
    return 'bg-rose-100 text-rose-800 border-rose-300';
  } else if (sizeNum >= 2000) {
    return 'bg-pink-100 text-pink-800 border-pink-300';
  } else if (sizeNum >= 1000) {
    return 'bg-red-100 text-red-800 border-red-300';
  } else if (sizeNum >= 500) {
    return 'bg-red-100 text-red-700 border-red-300';
  } else {
    return 'bg-red-100 text-red-900 border-red-400';
  }
}