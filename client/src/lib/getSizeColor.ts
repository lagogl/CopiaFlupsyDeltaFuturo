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
  
  // Assegna colori in base a ogni specifica taglia per massimizzare la differenza tra taglie vicine
  // Range 0-500
  if (sizeNum === 180) {
    return variant === 'full'
      ? 'bg-purple-900 text-white border-purple-950'
      : 'bg-purple-100 text-purple-900 border-purple-300';
  } else if (sizeNum === 200) {
    return variant === 'full'
      ? 'bg-purple-800 text-white border-purple-900'
      : 'bg-purple-50 text-purple-800 border-purple-200';
  } else if (sizeNum === 315) {
    return variant === 'full'
      ? 'bg-purple-700 text-white border-purple-800'
      : 'bg-purple-100 text-purple-700 border-purple-300';
  } else if (sizeNum === 450) {
    return variant === 'full'
      ? 'bg-purple-600 text-white border-purple-700'
      : 'bg-purple-100 text-purple-600 border-purple-300';
  } else if (sizeNum === 500) {
    return variant === 'full'
      ? 'bg-purple-500 text-white border-purple-600'
      : 'bg-purple-100 text-purple-500 border-purple-300';
  } 
  // Range 500-1000
  else if (sizeNum === 600) {
    return variant === 'full'
      ? 'bg-pink-800 text-white border-pink-900'
      : 'bg-pink-100 text-pink-800 border-pink-300';
  } else if (sizeNum === 700) {
    return variant === 'full'
      ? 'bg-pink-700 text-white border-pink-800'
      : 'bg-pink-100 text-pink-700 border-pink-300';
  } else if (sizeNum === 800) {
    return variant === 'full'
      ? 'bg-pink-600 text-white border-pink-700'
      : 'bg-pink-100 text-pink-600 border-pink-300';
  } else if (sizeNum === 1000) {
    return variant === 'full'
      ? 'bg-pink-500 text-white border-pink-600'
      : 'bg-pink-100 text-pink-500 border-pink-300';
  }
  // Range 1000-2000
  else if (sizeNum === 1140) {
    return variant === 'full'
      ? 'bg-rose-800 text-white border-rose-900'
      : 'bg-rose-100 text-rose-800 border-rose-300';
  } else if (sizeNum === 1260) {
    return variant === 'full'
      ? 'bg-rose-700 text-white border-rose-800'
      : 'bg-rose-100 text-rose-700 border-rose-300';
  } else if (sizeNum === 1500) {
    return variant === 'full'
      ? 'bg-rose-600 text-white border-rose-700'
      : 'bg-rose-100 text-rose-600 border-rose-300';
  } else if (sizeNum === 1800) {
    return variant === 'full'
      ? 'bg-rose-500 text-white border-rose-600'
      : 'bg-rose-100 text-rose-500 border-rose-300';
  } else if (sizeNum === 1900) {
    return variant === 'full'
      ? 'bg-rose-400 text-white border-rose-500'
      : 'bg-rose-100 text-rose-400 border-rose-300';
  }
  // Range 2000-3000
  else if (sizeNum === 2000) {
    return variant === 'full'
      ? 'bg-red-800 text-white border-red-900'
      : 'bg-red-100 text-red-800 border-red-300';
  } else if (sizeNum === 2200) {
    return variant === 'full'
      ? 'bg-red-700 text-white border-red-800'
      : 'bg-red-100 text-red-700 border-red-300';
  } else if (sizeNum === 2300) {
    return variant === 'full'
      ? 'bg-red-600 text-white border-red-700'
      : 'bg-red-100 text-red-600 border-red-300';
  } else if (sizeNum === 2800) {
    return variant === 'full'
      ? 'bg-red-500 text-white border-red-600'
      : 'bg-red-100 text-red-500 border-red-300';
  } else if (sizeNum === 3000) {
    return variant === 'full'
      ? 'bg-red-400 text-white border-red-500'
      : 'bg-red-100 text-red-400 border-red-300';
  }
  // Range 3000-4000
  else if (sizeNum === 3300) {
    return variant === 'full'
      ? 'bg-orange-800 text-white border-orange-900'
      : 'bg-orange-100 text-orange-800 border-orange-300';
  } else if (sizeNum === 3500) {
    return variant === 'full'
      ? 'bg-orange-700 text-white border-orange-800'
      : 'bg-orange-100 text-orange-700 border-orange-300';
  } else if (sizeNum === 4000) {
    return variant === 'full'
      ? 'bg-orange-600 text-white border-orange-700'
      : 'bg-orange-100 text-orange-600 border-orange-300';
  }
  // Range 4000-6000
  else if (sizeNum === 5000) {
    return variant === 'full'
      ? 'bg-amber-700 text-white border-amber-800'
      : 'bg-amber-100 text-amber-700 border-amber-300';
  } else if (sizeNum === 6000) {
    return variant === 'full'
      ? 'bg-amber-600 text-white border-amber-700'
      : 'bg-amber-100 text-amber-600 border-amber-300';
  }
  // Range 6000-8000
  else if (sizeNum === 7000) {
    return variant === 'full'
      ? 'bg-lime-600 text-white border-lime-700'
      : 'bg-lime-100 text-lime-600 border-lime-300';
  } else if (sizeNum === 8000) {
    return variant === 'full'
      ? 'bg-lime-500 text-white border-lime-600'
      : 'bg-lime-100 text-lime-500 border-lime-300';
  }
  // Range 8000-9000
  else if (sizeNum === 9000) {
    return variant === 'full'
      ? 'bg-green-600 text-white border-green-700'
      : 'bg-green-100 text-green-600 border-green-300';
  }
  // Default per taglie non esplicitamente definite
  else if (sizeNum < 500) {
    return variant === 'full'
      ? 'bg-purple-600 text-white border-purple-700'
      : 'bg-purple-100 text-purple-600 border-purple-300';
  } else if (sizeNum < 1000) {
    return variant === 'full'
      ? 'bg-pink-600 text-white border-pink-700'
      : 'bg-pink-100 text-pink-600 border-pink-300';
  } else if (sizeNum < 2000) {
    return variant === 'full'
      ? 'bg-rose-600 text-white border-rose-700'
      : 'bg-rose-100 text-rose-600 border-rose-300';
  } else if (sizeNum < 3000) {
    return variant === 'full'
      ? 'bg-red-600 text-white border-red-700'
      : 'bg-red-100 text-red-600 border-red-300';
  } else if (sizeNum < 4000) {
    return variant === 'full'
      ? 'bg-orange-600 text-white border-orange-700'
      : 'bg-orange-100 text-orange-600 border-orange-300';
  } else if (sizeNum < 6000) {
    return variant === 'full'
      ? 'bg-amber-600 text-white border-amber-700'
      : 'bg-amber-100 text-amber-600 border-amber-300';
  } else if (sizeNum < 8000) {
    return variant === 'full'
      ? 'bg-lime-600 text-white border-lime-700'
      : 'bg-lime-100 text-lime-600 border-lime-300';
  } else if (sizeNum < 9000) {
    return variant === 'full'
      ? 'bg-green-600 text-white border-green-700'
      : 'bg-green-100 text-green-600 border-green-300';
  } else {
    return variant === 'full'
      ? 'bg-emerald-600 text-white border-emerald-700'
      : 'bg-emerald-100 text-emerald-600 border-emerald-300';
  }
}