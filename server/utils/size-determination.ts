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
 * @returns Promise resolving to the appropriate size ID, or null if no sizes exist
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
    
    // 3. Separate sentinels (with NULL boundaries) from finite ranges
    const lowerSentinel = allSizes.find(s => s.minAnimalsPerKg === null); // For heavy fish (low animals/kg)
    const upperSentinel = allSizes.find(s => s.maxAnimalsPerKg === null); // For small fish (high animals/kg)
    const finiteSizes = allSizes.filter(s => s.minAnimalsPerKg !== null && s.maxAnimalsPerKg !== null);
    
    if (finiteSizes.length === 0) {
      // No finite ranges, use sentinels if available
      if (lowerSentinel) return lowerSentinel.id;
      if (upperSentinel) return upperSentinel.id;
      return allSizes[0]?.id ?? null;
    }
    
    // 4. Find actual min/max from finite ranges only
    const minFiniteRange = finiteSizes[0].minAnimalsPerKg!;
    const maxFiniteRange = finiteSizes[finiteSizes.length - 1].maxAnimalsPerKg!;
    
    // 5. Handle out-of-range values using sentinels
    if (animalsPerKg < minFiniteRange) {
      // Below minimum finite range → use lower sentinel if exists, else first finite size
      const targetSize = lowerSentinel || finiteSizes[0];
      console.log(`⚠️ ${animalsPerKg} SOTTO range minimo finito ${minFiniteRange} → ${targetSize.code} (pesci più grandi)`);
      return targetSize.id;
    }
    
    if (animalsPerKg > maxFiniteRange) {
      // Above maximum finite range → use upper sentinel if exists, else last finite size
      const targetSize = upperSentinel || finiteSizes[finiteSizes.length - 1];
      console.log(`⚠️ ${animalsPerKg} SOPRA range massimo finito ${maxFiniteRange} → ${targetSize.code} (pesci più piccoli)`);
      return targetSize.id;
    }
    
    // 6. Value falls in a gap between finite ranges - find closest boundary
    let closestSize = finiteSizes[0];
    let minDistance = Math.min(
      Math.abs(animalsPerKg - closestSize.minAnimalsPerKg!),
      Math.abs(animalsPerKg - closestSize.maxAnimalsPerKg!)
    );
    
    for (const size of finiteSizes) {
      const distanceFromMin = Math.abs(animalsPerKg - size.minAnimalsPerKg!);
      const distanceFromMax = Math.abs(animalsPerKg - size.maxAnimalsPerKg!);
      const distance = Math.min(distanceFromMin, distanceFromMax);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestSize = size;
      }
    }
    
    console.log(`📍 Gap nei range finiti: ${animalsPerKg} animali/kg → taglia più vicina ${closestSize.code}`);
    return closestSize.id;
    
  } catch (error) {
    console.error("❌ Errore determinazione taglia:", error);
    return null;
  }
}
