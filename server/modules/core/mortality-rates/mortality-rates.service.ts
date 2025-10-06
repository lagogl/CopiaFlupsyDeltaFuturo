import { storage } from "../../../storage";

export class MortalityRatesService {
  async getAll() {
    const rates = await storage.getMortalityRates();
    return await Promise.all(rates.map(async (rate) => ({
      ...rate,
      size: rate.sizeId ? await storage.getSize(rate.sizeId) : null
    })));
  }

  async getById(id: number) {
    const rate = await storage.getMortalityRate(id);
    if (!rate) return null;
    const size = rate.sizeId ? await storage.getSize(rate.sizeId) : null;
    return { ...rate, size };
  }

  async getByMonthAndSize(month: string, sizeId: number) {
    const rate = await storage.getMortalityRateByMonthAndSize(month.toLowerCase(), sizeId);
    if (!rate) return null;
    const size = await storage.getSize(sizeId);
    return { ...rate, size };
  }

  async getByMonth(month: string) {
    const rates = await storage.getMortalityRatesByMonth(month);
    return await Promise.all(rates.map(async (rate) => ({
      ...rate,
      size: rate.sizeId ? await storage.getSize(rate.sizeId) : null
    })));
  }

  async getBySize(sizeId: number) {
    const rates = await storage.getMortalityRatesBySize(sizeId);
    const size = await storage.getSize(sizeId);
    return rates.map(rate => ({ ...rate, size }));
  }

  async create(data: any) {
    return await storage.createMortalityRate(data);
  }

  async update(id: number, data: any) {
    return await storage.updateMortalityRate(id, data);
  }
}

export const mortalityRatesService = new MortalityRatesService();
