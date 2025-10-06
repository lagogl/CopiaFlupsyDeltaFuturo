import { db } from "../../../db";
import { eq } from "drizzle-orm";
import { 
  selections,
  selectionSourceBaskets,
  selectionDestinationBaskets,
  baskets,
  sizes,
  flupsys
} from "@shared/schema";

export class SelectionsService {
  /**
   * Get all selections
   */
  async getAllSelections() {
    return await db.select().from(selections).orderBy(selections.id);
  }

  /**
   * Get selection by ID
   */
  async getSelectionById(id: number) {
    const [selection] = await db.select().from(selections)
      .where(eq(selections.id, id))
      .limit(1);
    return selection;
  }

  /**
   * Get source baskets for a selection
   */
  async getSourceBaskets(selectionId: number) {
    const sourceBasketIds = await db.select({
      id: selectionSourceBaskets.id,
      basketId: selectionSourceBaskets.basketId,
      sizeId: selectionSourceBaskets.sizeId,
    })
    .from(selectionSourceBaskets)
    .where(eq(selectionSourceBaskets.selectionId, selectionId));
    
    return await Promise.all(sourceBasketIds.map(async ({ id, basketId, sizeId }) => {
      const [sourceData] = await db.select()
        .from(selectionSourceBaskets)
        .where(eq(selectionSourceBaskets.id, id))
        .limit(1);
        
      const [basket] = await db.select()
        .from(baskets)
        .where(eq(baskets.id, basketId))
        .limit(1);
        
      let size = null;
      if (sizeId) {
        const [sizeData] = await db.select()
          .from(sizes)
          .where(eq(sizes.id, sizeId))
          .limit(1);
        size = sizeData;
      }
      
      let flupsy = null;
      if (basket?.flupsyId) {
        const [flupsyData] = await db.select()
          .from(flupsys)
          .where(eq(flupsys.id, basket.flupsyId))
          .limit(1);
        flupsy = flupsyData;
      }
      
      return {
        ...sourceData,
        basket,
        size,
        flupsy
      };
    }));
  }

  /**
   * Get destination baskets for a selection
   */
  async getDestinationBaskets(selectionId: number) {
    const destinationBasketIds = await db.select({
      id: selectionDestinationBaskets.id,
      basketId: selectionDestinationBaskets.basketId,
      sizeId: selectionDestinationBaskets.sizeId,
    })
    .from(selectionDestinationBaskets)
    .where(eq(selectionDestinationBaskets.selectionId, selectionId));
    
    return await Promise.all(destinationBasketIds.map(async ({ id, basketId, sizeId }) => {
      const [destData] = await db.select()
        .from(selectionDestinationBaskets)
        .where(eq(selectionDestinationBaskets.id, id))
        .limit(1);
        
      const [basket] = await db.select()
        .from(baskets)
        .where(eq(baskets.id, basketId))
        .limit(1);
        
      let size = null;
      if (sizeId) {
        const [sizeData] = await db.select()
          .from(sizes)
          .where(eq(sizes.id, sizeId))
          .limit(1);
        size = sizeData;
      }
      
      let flupsy = null;
      if (basket?.flupsyId) {
        const [flupsyData] = await db.select()
          .from(flupsys)
          .where(eq(flupsys.id, basket.flupsyId))
          .limit(1);
        flupsy = flupsyData;
      }
      
      return {
        ...destData,
        basket,
        size,
        flupsy
      };
    }));
  }
}

export const selectionsService = new SelectionsService();
