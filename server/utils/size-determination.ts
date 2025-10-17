/**
 * Utility functions for automatic size determination based on animals per kg
 */

import { db } from '../db';
import { sizes } from '../../shared/schema';
import { and, sql } from 'drizzle-orm';

/**
 * Determines the appropriate size ID based on animals per kg value.
 * Handles exact matches, out-of-range values, and gaps in size ranges.
 * 
 * @param animalsPerKg - Number of animals per kg
 * @returns Promise resolving to the appropriate size ID, or null if out of range
 */
export async function determineSizeByAnimalsPerKg(animalsPerKg: number): Promise<number | null> {
  if (!animalsPerKg || animalsPerKg <= 0) return null;
  
  try {
    // 1. Try exact range match first
    const exactMatch = await db
      .select()
      .from(sizes)
      .where(
        and(
          sql`${animalsPerKg} >= ${sizes.minAnimalsPerKg}`,
          sql`${animalsPerKg} <= ${sizes.maxAnimalsPerKg}`
        )
      )
      .limit(1);
    
    if (exactMatch.length > 0) {
      console.log(`✅ Taglia esatta per ${animalsPerKg} animali/kg:`, exactMatch[0].code);
      return exactMatch[0].id;
    }
    
    // 2. No exact match - get all sizes ordered by min range
    const allSizes = await db.select().from(sizes).orderBy(sizes.minAnimalsPerKg);
    
    if (allSizes.length === 0) {
      console.error("❌ Nessuna taglia trovata nel database!");
      return null;
    }
    
    // 3. Find actual min/max from all sizes
    const minRange = allSizes[0].minAnimalsPerKg!;
    const maxRange = allSizes[allSizes.length - 1].maxAnimalsPerKg!;
    
    // 4. Handle out-of-range values
    if (animalsPerKg < minRange) {
      // Below minimum → TP-10000+ (fuori scala, pesci troppo grandi)
      console.log(`⚠️ ${animalsPerKg} SOTTO range minimo ${minRange} → TP-10000+ (pesci troppo grandi) → NULL`);
      return null;
    }
    
    if (animalsPerKg > maxRange) {
      // Above maximum → TP-180- (fuori scala, pesci troppo piccoli)
      console.log(`⚠️ ${animalsPerKg} SOPRA range massimo ${maxRange} → TP-180- (pesci troppo piccoli) → NULL`);
      return null;
    }
    
    // 5. Value falls in a gap between ranges - find closest boundary
    let closestSize = allSizes[0];
    let minDistance = Math.min(
      Math.abs(animalsPerKg - closestSize.minAnimalsPerKg!),
      Math.abs(animalsPerKg - closestSize.maxAnimalsPerKg!)
    );
    
    for (const size of allSizes) {
      const distanceFromMin = Math.abs(animalsPerKg - size.minAnimalsPerKg!);
      const distanceFromMax = Math.abs(animalsPerKg - size.maxAnimalsPerKg!);
      const distance = Math.min(distanceFromMin, distanceFromMax);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestSize = size;
      }
    }
    
    console.log(`📍 Gap nei range: ${animalsPerKg} animali/kg → taglia più vicina ${closestSize.code}`);
    return closestSize.id;
    
  } catch (error) {
    console.error("❌ Errore determinazione taglia:", error);
    return null;
  }
}
