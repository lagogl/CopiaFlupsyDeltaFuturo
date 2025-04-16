/**
 * Funzione per ottenere colori coerenti in base al codice taglia.
 * Restituisce classi CSS con colori vivaci per ogni range di taglie.
 * 
 * @param sizeCode Codice della taglia (es. TP-500, TP-3000)
 * @param variant Variante di colore (full = colore pieno, light = colore chiaro con testo scuro)
 * @returns Stringa con classi CSS
 */
export function getSizeColor(sizeCode: string, variant: 'full' | 'light' = 'full'): string {
  // Controlla se è una taglia TP-XXXX e ottiene il numero
  if (!sizeCode.startsWith('TP-')) {
    return variant === 'full' 
      ? 'bg-gray-600 text-white border-gray-800' 
      : 'bg-gray-100 text-gray-800 border-gray-300';
  }
  
  // Estrai il numero dalla taglia (es. da TP-500 estrae 500)
  const sizeNum = parseInt(sizeCode.replace('TP-', ''));
  
  // Verifica se il codice della taglia è TP-10000 o superiore
  if (sizeNum >= 10000) {
    return variant === 'full'
      ? 'bg-black text-white border-gray-800' 
      : 'bg-gray-800 text-white border-black';
  }
  
  // Assegna colori in base al range della taglia
  if (sizeNum <= 500) {
    return variant === 'full'
      ? 'bg-purple-600 text-white border-purple-800'
      : 'bg-purple-100 text-purple-800 border-purple-500';
  } else if (sizeNum <= 1000) {
    return variant === 'full'
      ? 'bg-pink-600 text-white border-pink-800'
      : 'bg-pink-100 text-pink-800 border-pink-500';
  } else if (sizeNum <= 2000) {
    return variant === 'full'
      ? 'bg-rose-600 text-white border-rose-800'
      : 'bg-rose-100 text-rose-800 border-rose-500';
  } else if (sizeNum <= 3000) {
    return variant === 'full'
      ? 'bg-red-600 text-white border-red-800'
      : 'bg-red-100 text-red-800 border-red-500';
  } else if (sizeNum <= 4000) {
    return variant === 'full'
      ? 'bg-orange-600 text-white border-orange-800'
      : 'bg-orange-100 text-orange-800 border-orange-500';
  } else if (sizeNum <= 6000) {
    return variant === 'full'
      ? 'bg-amber-600 text-white border-amber-800'
      : 'bg-amber-100 text-amber-800 border-amber-500';
  } else if (sizeNum <= 7000) {
    return variant === 'full'
      ? 'bg-lime-600 text-white border-lime-800'
      : 'bg-lime-100 text-lime-800 border-lime-500';
  } else if (sizeNum <= 8000) {
    return variant === 'full'
      ? 'bg-green-600 text-white border-green-800'
      : 'bg-green-100 text-green-800 border-green-500';
  } else if (sizeNum <= 9000) {
    return variant === 'full'
      ? 'bg-teal-600 text-white border-teal-800'
      : 'bg-teal-100 text-teal-800 border-teal-500';
  } else {
    return variant === 'full'
      ? 'bg-blue-600 text-white border-blue-800'
      : 'bg-blue-100 text-blue-800 border-blue-500';
  }
}