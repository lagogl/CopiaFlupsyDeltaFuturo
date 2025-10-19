import { sgrCalculationService } from "./sgr-calculation.service";

/**
 * Monthly scheduler for automatic SGR calculation
 * Runs on day 1 of each month at 02:00
 */
export class SgrScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  
  /**
   * Start the scheduler
   */
  start() {
    console.log("📅 SGR SCHEDULER: Starting monthly scheduler...");
    
    // Check every hour if it's time to run
    this.intervalId = setInterval(() => {
      this.checkAndRun();
    }, 60 * 60 * 1000); // Check every hour
    
    // Also check immediately on start
    this.checkAndRun();
    
    console.log("✅ SGR SCHEDULER: Scheduler started (checks hourly)");
  }
  
  /**
   * Stop the scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("⏹️ SGR SCHEDULER: Scheduler stopped");
    }
  }
  
  /**
   * Check if it's day 1 at 02:00 and run calculation
   */
  private async checkAndRun() {
    const now = new Date();
    const day = now.getDate();
    const hour = now.getHours();
    
    // Run on day 1 between 02:00-02:59
    if (day === 1 && hour === 2) {
      console.log("🚀 SGR SCHEDULER: Triggered automatic monthly SGR calculation");
      try {
        await this.runMonthlyCalculation();
      } catch (error) {
        console.error("❌ SGR SCHEDULER: Error during automatic calculation:", error);
      }
    }
  }
  
  /**
   * Run monthly SGR calculation for current month
   */
  async runMonthlyCalculation() {
    console.log("📊 SGR SCHEDULER: Starting monthly SGR calculation...");
    
    const result = await sgrCalculationService.calculateAndStoreSgrForCurrentMonth();
    
    console.log(`✅ SGR SCHEDULER: Completed! Calculated SGR for ${result.month} based on last year's data`);
    console.log(`📈 SGR SCHEDULER: Results:`);
    result.results.forEach(r => {
      console.log(`   - ${r.sizeName}: ${r.sgr.toFixed(3)}% (${r.sampleCount} samples)`);
    });
    
    return result;
  }
  
  /**
   * Manually trigger calculation (for API endpoint)
   */
  async triggerManualCalculation(month?: string) {
    console.log(`🔧 SGR SCHEDULER: Manual trigger for ${month || 'current month'}`);
    
    if (month) {
      return await sgrCalculationService.calculateAndStoreSgrForSpecificMonth(month);
    } else {
      return await sgrCalculationService.calculateAndStoreSgrForCurrentMonth();
    }
  }
}

export const sgrScheduler = new SgrScheduler();
