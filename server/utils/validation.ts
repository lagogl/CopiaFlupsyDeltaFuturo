/**
 * Utility di validazione per il sistema FLUPSY
 * 
 * Queste funzioni consentono di validare e normalizzare i valori 
 * per garantire la coerenza dei dati nel sistema.
 */

/**
 * Valida e normalizza il valore 'row' (fila) di un cestello
 * Accetta solo 'DX' o 'SX' come valori validi, restituendo un default se necessario
 * 
 * @param row - Il valore row da validare
 * @param defaultRow - Valore di default da usare in caso di valore non valido (default: 'DX')
 * @returns Il valore row normalizzato
 */
export function validateBasketRow(row: string | null | undefined, defaultRow: 'DX' | 'SX' = 'DX'): 'DX' | 'SX' {
  if (!row || (row !== 'DX' && row !== 'SX')) {
    console.warn(`Valore row "${row}" non valido o mancante. Impostato a "${defaultRow}" come default`);
    return defaultRow;
  }
  return row;
}

/**
 * Valida e normalizza una posizione del cestello
 * Garantisce che il numero di posizione sia un numero valido maggiore di zero
 * 
 * @param position - Il valore posizione da validare
 * @param defaultPosition - Valore di default da usare in caso di valore non valido (default: 1)
 * @returns Il valore posizione normalizzato
 */
export function validateBasketPosition(position: number | null | undefined, defaultPosition: number = 1): number {
  if (position === null || position === undefined || isNaN(Number(position)) || Number(position) < 1) {
    console.warn(`Valore posizione "${position}" non valido o mancante. Impostato a ${defaultPosition} come default`);
    return defaultPosition;
  }
  return Number(position);
}