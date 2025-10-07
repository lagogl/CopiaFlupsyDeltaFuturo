/**
 * Servizio per la gestione dei loghi aziendali basati su Company ID
 */
import path from 'path';
import fs from 'fs';

// Mappatura Company ID → Logo
const COMPANY_LOGOS = {
  '1017299': 'logo-ecotapes.png',     // EcoTapes Società Agricola
  '13263': 'logo-delta-futuro.png'     // Delta Futuro Soc. Agr. srl
} as const;

// Mapping alternativo per production center (fallback)
const PRODUCTION_CENTER_LOGOS = {
  'Ecotapes Italia': 'logo-ecotapes.png',
  'ecotapes': 'logo-ecotapes.png',
  'Delta Futuro GORO': 'logo-delta-futuro.png',
  'delta futuro': 'logo-delta-futuro.png',
  'goro': 'logo-delta-futuro.png'
} as const;

/**
 * Ottiene il path del logo corretto in base al Company ID
 * @param companyId - ID dell'azienda da Fatture in Cloud
 * @returns Path assoluto al file del logo
 */
export function getCompanyLogo(companyId: string | number | null | undefined): string {
  const id = String(companyId);
  const logoFilename = (id in COMPANY_LOGOS) 
    ? COMPANY_LOGOS[id as keyof typeof COMPANY_LOGOS]
    : 'logo-ecotapes.png'; // Default: EcoTapes
  
  return path.join(process.cwd(), 'attached_assets', logoFilename);
}

/**
 * Ottiene il logo in base al production center (fallback method)
 * @param productionCenter - Nome del centro di produzione
 * @returns Path assoluto al file del logo
 */
export function getLogoByProductionCenter(productionCenter: string | null | undefined): string {
  if (!productionCenter) {
    return getCompanyLogo(null);
  }

  const normalized = productionCenter.toLowerCase();
  
  for (const [key, logoFile] of Object.entries(PRODUCTION_CENTER_LOGOS)) {
    if (normalized.includes(key.toLowerCase())) {
      return path.join(process.cwd(), 'attached_assets', logoFile);
    }
  }
  
  // Default
  return getCompanyLogo(null);
}

/**
 * Ottiene il logo come base64 per l'embedding in HTML/PDF
 * @param companyId - ID dell'azienda
 * @returns Stringa base64 del logo
 */
export function getCompanyLogoBase64(companyId: string | number | null | undefined): string {
  try {
    const logoPath = getCompanyLogo(companyId);
    const logoBuffer = fs.readFileSync(logoPath);
    const base64 = logoBuffer.toString('base64');
    const mimeType = logoPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('Errore nel caricamento del logo:', error);
    return ''; // Ritorna stringa vuota se il logo non è disponibile
  }
}

/**
 * Verifica se un logo esiste per il Company ID specificato
 * @param companyId - ID dell'azienda
 * @returns true se il logo esiste
 */
export function hasCompanyLogo(companyId: string | number | null | undefined): boolean {
  if (!companyId) return false;
  const id = String(companyId);
  return id in COMPANY_LOGOS;
}

/**
 * Ottiene informazioni sull'azienda in base al Company ID
 * @param companyId - ID dell'azienda
 * @returns Oggetto con info azienda (DEPRECATO - usa getCompanyFiscalData per dati completi)
 */
export function getCompanyInfo(companyId: string | number | null | undefined): {
  name: string;
  logo: string;
  productionCenter: string;
} {
  const id = String(companyId);
  
  if (id === '1017299') {
    return {
      name: 'EcoTapes Società Agricola',
      logo: getCompanyLogo(id),
      productionCenter: 'Ecotapes Italia'
    };
  }
  
  if (id === '13263') {
    return {
      name: 'Delta Futuro Soc. Agr. srl',
      logo: getCompanyLogo(id),
      productionCenter: 'Delta Futuro GORO'
    };
  }
  
  // Default
  return {
    name: 'EcoTapes Società Agricola',
    logo: getCompanyLogo(null),
    productionCenter: 'Ecotapes Italia'
  };
}

/**
 * Ottiene i dati fiscali completi dell'azienda dal database
 * @param companyId - ID dell'azienda
 * @returns Dati fiscali completi o null se non trovati
 */
export async function getCompanyFiscalData(companyId: string | number | null | undefined) {
  if (!companyId) {
    return null;
  }

  try {
    const { db } = await import('../db');
    const { eq } = await import('drizzle-orm');
    const schema = await import('../../shared/schema');
    
    const numericCompanyId = typeof companyId === 'string' ? parseInt(companyId, 10) : companyId;
    
    const result = await db.select()
      .from(schema.fattureInCloudConfig)
      .where(eq(schema.fattureInCloudConfig.companyId, numericCompanyId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return result[0];
  } catch (error) {
    console.error('❌ Errore recupero dati fiscali azienda:', error);
    return null;
  }
}
