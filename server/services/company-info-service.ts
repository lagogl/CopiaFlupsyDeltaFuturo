import { db } from "../db";
import { eq } from "drizzle-orm";
import * as schema from "../../shared/schema";

export interface CompanyInfo {
  ragioneSociale: string;
  indirizzo: string;
  cap: string;
  citta: string;
  provincia: string;
  partitaIva: string;
  codiceFiscale: string;
  email: string;
  telefono?: string | null;
}

/**
 * Recupera i dati fiscali dell'azienda basandosi sul Company ID di Fatture in Cloud
 */
export async function getCompanyInfo(companyId: string | number): Promise<CompanyInfo | null> {
  try {
    const numericCompanyId = typeof companyId === 'string' ? parseInt(companyId, 10) : companyId;
    
    const result = await db.select()
      .from(schema.fattureInCloudConfig)
      .where(eq(schema.fattureInCloudConfig.companyId, numericCompanyId))
      .limit(1);

    if (result.length === 0) {
      console.warn(`⚠️ Nessun dato fiscale trovato per Company ID: ${companyId}`);
      return null;
    }

    const config = result[0];
    
    return {
      ragioneSociale: config.ragioneSociale || 'N/A',
      indirizzo: config.indirizzo || 'N/A',
      cap: config.cap || 'N/A',
      citta: config.citta || 'N/A',
      provincia: config.provincia || 'N/A',
      partitaIva: config.partitaIva || 'N/A',
      codiceFiscale: config.codiceFiscale || 'N/A',
      email: config.email || 'N/A',
      telefono: config.telefono || null
    };
  } catch (error) {
    console.error('❌ Errore recupero dati aziendali:', error);
    return null;
  }
}

/**
 * Formatta i dati aziendali per l'intestazione dei PDF
 */
export function formatCompanyHeader(companyInfo: CompanyInfo): string {
  const parts = [
    companyInfo.ragioneSociale,
    `${companyInfo.indirizzo}, ${companyInfo.cap} ${companyInfo.citta} (${companyInfo.provincia})`,
    `P.IVA: ${companyInfo.partitaIva} - C.F.: ${companyInfo.codiceFiscale}`,
    `Email: ${companyInfo.email}`
  ];
  
  if (companyInfo.telefono) {
    parts.push(`Tel: ${companyInfo.telefono}`);
  }
  
  return parts.join('\n');
}
