/**
 * Controller per il modulo di Vendite Avanzate
 * Gestisce la configurazione di sacchi e la generazione di rapporti di vendita dettagliati
 */
import { Request, Response } from "express";
import { db } from "../db";
import { eq, desc, and, gte, lte, sql, isNotNull, inArray } from "drizzle-orm";
import { pdfGenerator } from "../services/pdf-generator";
import path from "path";
import fs from "fs";
import fsPromises from "fs/promises";
import { 
  advancedSales,
  saleBags,
  bagAllocations,
  saleOperationsRef,
  operations,
  baskets,
  sizes,
  externalCustomersSync,
  externalSalesSync,
  clienti,
  ddt,
  ddtRighe,
  flupsys,
  configurazione,
  fattureInCloudConfig,
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
        operationId: operations.id,
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
          operationId: op.operationId,
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
  } catch (error: any) {
    console.error("Errore nella creazione vendita avanzata:", error);
    console.error("Stack trace:", error.stack);
    res.status(500).json({
      success: false,
      error: `Errore nella creazione della vendita avanzata: ${error.message}`
    });
  }
}

/**
 * Helper: Calcola sizeCode in base agli animali/kg
 */
async function calculateSizeCode(animalsPerKg: number): Promise<string> {
  const allSizes = await db.select({
    code: sizes.code,
    minAnimalsPerKg: sizes.minAnimalsPerKg,
    maxAnimalsPerKg: sizes.maxAnimalsPerKg
  })
  .from(sizes)
  .where(sql`${sizes.minAnimalsPerKg} IS NOT NULL AND ${sizes.maxAnimalsPerKg} IS NOT NULL`);

  for (const size of allSizes) {
    if (animalsPerKg >= (size.minAnimalsPerKg || 0) && animalsPerKg <= (size.maxAnimalsPerKg || Infinity)) {
      return size.code;
    }
  }

  return ''; // Nessuna taglia trovata
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
        
        // Validazione peso loss (max 1.5kg = 1500g)
        const weightLossGrams = Math.min(bag.weightLoss || 0, 1500);
        const finalWeight = bag.originalWeight - weightLossGrams;
        
        // Ricalcola animals per kg con limite 5%
        let newAnimalsPerKg = bag.animalCount / (finalWeight / 1000);
        const maxVariation = bag.originalAnimalsPerKg * 0.05;
        
        if (Math.abs(newAnimalsPerKg - bag.originalAnimalsPerKg) > maxVariation) {
          newAnimalsPerKg = bag.originalAnimalsPerKg + 
            (newAnimalsPerKg > bag.originalAnimalsPerKg ? maxVariation : -maxVariation);
        }

        // Calcola automaticamente la taglia in base agli animali/kg
        const calculatedSizeCode = await calculateSizeCode(Math.round(newAnimalsPerKg));
        const finalSizeCode = calculatedSizeCode || bag.sizeCode || '';

        const [newBag] = await tx.insert(saleBags).values({
          advancedSaleId: parseInt(saleId),
          bagNumber: i + 1,
          sizeCode: finalSizeCode,
          totalWeight: finalWeight,
          originalWeight: bag.originalWeight,
          weightLoss: weightLossGrams,
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
    const saleOperations = await db.select({
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
      operations: saleOperations
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
        totalCount: Number(totalCount[0].count),
        totalPages: Math.ceil(Number(totalCount[0].count) / parseInt(pageSize as string))
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
    // Recupera i clienti sincronizzati da Fatture in Cloud dalla tabella clienti
    const customers = await db.select()
      .from(clienti)
      .where(eq(clienti.attivo, true))
      .orderBy(clienti.denominazione);

    // Mappiamo i campi per compatibilità con il frontend
    const mappedCustomers = customers.map(customer => ({
      id: customer.id,
      externalId: customer.fattureInCloudId?.toString() || '',
      name: customer.denominazione,
      businessName: customer.denominazione,
      vatNumber: customer.piva || '',
      address: customer.indirizzo || '',
      city: customer.comune || '',
      province: customer.provincia || '',
      postalCode: customer.cap || '',
      phone: customer.telefono || '',
      email: customer.email || ''
    }));

    res.json({
      success: true,
      customers: mappedCustomers
    });
  } catch (error) {
    console.error("Errore nel recupero clienti da Fatture in Cloud:", error);
    res.status(500).json({
      success: false,
      error: "Errore nel recupero dei clienti da Fatture in Cloud"
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
      sale: {
        ...sale[0],
        customerName: sale[0].customerName || '', // Coerce null to empty string
        totalWeight: sale[0].totalWeight || 0, // Coerce null to 0
        totalAnimals: sale[0].totalAnimals || 0, // Coerce null to 0
        totalBags: sale[0].totalBags || 0, // Coerce null to 0
        notes: sale[0].notes || undefined, // Coerce null to undefined
        pdfPath: sale[0].pdfPath || undefined // Coerce null to undefined
      },
      bags: bagsWithAllocations.map(bag => ({
        ...bag,
        weightLoss: bag.weightLoss || 0, // Coerce null to 0
        wastePercentage: bag.wastePercentage || 0, // Coerce null to 0
        notes: bag.notes || undefined, // Coerce null to undefined
        allocations: bag.allocations.map(alloc => ({
          ...alloc,
          sourceAnimalsPerKg: alloc.sourceAnimalsPerKg || 0, // Coerce null to 0
          sourceSizeCode: alloc.sourceSizeCode || '', // Coerce null to empty string
          basketPhysicalNumber: alloc.basketPhysicalNumber || undefined // Coerce null to undefined
        }))
      })),
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

/**
 * Recupera ordini disponibili per le vendite avanzate
 */
export async function getAvailableOrders(req: Request, res: Response) {
  try {
    // Recupera ordini con status "Aperto" o "Parziale" e dati cliente
    const orders = await db.select({
      orderId: externalSalesSync.id,
      orderNumber: externalSalesSync.saleNumber,
      externalOrderId: externalSalesSync.externalId,
      orderDate: externalSalesSync.saleDate,
      customerId: externalSalesSync.customerId,
      customerName: externalSalesSync.customerName,
      productCode: externalSalesSync.productCode,
      productName: externalSalesSync.productName,
      quantity: externalSalesSync.quantity,
      unitPrice: externalSalesSync.unitPrice,
      totalAmount: externalSalesSync.totalAmount,
      deliveryDate: externalSalesSync.deliveryDate,
      status: externalSalesSync.status,
      notes: externalSalesSync.notes,
      // Dati cliente dalla tabella sincronizzata
      customerCode: externalCustomersSync.customerCode,
      customerBusinessName: externalCustomersSync.customerName,
      customerVatNumber: externalCustomersSync.vatNumber,
      customerAddress: externalCustomersSync.address,
      customerCity: externalCustomersSync.city,
      customerProvince: externalCustomersSync.province,
      customerPostalCode: externalCustomersSync.postalCode,
      customerPhone: externalCustomersSync.phone,
      customerEmail: externalCustomersSync.email
    })
    .from(externalSalesSync)
    .leftJoin(externalCustomersSync, eq(externalSalesSync.customerId, externalCustomersSync.externalId))
    .where(inArray(externalSalesSync.status, ['Aperto', 'Parziale']))
    .orderBy(desc(externalSalesSync.saleDate));

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error("Errore nel recupero ordini:", error);
    res.status(500).json({
      success: false,
      error: "Errore nel recupero degli ordini"
    });
  }
}

/**
 * Genera DDT per una vendita avanzata e lo invia a Fatture in Cloud
 */
export async function generateDDT(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "ID vendita richiesto"
      });
    }

    // Recupera vendita completa
    const sale = await db.select().from(advancedSales).where(eq(advancedSales.id, parseInt(id))).limit(1);
    
    if (sale.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Vendita non trovata"
      });
    }

    const saleData = sale[0];

    // Validazioni
    if (saleData.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        error: "Solo vendite confermate possono generare DDT"
      });
    }

    if (saleData.ddtStatus === 'inviato') {
      return res.status(400).json({
        success: false,
        error: "DDT già inviato per questa vendita"
      });
    }

    if (!saleData.customerId) {
      return res.status(400).json({
        success: false,
        error: "Cliente non specificato per la vendita"
      });
    }

    // Recupera cliente
    const clienteResult = await db.select().from(clienti).where(eq(clienti.id, saleData.customerId)).limit(1);
    
    if (clienteResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Cliente non trovato"
      });
    }

    const cliente = clienteResult[0];

    // Recupera sacchi e allocazioni
    const bags = await db.select({
      bag: saleBags,
      allocation: bagAllocations,
      basket: baskets,
      size: sizes
    })
    .from(saleBags)
    .leftJoin(bagAllocations, eq(saleBags.id, bagAllocations.saleBagId))
    .leftJoin(baskets, eq(bagAllocations.sourceBasketId, baskets.id))
    .leftJoin(sizes, eq(saleBags.sizeCode, sizes.code))
    .where(eq(saleBags.advancedSaleId, parseInt(id)))
    .orderBy(saleBags.bagNumber);

    if (bags.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Nessun sacco configurato per questa vendita"
      });
    }

    // Genera numero DDT progressivo
    const ultimoDDT = await db.select().from(ddt).orderBy(desc(ddt.numero)).limit(1);
    const numeroDDT = ultimoDDT.length > 0 ? ultimoDDT[0].numero + 1 : 1;

    // Recupera dati fiscali azienda attiva per snapshot mittente
    const companyIdConfig = await db.select()
      .from(configurazione)
      .where(eq(configurazione.chiave, 'fatture_in_cloud_company_id'))
      .limit(1);
    
    let companyId: number | null = null;
    let fiscalData: any = null;
    
    if (companyIdConfig.length > 0 && companyIdConfig[0].valore) {
      companyId = parseInt(companyIdConfig[0].valore);
      
      // Recupera dati fiscali dell'azienda
      const fiscalDataResult = await db.select()
        .from(fattureInCloudConfig)
        .where(eq(fattureInCloudConfig.companyId, companyId))
        .limit(1);
      
      if (fiscalDataResult.length > 0) {
        fiscalData = fiscalDataResult[0];
      }
    }

    // Crea DDT locale con snapshot cliente e mittente
    const [ddtCreato] = await db.insert(ddt).values({
      numero: numeroDDT,
      data: saleData.saleDate,
      clienteId: cliente.id,
      // Snapshot immutabile cliente
      clienteNome: cliente.denominazione,
      clienteIndirizzo: cliente.indirizzo !== 'N/A' ? cliente.indirizzo : '',
      clienteCitta: cliente.comune !== 'N/A' ? cliente.comune : '',
      clienteCap: cliente.cap !== 'N/A' ? cliente.cap : '',
      clienteProvincia: cliente.provincia !== 'N/A' ? cliente.provincia : '',
      clientePiva: cliente.piva !== 'N/A' ? cliente.piva : '',
      clienteCodiceFiscale: cliente.codiceFiscale !== 'N/A' ? cliente.codiceFiscale : '',
      clientePaese: cliente.paese || 'Italia',
      // Snapshot immutabile mittente (azienda)
      companyId: companyId,
      mittenteRagioneSociale: fiscalData?.ragioneSociale || null,
      mittenteIndirizzo: fiscalData?.indirizzo || null,
      mittenteCap: fiscalData?.cap || null,
      mittenteCitta: fiscalData?.citta || null,
      mittenteProvincia: fiscalData?.provincia || null,
      mittentePartitaIva: fiscalData?.partitaIva || null,
      mittenteCodiceFiscale: fiscalData?.codiceFiscale || null,
      mittenteTelefono: fiscalData?.telefono || null,
      mittenteEmail: fiscalData?.email || null,
      mittenteLogoPath: fiscalData?.logoPath || null,
      // Totali
      totaleColli: saleData.totalBags || 0,
      pesoTotale: saleData.totalWeight?.toString() || '0',
      note: saleData.notes,
      ddtStato: 'locale'
    }).returning();

    // Raggruppa sacchi per taglia per creare righe con subtotali
    const bagsPerSize: Record<string, typeof bags> = {};
    
    for (const item of bags) {
      const sizeCode = item.bag.sizeCode;
      if (!bagsPerSize[sizeCode]) {
        bagsPerSize[sizeCode] = [];
      }
      bagsPerSize[sizeCode].push(item);
    }

    // Crea righe DDT con pattern subtotali
    const righeCreate = [];
    
    for (const [sizeCode, sizeBags] of Object.entries(bagsPerSize)) {
      // Raggruppa per sacco (un sacco può avere più allocazioni)
      const bagsMap = new Map<number, typeof sizeBags>();
      
      for (const item of sizeBags) {
        const bagId = item.bag.id;
        if (!bagsMap.has(bagId)) {
          bagsMap.set(bagId, []);
        }
        bagsMap.get(bagId)!.push(item);
      }

      let totalAnimalsSize = 0;
      let totalWeightSize = 0;

      // Crea una riga per ogni sacco
      for (const [bagId, bagItems] of Array.from(bagsMap.entries())) {
        const bagData = bagItems[0].bag;
        const basketNames = bagItems
          .filter((item: any) => item.basket)
          .map((item: any) => `${item.basket!.physicalNumber}`)
          .join(', ');

        const descrizione = `Sacco #${bagData.bagNumber} - Cestelli: ${basketNames || 'N/A'} | ${bagData.animalCount.toLocaleString('it-IT')} animali | ${bagData.totalWeight} kg | ${Math.round(bagData.animalsPerKg).toLocaleString('it-IT')} anim/kg`;

        const [riga] = await db.insert(ddtRighe).values({
          ddtId: ddtCreato.id,
          descrizione,
          quantita: bagData.animalCount.toString(),
          unitaMisura: 'NR',
          prezzoUnitario: '0',
          advancedSaleId: parseInt(id),
          saleBagId: bagData.id,
          basketId: bagItems[0].basket?.id || null,
          sizeCode: sizeCode,
          flupsyName: null // Potresti aggiungere query per recuperare nome FLUPSY
        }).returning();

        righeCreate.push(riga);
        totalAnimalsSize += bagData.animalCount;
        totalWeightSize += bagData.totalWeight;
      }

      // Aggiungi riga SUBTOTALE per taglia
      const [rigaSubtotale] = await db.insert(ddtRighe).values({
        ddtId: ddtCreato.id,
        descrizione: `SUBTOTALE ${sizeCode}`,
        quantita: totalAnimalsSize.toString(),
        unitaMisura: 'NR',
        prezzoUnitario: '0',
        advancedSaleId: parseInt(id),
        sizeCode: sizeCode
      }).returning();

      righeCreate.push(rigaSubtotale);
    }

    // Aggiorna vendita con riferimento DDT
    await db.update(advancedSales)
      .set({
        ddtId: ddtCreato.id,
        ddtStatus: 'locale',
        updatedAt: new Date()
      })
      .where(eq(advancedSales.id, parseInt(id)));

    // TODO: Inviare a Fatture in Cloud
    // Questo richiede l'integrazione con il controller fatture-in-cloud-controller.ts
    // Per ora restituiamo il DDT locale creato

    res.json({
      success: true,
      ddt: ddtCreato,
      righe: righeCreate.length,
      message: `DDT #${numeroDDT} creato localmente. Implementare invio a Fatture in Cloud.`
    });

  } catch (error) {
    console.error("Errore nella generazione DDT:", error);
    res.status(500).json({
      success: false,
      error: "Errore nella generazione del DDT"
    });
  }
}

/**
 * Genera report PDF per una vendita avanzata
 */
export async function generatePDFReport(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "ID vendita richiesto"
      });
    }

    // Recupera vendita completa con dati correlati
    const sale = await db.select().from(advancedSales).where(eq(advancedSales.id, parseInt(id))).limit(1);
    
    if (sale.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Vendita non trovata"
      });
    }

    const saleData = sale[0];

    // Recupera cliente se presente
    let cliente = null;
    if (saleData.customerId) {
      const clienteResult = await db.select().from(clienti).where(eq(clienti.id, saleData.customerId)).limit(1);
      if (clienteResult.length > 0) {
        cliente = clienteResult[0];
      }
    }

    // Recupera sacchi con dettagli
    const bags = await db.select({
      bag: saleBags,
      allocation: bagAllocations,
      basket: baskets,
      flupsy: flupsys
    })
    .from(saleBags)
    .leftJoin(bagAllocations, eq(saleBags.id, bagAllocations.saleBagId))
    .leftJoin(baskets, eq(bagAllocations.sourceBasketId, baskets.id))
    .leftJoin(flupsys, eq(baskets.flupsyId, flupsys.id))
    .where(eq(saleBags.advancedSaleId, parseInt(id)))
    .orderBy(saleBags.bagNumber);

    // Genera PDF usando pdfkit (stesso pattern del report vagliatura)
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 50
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.contentType('application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Vendita_${saleData.saleNumber}_${saleData.saleDate}.pdf"`);
      res.send(pdfBuffer);
    });

    // Recupera dati fiscali dalla configurazione attiva
    const companiesResult = await db.select()
      .from(fattureInCloudConfig)
      .where(eq(fattureInCloudConfig.attivo, true))
      .limit(1);
    const companyData = companiesResult.length > 0 ? companiesResult[0] : null;

    const margin = 50;
    const tableWidth = doc.page.width - (2 * margin);

    // Logo aziendale (se presente)
    let yPosition = margin;
    if (companyData?.logoPath) {
      try {
        const logoPath = path.join(process.cwd(), 'attached_assets', 'logos', path.basename(companyData.logoPath));
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, margin, yPosition, { width: 150, height: 75, fit: [150, 75] });
        }
      } catch (error) {
        console.error('Errore caricamento logo:', error);
      }
    }

    // Intestazione a destra del logo
    doc.fontSize(22).fillColor('#1e40af').font('Helvetica-Bold')
       .text(`REPORT VENDITA ${saleData.saleNumber}`, margin + 170, yPosition + 10);
    doc.fontSize(10).fillColor('#64748b').font('Helvetica')
       .text(`Data: ${new Date(saleData.saleDate).toLocaleDateString('it-IT')}`, margin + 170, doc.y + 5);
    doc.text(`Stato: ${saleData.status === 'confirmed' ? 'Confermata' : saleData.status}`, margin + 170, doc.y);

    yPosition += 90;

    // === TABELLA MITTENTE E DESTINATARIO ===
    const boxWidth = (tableWidth - 20) / 2;
    const boxHeight = 130;

    // Box Mittente (sinistra) con bordo
    doc.rect(margin, yPosition, boxWidth, boxHeight).stroke();
    let boxY = yPosition + 10;
    
    doc.fontSize(12).fillColor('#1e40af').font('Helvetica-Bold')
       .text('MITTENTE', margin + 10, boxY);
    boxY += 20;

    if (companyData) {
      doc.fontSize(10).fillColor('#000').font('Helvetica-Bold');
      doc.text(companyData.ragioneSociale || '', margin + 10, boxY, { width: boxWidth - 20 });
      boxY += 15;
      doc.font('Helvetica');
      
      if (companyData.indirizzo) {
        doc.text(companyData.indirizzo, margin + 10, boxY, { width: boxWidth - 20 });
        boxY += 12;
      }
      if (companyData.citta) {
        doc.text(`${companyData.cap || ''} ${companyData.citta} (${companyData.provincia || ''})`, margin + 10, boxY, { width: boxWidth - 20 });
        boxY += 12;
      }
      if (companyData.partitaIva) {
        doc.text(`P.IVA: ${companyData.partitaIva}`, margin + 10, boxY, { width: boxWidth - 20 });
        boxY += 12;
      }
      if (companyData.codiceFiscale && companyData.codiceFiscale !== companyData.partitaIva) {
        doc.text(`C.F.: ${companyData.codiceFiscale}`, margin + 10, boxY, { width: boxWidth - 20 });
        boxY += 12;
      }
      if (companyData.email) {
        doc.fontSize(9).text(`Email: ${companyData.email}`, margin + 10, boxY, { width: boxWidth - 20 });
        boxY += 11;
      }
      if (companyData.telefono) {
        doc.fontSize(9).text(`Tel: ${companyData.telefono}`, margin + 10, boxY, { width: boxWidth - 20 });
      }
    }

    // Box Destinatario/Cliente (destra) con bordo
    const boxRightX = margin + boxWidth + 20;
    doc.rect(boxRightX, yPosition, boxWidth, boxHeight).stroke();
    boxY = yPosition + 10;

    doc.fontSize(12).fillColor('#1e40af').font('Helvetica-Bold')
       .text('DESTINATARIO', boxRightX + 10, boxY);
    boxY += 20;

    if (cliente) {
      doc.fontSize(10).fillColor('#000').font('Helvetica-Bold');
      doc.text(`${cliente.denominazione}`, boxRightX + 10, boxY, { width: boxWidth - 20 });
      boxY += 15;
      doc.font('Helvetica');
      
      if (cliente.indirizzo !== 'N/A') {
        doc.text(`${cliente.indirizzo}, ${cliente.cap} ${cliente.comune} (${cliente.provincia})`, boxRightX + 10, boxY, { width: boxWidth - 20 });
        boxY += 12;
      }
      if (cliente.piva !== 'N/A') {
        doc.text(`P.IVA: ${cliente.piva}`, boxRightX + 10, boxY, { width: boxWidth - 20 });
        boxY += 12;
      }
      if (cliente.codiceFiscale !== 'N/A' && cliente.codiceFiscale !== cliente.piva) {
        doc.text(`C.F.: ${cliente.codiceFiscale}`, boxRightX + 10, boxY, { width: boxWidth - 20 });
      }
    }

    yPosition += boxHeight + 20;

    // Tabella sacchi
    doc.fontSize(12).fillColor('#000').font('Helvetica-Bold').text('Dettaglio Sacchi', margin, yPosition);
    yPosition += 25;
    doc.fontSize(9).font('Helvetica');

    // Headers
    const col1Width = tableWidth * 0.08;  // Sacco
    const col2Width = tableWidth * 0.12;  // Taglia
    const col3Width = tableWidth * 0.25;  // Cestelli/FLUPSY
    const col4Width = tableWidth * 0.15;  // Animali
    const col5Width = tableWidth * 0.12;  // Peso (kg)
    const col6Width = tableWidth * 0.14;  // Anim/kg
    const col7Width = tableWidth * 0.14;  // Scarto %

    let currentY = yPosition;
    let xPos = margin;
    
    // Riga header con sfondo
    doc.rect(margin, currentY, tableWidth, 15).fill('#1e40af');
    doc.fillColor('#ffffff').font('Helvetica-Bold');
    
    doc.text('Sacco', xPos, currentY + 3, { width: col1Width, continued: false });
    xPos += col1Width;
    doc.text('Taglia', xPos, currentY + 3, { width: col2Width, continued: false });
    xPos += col2Width;
    doc.text('Cestelli / FLUPSY', xPos, currentY + 3, { width: col3Width, continued: false });
    xPos += col3Width;
    doc.text('Animali', xPos, currentY + 3, { width: col4Width, continued: false });
    xPos += col4Width;
    doc.text('Peso (kg)', xPos, currentY + 3, { width: col5Width, continued: false });
    xPos += col5Width;
    doc.text('Anim/kg', xPos, currentY + 3, { width: col6Width, continued: false });
    xPos += col6Width;
    doc.text('Scarto %', xPos, currentY + 3, { width: col7Width, continued: false });

    currentY += 20;
    doc.fillColor('#000').font('Helvetica');

    // Raggruppa per sacco
    const bagsMap = new Map<number, typeof bags>();
    for (const item of bags) {
      const bagId = item.bag.id;
      if (!bagsMap.has(bagId)) {
        bagsMap.set(bagId, []);
      }
      bagsMap.get(bagId)!.push(item);
    }

    // Stampa righe
    for (const [bagId, bagItems] of Array.from(bagsMap.entries())) {
      const bagData = bagItems[0].bag;
      const basketInfo = bagItems
        .filter((item: any) => item.basket && item.flupsy)
        .map((item: any) => `${item.basket!.physicalNumber} (${item.flupsy!.name})`)
        .join(', ');

      xPos = margin;
      
      // Alterna colore sfondo
      if (Array.from(bagsMap.entries()).indexOf([bagId, bagItems]) % 2 === 1) {
        doc.rect(margin, currentY, tableWidth, 12).fill('#f8fafc');
        doc.fillColor('#000');
      }
      
      doc.text(`#${bagData.bagNumber}`, xPos, currentY, { width: col1Width, continued: false });
      xPos += col1Width;
      doc.text(bagData.sizeCode, xPos, currentY, { width: col2Width, continued: false });
      xPos += col2Width;
      doc.text(basketInfo || 'N/A', xPos, currentY, { width: col3Width, continued: false });
      xPos += col3Width;
      doc.text(bagData.animalCount.toLocaleString('it-IT'), xPos, currentY, { width: col4Width, continued: false });
      xPos += col4Width;
      doc.text((bagData.totalWeight / 1000).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), xPos, currentY, { width: col5Width, continued: false });
      xPos += col5Width;
      doc.text(Math.round(bagData.animalsPerKg).toLocaleString('it-IT'), xPos, currentY, { width: col6Width, continued: false });
      xPos += col6Width;
      doc.text((bagData.wastePercentage || 0).toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 }), xPos, currentY, { width: col7Width, continued: false });
      
      currentY += 15;
    }

    // Nuova pagina per riepilogo totale (soluzione definitiva contro tagli)
    doc.addPage();
    currentY = doc.page.margins.top + 50;

    // Totali con box
    doc.rect(margin, currentY, tableWidth, 90).stroke();
    currentY += 15;
    
    doc.fontSize(12).fillColor('#1e40af').font('Helvetica-Bold').text('RIEPILOGO TOTALE', margin + 10, currentY);
    currentY += 25;
    
    doc.fontSize(10).fillColor('#000').font('Helvetica');
    doc.text(`Sacchi totali: ${saleData.totalBags || 0}`, margin + 10, currentY);
    currentY += 18;
    doc.text(`Animali totali: ${(saleData.totalAnimals || 0).toLocaleString('it-IT')}`, margin + 10, currentY);
    currentY += 18;
    doc.text(`Peso totale: ${((saleData.totalWeight || 0) / 1000).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`, margin + 10, currentY);
    
    if (saleData.notes) {
      currentY += 40;
      doc.fontSize(10).fillColor('#666').text(`Note: ${saleData.notes}`, margin, currentY, { width: tableWidth });
    }

    // Footer
    doc.fontSize(8).fillColor('#999').text(
      `Report generato il ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')} - FLUPSY Management System - MITO SRL`,
      margin,
      doc.page.height - 70,
      { align: 'center', width: tableWidth }
    );

    doc.end();

  } catch (error) {
    console.error("Errore nella generazione report PDF:", error);
    res.status(500).json({
      success: false,
      error: "Errore nella generazione del report PDF"
    });
  }
}

/**
 * Genera PDF del DDT
 */
export async function generateDDTPDF(req: Request, res: Response) {
  try {
    const { ddtId } = req.params;
    
    if (!ddtId) {
      return res.status(400).json({
        success: false,
        error: "ID DDT richiesto"
      });
    }

    // Recupera DDT
    const ddtResult = await db.select().from(ddt).where(eq(ddt.id, parseInt(ddtId))).limit(1);
    
    if (ddtResult.length === 0) {
      return res.status(404).json({
        success: false,
        error: "DDT non trovato"
      });
    }

    const ddtData = ddtResult[0];

    // Recupera righe DDT
    const righe = await db.select().from(ddtRighe).where(eq(ddtRighe.ddtId, parseInt(ddtId))).orderBy(ddtRighe.id);

    // Genera PDF usando pdfkit
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'portrait',
      margin: 50
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.contentType('application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="DDT_${ddtData.numero}_${ddtData.data}.pdf"`);
      res.send(pdfBuffer);
    });

    const margin = 50;
    const tableWidth = doc.page.width - (2 * margin);

    // Logo aziendale (se presente) - dimensione aumentata
    let yPosition = margin;
    if (ddtData.mittenteLogoPath) {
      try {
        const logoPath = path.join(process.cwd(), 'attached_assets', 'logos', path.basename(ddtData.mittenteLogoPath));
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, margin, yPosition, { width: 150, height: 75, fit: [150, 75] });
        }
      } catch (error) {
        console.error('Errore caricamento logo:', error);
      }
    }

    // Intestazione a destra del logo
    let headerY = yPosition + 10;
    doc.fontSize(22).fillColor('#1e40af').font('Helvetica-Bold')
       .text('DOCUMENTO DI TRASPORTO', margin + 170, headerY, { width: tableWidth - 170 });
    headerY += 28;
    doc.fontSize(18).fillColor('#1e40af')
       .text(`N. ${ddtData.numero}`, margin + 170, headerY, { width: tableWidth - 170 });
    headerY += 24;
    doc.fontSize(10).fillColor('#64748b').font('Helvetica')
       .text(`Data: ${new Date(ddtData.data).toLocaleDateString('it-IT')}`, margin + 170, headerY, { width: tableWidth - 170 });
    headerY += 14;
    doc.text(`Stato: ${ddtData.ddtStato === 'inviato' ? 'Inviato a FIC' : 'Locale'}`, margin + 170, headerY, { width: tableWidth - 170 });

    yPosition += 100;

    // === TABELLA MITTENTE E DESTINATARIO ===
    const boxWidth = (tableWidth - 20) / 2;
    const boxStartY = yPosition;
    
    // Box Mittente (sinistra) - ogni riga senza wrapping
    let mittenteY = boxStartY + 10;
    
    doc.fontSize(12).fillColor('#1e40af').font('Helvetica-Bold');
    doc.text('MITTENTE', margin + 10, mittenteY);
    mittenteY += 22;

    if (ddtData.mittenteRagioneSociale) {
      doc.fontSize(10).fillColor('#000').font('Helvetica-Bold');
      doc.text(ddtData.mittenteRagioneSociale, margin + 10, mittenteY);
      mittenteY += 16;
      doc.font('Helvetica');
      
      if (ddtData.mittenteIndirizzo) {
        doc.text(ddtData.mittenteIndirizzo, margin + 10, mittenteY);
        mittenteY += 14;
      }
      if (ddtData.mittenteCitta) {
        doc.text(`${ddtData.mittenteCap || ''} ${ddtData.mittenteCitta} (${ddtData.mittenteProvincia || ''})`, margin + 10, mittenteY);
        mittenteY += 14;
      }
      if (ddtData.mittentePartitaIva) {
        doc.text(`P.IVA: ${ddtData.mittentePartitaIva}`, margin + 10, mittenteY);
        mittenteY += 14;
      }
      if (ddtData.mittenteCodiceFiscale && ddtData.mittenteCodiceFiscale !== ddtData.mittentePartitaIva) {
        doc.text(`C.F.: ${ddtData.mittenteCodiceFiscale}`, margin + 10, mittenteY);
        mittenteY += 14;
      }
      if (ddtData.mittenteEmail) {
        doc.fontSize(9);
        doc.text(`Email: ${ddtData.mittenteEmail}`, margin + 10, mittenteY);
        mittenteY += 12;
      }
      if (ddtData.mittenteTelefono) {
        doc.fontSize(9);
        doc.text(`Tel: ${ddtData.mittenteTelefono}`, margin + 10, mittenteY);
        mittenteY += 12;
      }
    }
    mittenteY += 10; // Padding finale

    // Box Destinatario (destra) - ogni riga senza wrapping
    const boxRightX = margin + boxWidth + 20;
    let destinatarioY = boxStartY + 10;

    doc.fontSize(12).fillColor('#1e40af').font('Helvetica-Bold');
    doc.text('DESTINATARIO', boxRightX + 10, destinatarioY);
    destinatarioY += 22;

    doc.fontSize(10).fillColor('#000').font('Helvetica-Bold');
    doc.text(ddtData.clienteNome || '', boxRightX + 10, destinatarioY);
    destinatarioY += 16;
    doc.font('Helvetica');
    
    if (ddtData.clienteIndirizzo) {
      doc.text(ddtData.clienteIndirizzo, boxRightX + 10, destinatarioY);
      destinatarioY += 14;
    }
    if (ddtData.clienteCitta) {
      doc.text(`${ddtData.clienteCap || ''} ${ddtData.clienteCitta} (${ddtData.clienteProvincia || ''})`, boxRightX + 10, destinatarioY);
      destinatarioY += 14;
    }
    if (ddtData.clientePaese && ddtData.clientePaese !== 'Italia') {
      doc.text(ddtData.clientePaese, boxRightX + 10, destinatarioY);
      destinatarioY += 14;
    }
    if (ddtData.clientePiva) {
      doc.text(`P.IVA: ${ddtData.clientePiva}`, boxRightX + 10, destinatarioY);
      destinatarioY += 14;
    }
    if (ddtData.clienteCodiceFiscale && ddtData.clienteCodiceFiscale !== ddtData.clientePiva) {
      doc.text(`C.F.: ${ddtData.clienteCodiceFiscale}`, boxRightX + 10, destinatarioY);
      destinatarioY += 14;
    }
    destinatarioY += 10; // Padding finale

    // Usa l'altezza maggiore tra i due box
    const boxHeight = Math.max(mittenteY - boxStartY, destinatarioY - boxStartY);
    
    // Disegna i box con l'altezza calcolata
    doc.rect(margin, boxStartY, boxWidth, boxHeight).stroke();
    doc.rect(boxRightX, boxStartY, boxWidth, boxHeight).stroke();

    // Aggiorna yPosition dopo i box
    yPosition = boxStartY + boxHeight + 25;
    
    // CRITICO: Resetta il cursore interno di PDFKit per evitare sovrapposizioni
    doc.x = margin;
    doc.y = yPosition;

    // Tabella righe DDT
    let currentY = yPosition;
    doc.fontSize(12).fillColor('#000').text('Dettaglio Merce', margin, currentY, { underline: true });
    currentY += 20;
    
    doc.fontSize(9);

    // Headers
    const col1Width = tableWidth * 0.60;  // Descrizione
    const col2Width = tableWidth * 0.20;  // Quantità
    const col3Width = tableWidth * 0.20;  // U.M.

    let xPos = margin;
    doc.text('Descrizione', xPos, currentY, { width: col1Width, continued: false });
    xPos += col1Width;
    doc.text('Quantità', xPos, currentY, { width: col2Width, continued: false });
    xPos += col2Width;
    doc.text('U.M.', xPos, currentY, { width: col3Width, continued: false });

    currentY += 18;

    // Righe
    for (const riga of righe) {
      xPos = margin;
      
      // Evidenzia i subtotali
      const isSubtotal = riga.descrizione?.startsWith('SUBTOTALE');
      if (isSubtotal) {
        doc.font('Helvetica-Bold');
      }
      
      doc.text(riga.descrizione || '', xPos, currentY, { width: col1Width, continued: false });
      xPos += col1Width;
      doc.text(parseFloat(riga.quantita || '0').toLocaleString('it-IT'), xPos, currentY, { width: col2Width, continued: false });
      xPos += col2Width;
      doc.text(riga.unitaMisura || '', xPos, currentY, { width: col3Width, continued: false });
      
      if (isSubtotal) {
        doc.font('Helvetica');
      }
      
      currentY += 14;
    }

    currentY += 20;

    // Totali
    doc.fontSize(12).fillColor('#000').text('Totali', margin, currentY, { underline: true });
    currentY += 18;
    doc.fontSize(10);
    doc.text(`Colli: ${ddtData.totaleColli || 0}`, margin, currentY);
    currentY += 15;
    doc.text(`Peso totale: ${parseFloat(ddtData.pesoTotale || '0').toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`, margin, currentY);
    currentY += 15;

    if (ddtData.note) {
      currentY += 20;
      doc.fontSize(10).fillColor('#666').text(`Note: ${ddtData.note}`, margin, currentY, { width: tableWidth });
    }

    // Footer
    doc.fontSize(8).fillColor('#999').text(
      `DDT generato il ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')} - FLUPSY Management System - MITO SRL`,
      margin,
      doc.page.height - 70,
      { align: 'center', width: tableWidth }
    );

    doc.end();

  } catch (error) {
    console.error("Errore nella generazione PDF DDT:", error);
    res.status(500).json({
      success: false,
      error: "Errore nella generazione del PDF DDT"
    });
  }
}

/**
 * Helper per recuperare valori dalla tabella configurazione
 */
async function getConfigValue(chiave: string): Promise<string | null> {
  const configResult = await db.select()
    .from(configurazione)
    .where(eq(configurazione.chiave, chiave))
    .limit(1);
  return configResult.length > 0 ? configResult[0].valore : null;
}

/**
 * Helper per chiamate API Fatture in Cloud
 */
async function ficApiRequest(method: string, companyId: string, accessToken: string, endpoint: string, data?: any) {
  const { default: axios } = await import('axios');
  const FATTURE_IN_CLOUD_API_BASE = 'https://api-v2.fattureincloud.it';
  const url = `${FATTURE_IN_CLOUD_API_BASE}/c/${companyId}${endpoint}`;
  
  console.log(`🔗 FIC API Request: ${method} ${url}`);
  
  try {
    return await axios({
      method,
      url,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data
    });
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error('Token scaduto. Riautenticare dalla pagina Fatture in Cloud.');
    }
    if (error.response?.data) {
      console.error('FIC API Error:', error.response.data);
      throw new Error(error.response.data.error?.message || error.message);
    }
    throw error;
  }
}

/**
 * Invia DDT a Fatture in Cloud
 */
export async function sendDDTToFIC(req: Request, res: Response) {
  try {
    const { ddtId } = req.params;
    
    console.log(`📤 Richiesta invio DDT a FIC - DDT ID: ${ddtId}`);
    
    if (!ddtId) {
      return res.status(400).json({
        success: false,
        error: "ID DDT richiesto"
      });
    }

    // Recupera DDT
    const ddtResult = await db.select().from(ddt).where(eq(ddt.id, parseInt(ddtId))).limit(1);
    
    if (ddtResult.length === 0) {
      console.error(`❌ DDT non trovato - ID: ${ddtId}`);
      return res.status(404).json({
        success: false,
        error: "DDT non trovato"
      });
    }

    const ddtData = ddtResult[0];
    
    console.log(`✅ DDT recuperato - Numero: ${ddtData.numero}, Cliente: ${ddtData.clienteNome}, Stato attuale: ${ddtData.ddtStato}`);

    // Verifica se già inviato
    if (ddtData.ddtStato === 'inviato') {
      return res.status(400).json({
        success: false,
        error: "DDT già inviato a Fatture in Cloud"
      });
    }

    // Recupera configurazione OAuth2 dalla tabella configurazione
    const accessToken = await getConfigValue('fatture_in_cloud_access_token');
    const companyId = await getConfigValue('fatture_in_cloud_company_id');
    
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: "Token di accesso Fatture in Cloud mancante. Eseguire prima l'autenticazione OAuth2."
      });
    }

    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: "ID azienda Fatture in Cloud mancante."
      });
    }

    // Recupera righe DDT
    const righe = await db.select().from(ddtRighe).where(eq(ddtRighe.ddtId, parseInt(ddtId))).orderBy(ddtRighe.id);

    // Prepara payload per Fatture in Cloud
    const ddtPayload = {
      data: {
        type: 'delivery_note',
        entity: {
          name: ddtData.clienteNome,
          address_street: ddtData.clienteIndirizzo || '',
          address_city: ddtData.clienteCitta || '',
          address_postal_code: ddtData.clienteCap || '',
          address_province: ddtData.clienteProvincia || '',
          country: ddtData.clientePaese || 'Italia',
          vat_number: ddtData.clientePiva || '',
          tax_code: ddtData.clienteCodiceFiscale || ''
        },
        date: ddtData.data,
        number: ddtData.numero,
        items_list: righe.map(riga => ({
          name: riga.descrizione,
          qty: parseFloat(riga.quantita || '0'),
          measure: riga.unitaMisura,
          net_price: parseFloat(riga.prezzoUnitario || '0')
        }))
      }
    };
    
    // Invia a Fatture in Cloud
    console.log(`🚀 Invio DDT ${ddtData.numero} a Fatture in Cloud...`);
    const ficResponse = await ficApiRequest('POST', companyId, accessToken, '/issued_documents', ddtPayload);
    
    console.log(`✅ DDT inviato con successo! FIC ID: ${ficResponse.data.data.id}`);
    
    // Aggiorna DDT con ID esterno
    await db.update(ddt).set({
      fattureInCloudId: ficResponse.data.data.id?.toString(),
      fattureInCloudNumero: ficResponse.data.data.numeration || ddtData.numero,
      ddtStato: 'inviato',
      updatedAt: new Date()
    }).where(eq(ddt.id, parseInt(ddtId)));

    // Recupera advancedSaleId dalla prima riga DDT per aggiornare anche la vendita
    if (righe.length > 0 && righe[0].advancedSaleId) {
      const advancedSaleId = righe[0].advancedSaleId;
      
      await db.update(advancedSales).set({
        ddtStatus: 'inviato',
        updatedAt: new Date()
      }).where(eq(advancedSales.id, advancedSaleId));
      
      console.log(`✅ Vendita ${advancedSaleId} aggiornata con stato 'inviato'`);
    }

    res.json({
      success: true,
      ddtId: parseInt(ddtId),
      fattureInCloudId: ficResponse.data.data.id,
      numero: ficResponse.data.data.numeration || ddtData.numero,
      message: 'DDT inviato con successo a Fatture in Cloud'
    });
    
  } catch (error: any) {
    console.error("Errore nell'invio DDT a Fatture in Cloud:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Errore nell'invio del DDT a Fatture in Cloud"
    });
  }
}