import { Request, Response } from 'express';
import { getStorage } from '../storage';

/**
 * Controller ottimizzato per la gestione delle ceste
 * Riduce significativamente il carico di dati e migliora le prestazioni
 */

// Cache locale per le informazioni statiche (aggiornata ogni 5 minuti)
const flupsysCache: {[key: number]: any} = {};
const sizesCache: {[key: number]: any} = {};
let lastCacheUpdate = 0;

// Funzione per aggiornare la cache delle informazioni statiche
async function updateStaticCache() {
  const now = Date.now();
  if (now - lastCacheUpdate > 5 * 60 * 1000) { // 5 minuti
    const storage = getStorage();
    
    // Aggiorna cache FLUPSY
    const flupsys = await storage.getFlupsys();
    flupsys.forEach(flupsy => {
      flupsysCache[flupsy.id] = {
        id: flupsy.id,
        name: flupsy.name,
        location: flupsy.location,
        productionCenter: flupsy.productionCenter,
        maxPositions: flupsy.maxPositions
      };
    });
    
    // Aggiorna cache taglie
    const sizes = await storage.getSizes();
    sizes.forEach(size => {
      sizesCache[size.id] = {
        id: size.id,
        code: size.code,
        name: size.name,
        color: size.color
      };
    });
    
    lastCacheUpdate = now;
    console.log('Cache statica aggiornata per controller ceste ottimizzato');
  }
}

/**
 * Restituisce una lista di ceste ottimizzata per la visualizzazione
 * con dati ridotti al minimo essenziale per migliorare le prestazioni
 */
export async function getBasketsOptimized(req: Request, res: Response) {
  try {
    const storage = getStorage();
    
    // Aggiorna la cache delle informazioni statiche se necessario
    await updateStaticCache();
    
    // Estrai i parametri della query
    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : 50;
    const flupsyId = req.query.flupsyId ? parseInt(req.query.flupsyId as string) : undefined;
    const state = req.query.state as string | undefined;
    const search = req.query.search as string | undefined;
    const sortBy = req.query.sortBy as string | undefined;
    const sortDir = (req.query.sortDir as "asc" | "desc") || "asc";
    
    console.log(`Richiesta cestelli ottimizzata: page=${page}, pageSize=${pageSize}, flupsyId=${flupsyId}, state=${state}, search=${search}`);
    
    // Ottieni solo i dati essenziali delle ceste
    const result = await storage.getBasketsOptimized({
      page,
      pageSize,
      flupsyId,
      state,
      search,
      sortBy,
      sortDir,
      includeDetails: false // Non includiamo tutti i dettagli
    });
    
    // Per ogni cesta, aggiungiamo solo le informazioni essenziali per la visualizzazione
    const enhancedBaskets = await Promise.all(result.baskets.map(async (basket: any) => {
      // Informazioni base cesta
      const enhancedBasket = {
        id: basket.id,
        physicalNumber: basket.physicalNumber,
        flupsyId: basket.flupsyId,
        row: basket.row,
        position: basket.position,
        state: basket.state,
        currentCycleId: basket.currentCycleId,
      };
      
      // Aggiungi FLUPSY dalla cache
      if (basket.flupsyId && flupsysCache[basket.flupsyId]) {
        enhancedBasket.flupsyName = flupsysCache[basket.flupsyId].name;
      }
      
      // Ottieni informazioni essenziali ciclo e operazioni
      if (basket.currentCycleId) {
        // Otteniamo solo l'ultima operazione invece di tutte
        const operations = await storage.getLastOperationByCycle(basket.currentCycleId);
        if (operations) {
          const lastOperation = operations;
          
          // Aggiungi informazioni essenziali sull'ultima operazione
          enhancedBasket.lastOperation = {
            id: lastOperation.id,
            type: lastOperation.type,
            date: lastOperation.date,
            sizeId: lastOperation.sizeId,
            animalCount: lastOperation.animalCount
          };
          
          // Aggiungi taglia dalla cache
          if (lastOperation.sizeId && sizesCache[lastOperation.sizeId]) {
            enhancedBasket.size = sizesCache[lastOperation.sizeId];
          } else {
            enhancedBasket.size = { code: null, name: 'Non disponibile', color: '#e2e8f0' };
          }
          
          // Aggiungi conteggio animali
          enhancedBasket.animalCount = lastOperation.animalCount;
        }
      }
      
      return enhancedBasket;
    }));
    
    // Restituisci i dati con la paginazione
    return res.json({
      baskets: enhancedBaskets,
      totalCount: result.totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(result.totalCount / pageSize)
    });
  } catch (error) {
    console.error('Errore nella richiesta cestelli ottimizzata:', error);
    return res.status(500).json({ 
      message: 'Errore durante il recupero delle ceste',
      error: (error as any).message 
    });
  }
}

/**
 * Ottiene una singola cesta con tutti i dettagli
 */
export async function getBasketDetailById(req: Request, res: Response) {
  try {
    const basketId = parseInt(req.params.id);
    const storage = getStorage();
    
    // Qui otteniamo tutti i dettagli poiché è una richiesta singola
    const basket = await storage.getBasket(basketId);
    if (!basket) {
      return res.status(404).json({ message: 'Cesta non trovata' });
    }
    
    // Ottieni i dettagli completi
    const flupsy = await storage.getFlupsy(basket.flupsyId);
    const operations = await storage.getOperationsByBasket(basketId);
    let currentCycle = null;
    
    if (basket.currentCycleId) {
      currentCycle = await storage.getCycle(basket.currentCycleId);
    }
    
    // Trova l'ultima operazione
    const lastOperation = operations.length > 0 
      ? operations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
      : null;
    
    // Aggiungi informazioni sulla taglia
    let size = null;
    if (lastOperation && lastOperation.sizeId) {
      size = await storage.getSize(lastOperation.sizeId);
    }
    
    // Costruisci la risposta completa
    const basketWithDetails = {
      ...basket,
      flupsy,
      flupsyName: flupsy?.name || 'Sconosciuto',
      lastOperation,
      currentCycle,
      operations,
      size: size || { code: null, name: 'Non disponibile', color: '#e2e8f0' },
      animalCount: lastOperation?.animalCount || 0
    };
    
    return res.json(basketWithDetails);
  } catch (error) {
    console.error('Errore nel recupero dettagli cesta:', error);
    return res.status(500).json({ 
      message: 'Errore durante il recupero dei dettagli della cesta',
      error: (error as any).message 
    });
  }
}