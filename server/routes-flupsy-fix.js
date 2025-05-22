/**
 * Implementazione completa per la correzione dell'endpoint FLUPSY
 * 
 * Questo file contiene il codice per aggiornare l'endpoint /api/flupsys
 * in modo che utilizzi le viste materializzate per ottenere dati accurati
 * per la visualizzazione della mappa FLUPSY.
 */

// Sostituire questa parte nel file server/routes.ts
// Cercare l'endpoint app.get("/api/flupsys", ...)

// NUOVO ENDPOINT
app.get("/api/flupsys", async (req, res) => {
  try {
    // Ottenere i FLUPSY base
    const flupsys = await storage.getFlupsys();
    
    // Aggiungere statistiche per ciascun FLUPSY se richiesto
    const includeStats = req.query.includeStats === 'true';
    
    if (includeStats) {
      // Per ogni FLUPSY, aggiungi informazioni sui cestelli e cicli attivi
      const enhancedFlupsys = await Promise.all(flupsys.map(async (flupsy) => {
        // Ottieni tutti i cestelli associati a questo FLUPSY
        const baskets = await storage.getBasketsByFlupsy(flupsy.id);
        
        // Array per memorizzare gli ID dei cestelli
        const basketIds = baskets.map(b => b.id);
        
        // Ottieni i conteggi dei cicli attivi e cestelli dalla vista materializzata
        let activeBaskets = 0;
        let totalAnimals = 0;
        const sizeDistribution = {};
        
        try {
          console.log(`Recupero statistiche per FLUPSY ${flupsy.id} da vista materializzata`);
          
          // Query sulla vista materializzata per ottenere conteggi e somme
          const activeBasketStats = await db.execute(
            sql`SELECT COUNT(*) as active_count 
                FROM mv_active_baskets 
                WHERE flupsy_id = ${flupsy.id}`
          );
          
          if (activeBasketStats && activeBasketStats.rows && activeBasketStats.rows.length > 0) {
            activeBaskets = parseInt(activeBasketStats.rows[0].active_count || '0', 10);
          }
          
          // Recupera il totale animali dalla vista materializzata
          const animalStats = await db.execute(
            sql`SELECT COALESCE(SUM(animal_count), 0) as total_animals 
                FROM mv_active_baskets 
                WHERE flupsy_id = ${flupsy.id}`
          );
          
          if (animalStats && animalStats.rows && animalStats.rows.length > 0) {
            totalAnimals = parseInt(animalStats.rows[0].total_animals || '0', 10);
          }
          
          // Recupera la distribuzione delle taglie
          const sizeStats = await db.execute(
            sql`SELECT s.code, COALESCE(SUM(b.animal_count), 0) as count
                FROM mv_active_baskets b
                LEFT JOIN sizes s ON b.size_id = s.id
                WHERE b.flupsy_id = ${flupsy.id} AND s.code IS NOT NULL
                GROUP BY s.code`
          );
          
          if (sizeStats && sizeStats.rows && sizeStats.rows.length > 0) {
            sizeStats.rows.forEach(row => {
              if (row.code) {
                sizeDistribution[row.code] = parseInt(row.count || '0', 10);
              }
            });
          }
          
          console.log(`Statistiche FLUPSY ${flupsy.id}: activeBaskets=${activeBaskets}, totalAnimals=${totalAnimals}`);
          
        } catch (e) {
          console.error(`Errore recupero statistiche da vista materializzata per FLUPSY ${flupsy.id}:`, e);
          console.log('Fallback al metodo di calcolo tradizionale...');
          
          // Fallback al metodo originale in caso di errore
          // Conta i cestelli attivi
          const activeCyclesCount = await db.select({ count: count() })
            .from(cycles)
            .where(
              and(
                inArray(cycles.basketId, basketIds),
                isNull(cycles.endDate)
              )
            );
          
          activeBaskets = activeCyclesCount[0]?.count || 0;
          
          // Calcola il totale degli animali e la distribuzione delle taglie
          for (const basket of baskets) {
            if (basket.currentCycleId) {
              const lastOperation = await storage.getLastOperationForBasket(basket.id);
              if (lastOperation && lastOperation.animalCount) {
                totalAnimals += lastOperation.animalCount;
                
                if (lastOperation.sizeId) {
                  const size = await storage.getSize(lastOperation.sizeId);
                  if (size && size.code) {
                    if (!sizeDistribution[size.code]) {
                      sizeDistribution[size.code] = 0;
                    }
                    sizeDistribution[size.code] += lastOperation.animalCount;
                  }
                }
              }
            }
          }
        }
        
        // Calcola il resto delle statistiche
        const totalBaskets = baskets.length;
        const availableBaskets = totalBaskets - activeBaskets;
        const maxPositions = flupsy.maxPositions || 10;
        const freePositions = Math.max(0, maxPositions - totalBaskets);
        
        // Calcola la densità media degli animali
        const basketsWithAnimals = activeBaskets > 0 ? activeBaskets : 1; // Evita divisione per zero
        const avgAnimalDensity = Math.round(totalAnimals / basketsWithAnimals);
        
        // Calcola la percentuale di occupazione con cestelli attivi
        const activeBasketPercentage = maxPositions > 0 
          ? Math.round((activeBaskets / maxPositions) * 100) 
          : 0;
        
        // Aggiungi le statistiche al FLUPSY
        return {
          ...flupsy,
          totalBaskets,
          activeBaskets,
          availableBaskets,
          freePositions,
          totalAnimals,
          sizeDistribution,
          avgAnimalDensity,
          activeBasketPercentage
        };
      }));
      
      return res.json(enhancedFlupsys);
    }
    
    // Altrimenti, restituisci i FLUPSY senza statistiche aggiuntive
    res.json(flupsys);
  } catch (error) {
    console.error("Error fetching FLUPSY units:", error);
    res.status(500).json({ message: "Failed to fetch FLUPSY units" });
  }
});

// Aggiorna anche l'endpoint per un singolo FLUPSY
app.get("/api/flupsys/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid FLUPSY ID" });
    }

    const flupsy = await storage.getFlupsy(id);
    if (!flupsy) {
      return res.status(404).json({ message: "FLUPSY not found" });
    }
    
    // Ottieni tutti i cestelli per questo FLUPSY
    const baskets = await storage.getBasketsByFlupsy(id);
    
    // Calcola statistiche dalla vista materializzata
    let activeBaskets = 0;
    let totalAnimals = 0;
    const sizeDistribution = {};
    
    try {
      // Query sulla vista materializzata
      const activeBasketStats = await db.execute(
        sql`SELECT COUNT(*) as active_count 
            FROM mv_active_baskets 
            WHERE flupsy_id = ${id}`
      );
      
      if (activeBasketStats && activeBasketStats.rows && activeBasketStats.rows.length > 0) {
        activeBaskets = parseInt(activeBasketStats.rows[0].active_count || '0', 10);
      }
      
      // Recupera il totale animali
      const animalStats = await db.execute(
        sql`SELECT COALESCE(SUM(animal_count), 0) as total_animals 
            FROM mv_active_baskets 
            WHERE flupsy_id = ${id}`
      );
      
      if (animalStats && animalStats.rows && animalStats.rows.length > 0) {
        totalAnimals = parseInt(animalStats.rows[0].total_animals || '0', 10);
      }
      
      // Recupera la distribuzione delle taglie
      const sizeStats = await db.execute(
        sql`SELECT s.code, COALESCE(SUM(b.animal_count), 0) as count
            FROM mv_active_baskets b
            LEFT JOIN sizes s ON b.size_id = s.id
            WHERE b.flupsy_id = ${id} AND s.code IS NOT NULL
            GROUP BY s.code`
      );
      
      if (sizeStats && sizeStats.rows && sizeStats.rows.length > 0) {
        sizeStats.rows.forEach(row => {
          if (row.code) {
            sizeDistribution[row.code] = parseInt(row.count || '0', 10);
          }
        });
      }
      
    } catch (e) {
      console.error(`Errore recupero statistiche da vista materializzata per FLUPSY ${id}:`, e);
      
      // Metodo di fallback
      activeBaskets = baskets.filter(b => b.currentCycleId !== null).length;
      
      // Calcola il totale degli animali e la distribuzione delle taglie
      for (const basket of baskets.filter(b => b.currentCycleId !== null)) {
        const lastOperation = await storage.getLastOperationForBasket(basket.id);
        if (lastOperation && lastOperation.animalCount) {
          totalAnimals += lastOperation.animalCount;
          
          if (lastOperation.sizeId) {
            const size = await storage.getSize(lastOperation.sizeId);
            if (size && size.code) {
              if (!sizeDistribution[size.code]) {
                sizeDistribution[size.code] = 0;
              }
              sizeDistribution[size.code] += lastOperation.animalCount;
            }
          }
        }
      }
    }
    
    // Calcola il resto delle statistiche
    const totalBaskets = baskets.length;
    const availableBaskets = totalBaskets - activeBaskets;
    const maxPositions = flupsy.maxPositions || 10;
    const freePositions = Math.max(0, maxPositions - totalBaskets);
    
    // Calcola la densità media degli animali
    const basketsWithAnimals = activeBaskets > 0 ? activeBaskets : 1;
    const avgAnimalDensity = Math.round(totalAnimals / basketsWithAnimals);
    
    // Calcola la percentuale di occupazione con cestelli attivi
    const activeBasketPercentage = maxPositions > 0 
      ? Math.round((activeBaskets / maxPositions) * 100) 
      : 0;
    
    // Aggiungi le statistiche al FLUPSY
    const enhancedFlupsy = {
      ...flupsy,
      totalBaskets,
      activeBaskets,
      availableBaskets,
      freePositions,
      totalAnimals,
      sizeDistribution,
      avgAnimalDensity,
      activeBasketPercentage
    };
    
    res.json(enhancedFlupsy);
  } catch (error) {
    console.error("Error fetching FLUPSY:", error);
    res.status(500).json({ message: "Failed to fetch FLUPSY" });
  }
});