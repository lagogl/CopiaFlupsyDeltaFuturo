import { storage } from "../../../storage";
import { Operation, Size } from "../../../../shared/schema";
import { sgrAiQualityService } from "./sgr-ai-quality.service";

/**
 * Service for calculating SGR from historical operations data
 */
export class SgrCalculationService {
  
  /**
   * Find size for given animalsPerKg
   */
  private async findSizeForAnimalsPerKg(animalsPerKg: number): Promise<Size | null> {
    const sizes = await storage.getAllSizes();
    
    // Find size where animalsPerKg falls within range
    const matchingSize = sizes.find(size => {
      if (!size.minAnimalsPerKg || !size.maxAnimalsPerKg) return false;
      return animalsPerKg >= size.minAnimalsPerKg && animalsPerKg <= size.maxAnimalsPerKg;
    });
    
    return matchingSize || null;
  }

  /**
   * Calculate SGR between two weighing operations
   * Formula: SGR = [(ln(W2) - ln(W1)) / Days] × 100
   */
  private calculateSgrBetweenOperations(
    weight1: number,
    weight2: number,
    days: number
  ): number | null {
    if (days < 5 || weight1 <= 0 || weight2 <= 0 || weight2 <= weight1) {
      return null; // Skip invalid data
    }
    
    const sgr = ((Math.log(weight2) - Math.log(weight1)) / days) * 100;
    return sgr;
  }

  /**
   * Calculate SGR for a specific month and year from historical operations
   */
  async calculateSgrForMonth(month: string, year: number): Promise<Map<number, { sgr: number; sampleCount: number }>> {
    console.log(`📊 SGR CALCULATION: Starting calculation for ${month} ${year}`);
    
    // Get all weighing operations for the target month/year
    const monthNumber = this.getMonthNumber(month);
    const startDate = new Date(year, monthNumber, 1);
    const endDate = new Date(year, monthNumber + 1, 0); // Last day of month
    
    console.log(`📅 SGR CALCULATION: Date range ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Get all operations (we'll filter in memory)
    const allOperations = await storage.getOperations();
    
    // Filter weighing operations in the target month
    const targetOperations = allOperations.filter(op => {
      const opDate = new Date(op.date);
      return opDate >= startDate && 
             opDate <= endDate && 
             op.totalWeight && 
             op.animalsPerKg;
    });
    
    console.log(`🔍 SGR CALCULATION: Found ${targetOperations.length} weighing operations in ${month} ${year}`);
    
    // AI Quality Check on target operations
    const qualityCheck = await sgrAiQualityService.analyzeDataQuality(targetOperations);
    console.log(`🤖 AI QUALITY: ${qualityCheck.summary.valid}/${qualityCheck.summary.total} operations passed validation`);
    if (qualityCheck.anomalies.length > 0) {
      console.log(`⚠️  AI QUALITY: Found ${qualityCheck.anomalies.length} anomalies`);
    }
    
    // Use only valid operations
    const validTargetOperations = qualityCheck.validOperations;
    
    // Group operations by basket to find consecutive weighings
    const basketOperations = new Map<number, Operation[]>();
    for (const op of validTargetOperations) {
      if (!basketOperations.has(op.basketId)) {
        basketOperations.set(op.basketId, []);
      }
      basketOperations.get(op.basketId)!.push(op);
    }
    
    // For each basket, we need to find operations BEFORE the target month too
    // to calculate growth INTO the target month
    const extendedStartDate = new Date(year, monthNumber - 2, 1); // 2 months before
    const previousOperations = allOperations.filter(op => {
      const opDate = new Date(op.date);
      return opDate >= extendedStartDate && 
             opDate < startDate && 
             op.totalWeight && 
             op.animalsPerKg;
    });
    
    // Add previous operations to basket groups
    for (const op of previousOperations) {
      if (!basketOperations.has(op.basketId)) {
        basketOperations.set(op.basketId, []);
      }
      basketOperations.get(op.basketId)!.push(op);
    }
    
    // Sort operations by date for each basket
    for (const [basketId, ops] of basketOperations.entries()) {
      ops.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    
    // Calculate SGR for each basket and group by size
    const sgrBySize = new Map<number, number[]>(); // sizeId -> array of SGR values
    
    for (const [basketId, ops] of basketOperations.entries()) {
      // Find consecutive pairs of operations
      for (let i = 0; i < ops.length - 1; i++) {
        const op1 = ops[i];
        const op2 = ops[i + 1];
        
        // Calculate days between operations
        const days = Math.floor(
          (new Date(op2.date).getTime() - new Date(op1.date).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (days < 5) continue; // Skip if too close together
        
        // Both operations must have same size (no transition)
        const size1 = await this.findSizeForAnimalsPerKg(op1.animalsPerKg!);
        const size2 = await this.findSizeForAnimalsPerKg(op2.animalsPerKg!);
        
        if (!size1 || !size2 || size1.id !== size2.id) {
          continue; // Skip if size changed
        }
        
        // Calculate SGR
        const sgr = this.calculateSgrBetweenOperations(
          op1.totalWeight!,
          op2.totalWeight!,
          days
        );
        
        if (sgr !== null && sgr > 0 && sgr < 10) { // Reasonable bounds (0-10% daily growth)
          if (!sgrBySize.has(size1.id)) {
            sgrBySize.set(size1.id, []);
          }
          sgrBySize.get(size1.id)!.push(sgr);
        }
      }
    }
    
    // Calculate average SGR for each size
    const results = new Map<number, { sgr: number; sampleCount: number }>();
    
    for (const [sizeId, sgrValues] of sgrBySize.entries()) {
      if (sgrValues.length > 0) {
        const avgSgr = sgrValues.reduce((sum, val) => sum + val, 0) / sgrValues.length;
        results.set(sizeId, {
          sgr: avgSgr,
          sampleCount: sgrValues.length
        });
        console.log(`✅ SGR CALCULATION: Size ${sizeId}: ${avgSgr.toFixed(3)}% (${sgrValues.length} samples)`);
      }
    }
    
    console.log(`📊 SGR CALCULATION: Completed for ${month} ${year}. Found ${results.size} size groups.`);
    
    return results;
  }

  /**
   * Get month number (0-11) from month name
   */
  private getMonthNumber(monthName: string): number {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
  }

  /**
   * Calculate and store SGR for current month based on same month last year
   */
  async calculateAndStoreSgrForCurrentMonth(): Promise<{
    month: string;
    year: number;
    results: Array<{ sizeId: number; sizeName: string; sgr: number; sampleCount: number }>;
  }> {
    const now = new Date();
    const currentMonth = now.toLocaleString('en-US', { month: 'long' });
    const lastYear = now.getFullYear() - 1;
    
    console.log(`🚀 SGR CALCULATION: Calculating SGR for ${currentMonth} based on ${currentMonth} ${lastYear} data`);
    
    // Calculate SGR from last year's data
    const sgrBySize = await this.calculateSgrForMonth(currentMonth, lastYear);
    
    // Get all sizes for naming
    const sizes = await storage.getAllSizes();
    const sizeMap = new Map(sizes.map(s => [s.id, s]));
    
    // Store results in database
    const results: Array<{ sizeId: number; sizeName: string; sgr: number; sampleCount: number }> = [];
    
    for (const [sizeId, data] of sgrBySize.entries()) {
      const size = sizeMap.get(sizeId);
      if (!size) continue;
      
      // Upsert SGR per taglia
      await storage.upsertSgrPerTaglia(
        currentMonth,
        sizeId,
        data.sgr,
        data.sampleCount,
        `Calculated from ${currentMonth} ${lastYear} historical data`
      );
      
      results.push({
        sizeId,
        sizeName: size.name,
        sgr: data.sgr,
        sampleCount: data.sampleCount
      });
    }
    
    console.log(`✅ SGR CALCULATION: Stored ${results.length} SGR values for ${currentMonth}`);
    
    return {
      month: currentMonth,
      year: lastYear,
      results
    };
  }

  /**
   * Calculate and store SGR for specific month based on same month last year
   */
  async calculateAndStoreSgrForSpecificMonth(targetMonth: string): Promise<{
    month: string;
    year: number;
    results: Array<{ sizeId: number; sizeName: string; sgr: number; sampleCount: number }>;
  }> {
    const now = new Date();
    const lastYear = now.getFullYear() - 1;
    
    console.log(`🚀 SGR CALCULATION: Calculating SGR for ${targetMonth} based on ${targetMonth} ${lastYear} data`);
    
    // Calculate SGR from last year's data
    const sgrBySize = await this.calculateSgrForMonth(targetMonth, lastYear);
    
    // Get all sizes for naming
    const sizes = await storage.getAllSizes();
    const sizeMap = new Map(sizes.map(s => [s.id, s]));
    
    // Store results in database
    const results: Array<{ sizeId: number; sizeName: string; sgr: number; sampleCount: number }> = [];
    
    for (const [sizeId, data] of sgrBySize.entries()) {
      const size = sizeMap.get(sizeId);
      if (!size) continue;
      
      // Upsert SGR per taglia
      await storage.upsertSgrPerTaglia(
        targetMonth,
        sizeId,
        data.sgr,
        data.sampleCount,
        `Calculated from ${targetMonth} ${lastYear} historical data`
      );
      
      results.push({
        sizeId,
        sizeName: size.name,
        sgr: data.sgr,
        sampleCount: data.sampleCount
      });
    }
    
    console.log(`✅ SGR CALCULATION: Stored ${results.length} SGR values for ${targetMonth}`);
    
    return {
      month: targetMonth,
      year: lastYear,
      results
    };
  }
}

export const sgrCalculationService = new SgrCalculationService();
