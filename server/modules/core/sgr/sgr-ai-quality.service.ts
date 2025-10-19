import { Operation } from "../../../../shared/schema";

/**
 * AI-powered Data Quality Check for SGR calculations
 * Uses statistical analysis to identify anomalies in operations data
 */
export class SgrAiQualityService {
  
  /**
   * Analyze operations for data quality issues
   * Returns filtered operations and quality report
   */
  async analyzeDataQuality(operations: Operation[]): Promise<{
    validOperations: Operation[];
    anomalies: Array<{
      operationId: number;
      basketId: number;
      date: string;
      reason: string;
      severity: 'error' | 'warning';
      suggested: string;
    }>;
    summary: {
      total: number;
      valid: number;
      excluded: number;
      errorCount: number;
      warningCount: number;
    };
  }> {
    console.log(`🤖 AI QUALITY CHECK: Analyzing ${operations.length} operations...`);
    
    const anomalies: Array<{
      operationId: number;
      basketId: number;
      date: string;
      reason: string;
      severity: 'error' | 'warning';
      suggested: string;
    }> = [];
    
    const validOperations: Operation[] = [];
    
    // Statistical analysis for outlier detection
    const weights = operations.map(op => op.totalWeight || 0).filter(w => w > 0);
    const mean = weights.reduce((sum, w) => sum + w, 0) / weights.length;
    const stdDev = Math.sqrt(
      weights.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / weights.length
    );
    
    for (const op of operations) {
      let isValid = true;
      
      // Check 1: Missing critical data
      if (!op.totalWeight || !op.animalsPerKg) {
        anomalies.push({
          operationId: op.id,
          basketId: op.basketId,
          date: op.date,
          reason: 'Missing totalWeight or animalsPerKg data',
          severity: 'error',
          suggested: 'Excluded from SGR calculation'
        });
        isValid = false;
        continue;
      }
      
      // Check 2: Outlier detection (Z-score > 3)
      const zScore = Math.abs((op.totalWeight! - mean) / stdDev);
      if (zScore > 3) {
        anomalies.push({
          operationId: op.id,
          basketId: op.basketId,
          date: op.date,
          reason: `Weight ${op.totalWeight}g is ${zScore.toFixed(1)} standard deviations from mean (possible input error)`,
          severity: 'warning',
          suggested: 'Verify if weight is correct'
        });
        // Don't exclude, but flag for review
      }
      
      // Check 3: Negative or zero weight
      if (op.totalWeight <= 0) {
        anomalies.push({
          operationId: op.id,
          basketId: op.basketId,
          date: op.date,
          reason: `Invalid weight: ${op.totalWeight}g`,
          severity: 'error',
          suggested: 'Excluded from SGR calculation'
        });
        isValid = false;
        continue;
      }
      
      // Check 4: Unrealistic animalsPerKg (< 1 or > 1000)
      if (op.animalsPerKg! < 1 || op.animalsPerKg! > 1000) {
        anomalies.push({
          operationId: op.id,
          basketId: op.basketId,
          date: op.date,
          reason: `Unrealistic animalsPerKg: ${op.animalsPerKg}`,
          severity: 'error',
          suggested: 'Excluded from SGR calculation'
        });
        isValid = false;
        continue;
      }
      
      // Check 5: Extreme mortality rate (> 50%)
      if (op.mortalityRate && op.mortalityRate > 50) {
        anomalies.push({
          operationId: op.id,
          basketId: op.basketId,
          date: op.date,
          reason: `Exceptional mortality: ${op.mortalityRate}%`,
          severity: 'warning',
          suggested: 'Excluded from SGR calculation (exceptional event)'
        });
        isValid = false;
        continue;
      }
      
      if (isValid) {
        validOperations.push(op);
      }
    }
    
    const summary = {
      total: operations.length,
      valid: validOperations.length,
      excluded: operations.length - validOperations.length,
      errorCount: anomalies.filter(a => a.severity === 'error').length,
      warningCount: anomalies.filter(a => a.severity === 'warning').length
    };
    
    console.log(`🤖 AI QUALITY CHECK: Completed`);
    console.log(`   ✅ Valid operations: ${summary.valid}`);
    console.log(`   ⚠️  Warnings: ${summary.warningCount}`);
    console.log(`   ❌ Errors (excluded): ${summary.errorCount}`);
    
    return {
      validOperations,
      anomalies,
      summary
    };
  }
  
  /**
   * Validate growth rate between two operations
   * Returns true if growth rate is realistic
   */
  validateGrowthRate(
    weight1: number,
    weight2: number,
    days: number
  ): { valid: boolean; reason?: string; sgrValue?: number } {
    if (weight2 <= weight1) {
      return {
        valid: false,
        reason: 'Weight decreased or stayed same (possible mortality or error)'
      };
    }
    
    const sgr = ((Math.log(weight2) - Math.log(weight1)) / days) * 100;
    
    // Realistic daily growth bounds: 0.5% - 10%
    if (sgr < 0.5) {
      return {
        valid: false,
        reason: `SGR too low (${sgr.toFixed(2)}%), possible data error`,
        sgrValue: sgr
      };
    }
    
    if (sgr > 10) {
      return {
        valid: false,
        reason: `SGR too high (${sgr.toFixed(2)}%), possible input error`,
        sgrValue: sgr
      };
    }
    
    return {
      valid: true,
      sgrValue: sgr
    };
  }
}

export const sgrAiQualityService = new SgrAiQualityService();
