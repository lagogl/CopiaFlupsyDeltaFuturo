/**
 * Controller per il modulo di Vendite Avanzate
 * Gestisce la configurazione di sacchi e la generazione di rapporti di vendita dettagliati
 */
import { Request, Response } from "express";
import { db } from "../db";
import { eq, desc, and, gte, lte, sql, isNotNull, inArray } from "drizzle-orm";
import { pdfGenerator } from "../services/pdf-generator";
import path from "path";
import fs from "fs/promises";
import { 
  advancedSales,
  saleBags,
  bagAllocations,
  saleOperationsRef,
  operations,
  baskets,
  sizes,
  externalCustomersSync,
  insertAdvancedSaleSchema,
  insertSaleBagSchema,
  insertBagAllocationSchema,
  insertSaleOperationsRefSchema
} from "../../shared/schema";
import { format } from "date-fns";

/**
 * Ottiene le operazioni di vendita disponibili per creare vendite avanzate
 */
export async function getAvailableSaleOperations(req: Request, res: Response) {
  try {
    const { dateFrom, dateTo, processed } = req.query;
    
    let dateFilter = [];
    if (dateFrom) {
      dateFilter.push(gte(operations.date, dateFrom as string));
    }
    if (dateTo) {
      dateFilter.push(lte(operations.date, dateTo as string));
    }

    // Query per operazioni di vendita non ancora processate
    const saleOperations = await db.select({
      operationId: operations.id,
      basketId: operations.basketId,
      date: operations.date,
      animalCount: operations.animalCount,
      totalWeight: operations.totalWeight,
      animalsPerKg: operations.animalsPerKg,
      sizeId: operations.sizeId,
      basketPhysicalNumber: baskets.physicalNumber,
      sizeCode: sizes.code,
      sizeName: sizes.name,
      processed: sql<boolean>`CASE WHEN ${saleOperationsRef.id} IS NOT NULL THEN true ELSE false END`
    })
    .from(operations)
    .leftJoin(baskets, eq(operations.basketId, baskets.id))
    .leftJoin(sizes, eq(operations.sizeId, sizes.id))
    .leftJoin(saleOperationsRef, eq(operations.id, saleOperationsRef.operationId))
    .where(and(
      eq(operations.type, 'vendita'),
      isNotNull(operations.animalCount),
      isNotNull(operations.totalWeight),
      isNotNull(operations.animalsPerKg),
      processed === 'true' ? isNotNull(saleOperationsRef.id) : sql`${saleOperationsRef.id} IS NULL`,
      ...dateFilter
    ))
    .orderBy(desc(operations.date), desc(operations.id));

    res.json({
      success: true,
      operations: saleOperations
    });
  } catch (error) {
    console.error("Errore nel recupero operazioni vendita:", error);
    res.status(500).json({
      success: false,
      error: "Errore nel recupero delle operazioni di vendita"
    });
  }
}

/**
 * Crea una nuova vendita avanzata
 */
export async function createAdvancedSale(req: Request, res: Response) {
  try {
    const {
      operationIds,
      customerData,
      saleDate,
      notes
    } = req.body;

    if (!operationIds || !Array.isArray(operationIds) || operationIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "È necessario selezionare almeno un'operazione di vendita"
      });
    }

    // Verifica che le operazioni non siano già state processate
    const existingRefs = await db.select()
      .from(saleOperationsRef)
      .where(inArray(saleOperationsRef.operationId, operationIds));

    if (existingRefs.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Alcune operazioni selezionate sono già state processate"
      });
    }

    // Genera numero vendita progressivo
    const lastSale = await db.select({ saleNumber: advancedSales.saleNumber })
      .from(advancedSales)
      .orderBy(desc(advancedSales.id))
      .limit(1);

    let nextNumber = 1;
    if (lastSale.length > 0 && lastSale[0].saleNumber) {
      const match = lastSale[0].saleNumber.match(/VAV-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }
    const saleNumber = `VAV-${nextNumber.toString().padStart(6, '0')}`;

    const result = await db.transaction(async (tx) => {
      // Crea vendita master
      const [newSale] = await tx.insert(advancedSales).values({
        saleNumber,
        customerId: customerData?.id || null,
        customerName: customerData?.name || null,
        customerDetails: customerData ? JSON.stringify(customerData) : null,
        saleDate: saleDate || format(new Date(), 'yyyy-MM-dd'),
        status: 'draft',
        notes: notes || null
      }).returning();

      // Recupera dettagli operazioni
      const operationsData = await tx.select({
        id: operations.id,
        basketId: operations.basketId,
        animalCount: operations.animalCount,
        totalWeight: operations.totalWeight,
        animalsPerKg: operations.animalsPerKg,
        sizeCode: sizes.code,
        basketPhysicalNumber: baskets.physicalNumber
      })
      .from(operations)
      .leftJoin(baskets, eq(operations.basketId, baskets.id))
      .leftJoin(sizes, eq(operations.sizeId, sizes.id))
      .where(inArray(operations.id, operationIds));

      // Crea riferimenti operazioni
      for (const op of operationsData) {
        await tx.insert(saleOperationsRef).values({
          advancedSaleId: newSale.id,
          operationId: op.id,
          basketId: op.basketId,
          originalAnimals: op.animalCount,
          originalWeight: op.totalWeight,
          originalAnimalsPerKg: op.animalsPerKg,
          includedInSale: true
        });
      }

      // Calcola totali
      const totals = operationsData.reduce((acc, op) => {
        acc.totalAnimals += op.animalCount || 0;
        acc.totalWeight += op.totalWeight || 0;
        return acc;
      }, { totalAnimals: 0, totalWeight: 0 });

      // Aggiorna totali vendita
      await tx.update(advancedSales)
        .set({
          totalAnimals: totals.totalAnimals,
          totalWeight: totals.totalWeight,
          updatedAt: new Date()
        })
        .where(eq(advancedSales.id, newSale.id));

      return { newSale, operationsData, totals };
    });

    res.status(201).json({
      success: true,
      message: "Vendita avanzata creata con successo",
      sale: result.newSale,
      operations: result.operationsData,
      totals: result.totals
    });
  } catch (error) {
    console.error("Errore nella creazione vendita avanzata:", error);
    console.error("Stack trace:", error.stack);
    res.status(500).json({
      success: false,
      error: `Errore nella creazione della vendita avanzata: ${error.message}`
    });
  }
}

/**
 * Configura i sacchi per una vendita specifica
 */
export async function configureBags(req: Request, res: Response) {
  try {
    const { saleId } = req.params;
    const { bags } = req.body;

    if (!bags || !Array.isArray(bags) || bags.length === 0) {
      return res.status(400).json({
        success: false,
        error: "È necessario configurare almeno un sacco"
      });
    }

    // Verifica che la vendita esista
    const sale = await db.select()
      .from(advancedSales)
      .where(eq(advancedSales.id, parseInt(saleId)))
      .limit(1);

    if (sale.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Vendita non trovata"
      });
    }

    if (sale[0].status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: "Non è possibile modificare una vendita già confermata"
      });
    }

    await db.transaction(async (tx) => {
      // Elimina sacchi esistenti
      await tx.delete(bagAllocations)
        .where(sql`${bagAllocations.saleBagId} IN (
          SELECT id FROM ${saleBags} WHERE ${saleBags.advancedSaleId} = ${parseInt(saleId)}
        )`);
      
      await tx.delete(saleBags)
        .where(eq(saleBags.advancedSaleId, parseInt(saleId)));

      // Crea nuovi sacchi
      for (let i = 0; i < bags.length; i++) {
        const bag = bags[i];
        
        // Validazione peso loss (max 1.5kg)
        const weightLoss = Math.min(bag.weightLoss || 0, 1.5);
        const finalWeight = bag.originalWeight - weightLoss;
        
        // Ricalcola animals per kg con limite 5%
        let newAnimalsPerKg = bag.animalCount / (finalWeight / 1000);
        const maxVariation = bag.originalAnimalsPerKg * 0.05;
        
        if (Math.abs(newAnimalsPerKg - bag.originalAnimalsPerKg) > maxVariation) {
          newAnimalsPerKg = bag.originalAnimalsPerKg + 
            (newAnimalsPerKg > bag.originalAnimalsPerKg ? maxVariation : -maxVariation);
        }

        const [newBag] = await tx.insert(saleBags).values({
          advancedSaleId: parseInt(saleId),
          bagNumber: i + 1,
          sizeCode: bag.sizeCode,
          totalWeight: finalWeight,
          originalWeight: bag.originalWeight,
          weightLoss: weightLoss,
          animalCount: bag.animalCount,
          animalsPerKg: newAnimalsPerKg,
          originalAnimalsPerKg: bag.originalAnimalsPerKg,
          wastePercentage: bag.wastePercentage || 0,
          notes: bag.notes || null
        }).returning();

        // Crea allocazioni per questo sacco
        if (bag.allocations && Array.isArray(bag.allocations)) {
          for (const allocation of bag.allocations) {
            await tx.insert(bagAllocations).values({
              saleBagId: newBag.id,
              sourceOperationId: allocation.sourceOperationId,
              sourceBasketId: allocation.sourceBasketId,
              allocatedAnimals: allocation.allocatedAnimals,
              allocatedWeight: allocation.allocatedWeight,
              sourceAnimalsPerKg: allocation.sourceAnimalsPerKg,
              sourceSizeCode: allocation.sourceSizeCode
            });
          }
        }
      }

      // Aggiorna totali vendita
      const totalBags = bags.length;
      const totalWeight = bags.reduce((sum, bag) => sum + (bag.originalWeight - (bag.weightLoss || 0)), 0);
      const totalAnimals = bags.reduce((sum, bag) => sum + bag.animalCount, 0);

      await tx.update(advancedSales)
        .set({
          totalBags,
          totalWeight,
          totalAnimals,
          updatedAt: new Date()
        })
        .where(eq(advancedSales.id, parseInt(saleId)));
    });

    res.json({
      success: true,
      message: "Configurazione sacchi completata con successo"
    });
  } catch (error) {
    console.error("Errore nella configurazione sacchi:", error);
    res.status(500).json({
      success: false,
      error: "Errore nella configurazione dei sacchi"
    });
  }
}

/**
 * Ottiene i dettagli di una vendita avanzata
 */
export async function getAdvancedSale(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const sale = await db.select()
      .from(advancedSales)
      .where(eq(advancedSales.id, parseInt(id)))
      .limit(1);

    if (sale.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Vendita non trovata"
      });
    }

    // Recupera sacchi
    const bags = await db.select()
      .from(saleBags)
      .where(eq(saleBags.advancedSaleId, parseInt(id)))
      .orderBy(saleBags.bagNumber);

    // Recupera allocazioni per ogni sacco
    const bagsWithAllocations = await Promise.all(
      bags.map(async (bag) => {
        const allocations = await db.select({
          id: bagAllocations.id,
          sourceOperationId: bagAllocations.sourceOperationId,
          sourceBasketId: bagAllocations.sourceBasketId,
          allocatedAnimals: bagAllocations.allocatedAnimals,
          allocatedWeight: bagAllocations.allocatedWeight,
          sourceAnimalsPerKg: bagAllocations.sourceAnimalsPerKg,
          sourceSizeCode: bagAllocations.sourceSizeCode,
          basketPhysicalNumber: baskets.physicalNumber
        })
        .from(bagAllocations)
        .leftJoin(baskets, eq(bagAllocations.sourceBasketId, baskets.id))
        .where(eq(bagAllocations.saleBagId, bag.id));

        return {
          ...bag,
          allocations
        };
      })
    );

    // Recupera operazioni di riferimento
    const operations = await db.select({
      operationId: saleOperationsRef.operationId,
      basketId: saleOperationsRef.basketId,
      originalAnimals: saleOperationsRef.originalAnimals,
      originalWeight: saleOperationsRef.originalWeight,
      originalAnimalsPerKg: saleOperationsRef.originalAnimalsPerKg,
      includedInSale: saleOperationsRef.includedInSale,
      basketPhysicalNumber: baskets.physicalNumber,
      date: operations.date
    })
    .from(saleOperationsRef)
    .leftJoin(baskets, eq(saleOperationsRef.basketId, baskets.id))
    .leftJoin(operations, eq(saleOperationsRef.operationId, operations.id))
    .where(eq(saleOperationsRef.advancedSaleId, parseInt(id)));

    res.json({
      success: true,
      sale: sale[0],
      bags: bagsWithAllocations,
      operations: operationsRefs
    });
  } catch (error) {
    console.error("Errore nel recupero vendita avanzata:", error);
    res.status(500).json({
      success: false,
      error: "Errore nel recupero della vendita avanzata"
    });
  }
}

/**
 * Ottiene l'elenco delle vendite avanzate
 */
export async function getAdvancedSales(req: Request, res: Response) {
  try {
    const { status, dateFrom, dateTo, page = 1, pageSize = 20 } = req.query;

    let filters = [];
    if (status) {
      filters.push(eq(advancedSales.status, status as string));
    }
    if (dateFrom) {
      filters.push(gte(advancedSales.saleDate, dateFrom as string));
    }
    if (dateTo) {
      filters.push(lte(advancedSales.saleDate, dateTo as string));
    }

    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);

    const sales = await db.select()
      .from(advancedSales)
      .where(and(...filters))
      .orderBy(desc(advancedSales.createdAt))
      .limit(parseInt(pageSize as string))
      .offset(offset);

    const totalCount = await db.select({ count: sql`count(*)` })
      .from(advancedSales)
      .where(and(...filters));

    res.json({
      success: true,
      sales,
      pagination: {
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        totalCount: totalCount[0].count,
        totalPages: Math.ceil(totalCount[0].count / parseInt(pageSize as string))
      }
    });
  } catch (error) {
    console.error("Errore nel recupero vendite avanzate:", error);
    res.status(500).json({
      success: false,
      error: "Errore nel recupero delle vendite avanzate"
    });
  }
}

/**
 * Ottiene i clienti disponibili per la vendita
 */
export async function getCustomers(req: Request, res: Response) {
  try {
    const customers = await db.select()
      .from(externalCustomersSync)
      .where(eq(externalCustomersSync.isActive, true))
      .orderBy(externalCustomersSync.customerName)
      .limit(20);

    // Mappiamo i campi per compatibilità con il frontend
    const mappedCustomers = customers.map(customer => ({
      id: customer.id,
      externalId: customer.externalId,
      name: customer.customerName,
      businessName: customer.customerName,
      vatNumber: customer.vatNumber,
      address: customer.address,
      city: customer.city,
      province: customer.province,
      postalCode: customer.postalCode,
      phone: customer.phone,
      email: customer.email
    }));

    res.json({
      success: true,
      customers: mappedCustomers
    });
  } catch (error) {
    console.error("Errore nel recupero clienti:", error);
    res.status(500).json({
      success: false,
      error: "Errore nel recupero dei clienti"
    });
  }
}

/**
 * Genera PDF per una vendita avanzata
 */
export async function generateSalePDF(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Recupera dati completi della vendita
    const sale = await db.select()
      .from(advancedSales)
      .where(eq(advancedSales.id, parseInt(id)))
      .limit(1);

    if (sale.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Vendita non trovata"
      });
    }

    // Recupera sacchi con allocazioni
    const bags = await db.select()
      .from(saleBags)
      .where(eq(saleBags.advancedSaleId, parseInt(id)))
      .orderBy(saleBags.bagNumber);

    const bagsWithAllocations = await Promise.all(
      bags.map(async (bag) => {
        const allocations = await db.select({
          id: bagAllocations.id,
          sourceOperationId: bagAllocations.sourceOperationId,
          sourceBasketId: bagAllocations.sourceBasketId,
          allocatedAnimals: bagAllocations.allocatedAnimals,
          allocatedWeight: bagAllocations.allocatedWeight,
          sourceAnimalsPerKg: bagAllocations.sourceAnimalsPerKg,
          sourceSizeCode: bagAllocations.sourceSizeCode,
          basketPhysicalNumber: baskets.physicalNumber
        })
        .from(bagAllocations)
        .leftJoin(baskets, eq(bagAllocations.sourceBasketId, baskets.id))
        .where(eq(bagAllocations.saleBagId, bag.id));

        return {
          ...bag,
          allocations
        };
      })
    );

    // Recupera operazioni di riferimento
    const operationsRefs = await db.select({
      operationId: saleOperationsRef.operationId,
      basketId: saleOperationsRef.basketId,
      originalAnimals: saleOperationsRef.originalAnimals,
      originalWeight: saleOperationsRef.originalWeight,
      originalAnimalsPerKg: saleOperationsRef.originalAnimalsPerKg,
      includedInSale: saleOperationsRef.includedInSale,
      basketPhysicalNumber: baskets.physicalNumber,
      date: operations.date
    })
    .from(saleOperationsRef)
    .leftJoin(baskets, eq(saleOperationsRef.basketId, baskets.id))
    .leftJoin(operations, eq(saleOperationsRef.operationId, operations.id))
    .where(eq(saleOperationsRef.advancedSaleId, parseInt(id)));

    // Prepara dati per PDF
    const saleData = {
      sale: sale[0],
      bags: bagsWithAllocations,
      operations: operationsRefs
    };

    // Genera PDF
    const pdfBuffer = await pdfGenerator.generateSalePDF(saleData);

    // Crea directory per PDF se non esiste
    const pdfDir = path.join(process.cwd(), 'generated-pdfs');
    await fs.mkdir(pdfDir, { recursive: true });

    // Salva PDF su file system
    const fileName = `vendita-${sale[0].saleNumber}-${Date.now()}.pdf`;
    const filePath = path.join(pdfDir, fileName);
    await fs.writeFile(filePath, pdfBuffer);

    // Aggiorna record vendita con percorso PDF
    await db.update(advancedSales)
      .set({
        pdfPath: `/generated-pdfs/${fileName}`,
        updatedAt: new Date()
      })
      .where(eq(advancedSales.id, parseInt(id)));

    // Invia PDF come risposta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Vendita-${sale[0].saleNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (error) {
    console.error("Errore nella generazione PDF:", error);
    res.status(500).json({
      success: false,
      error: "Errore nella generazione del PDF"
    });
  }
}

/**
 * Scarica PDF di una vendita esistente
 */
export async function downloadSalePDF(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const sale = await db.select()
      .from(advancedSales)
      .where(eq(advancedSales.id, parseInt(id)))
      .limit(1);

    if (sale.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Vendita non trovata"
      });
    }

    if (!sale[0].pdfPath) {
      return res.status(404).json({
        success: false,
        error: "PDF non ancora generato per questa vendita"
      });
    }

    const filePath = path.join(process.cwd(), sale[0].pdfPath);
    
    try {
      await fs.access(filePath);
      res.download(filePath, `Vendita-${sale[0].saleNumber}.pdf`);
    } catch (fileError) {
      return res.status(404).json({
        success: false,
        error: "File PDF non trovato sul server"
      });
    }

  } catch (error) {
    console.error("Errore nel download PDF:", error);
    res.status(500).json({
      success: false,
      error: "Errore nel download del PDF"
    });
  }
}

/**
 * Aggiorna lo stato di una vendita
 */
export async function updateSaleStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['draft', 'confirmed', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Stato non valido. Valori consentiti: draft, confirmed, completed"
      });
    }

    const [updatedSale] = await db.update(advancedSales)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(advancedSales.id, parseInt(id)))
      .returning();

    if (!updatedSale) {
      return res.status(404).json({
        success: false,
        error: "Vendita non trovata"
      });
    }

    res.json({
      success: true,
      message: "Stato vendita aggiornato con successo",
      sale: updatedSale
    });

  } catch (error) {
    console.error("Errore nell'aggiornamento stato vendita:", error);
    res.status(500).json({
      success: false,
      error: "Errore nell'aggiornamento dello stato"
    });
  }
}