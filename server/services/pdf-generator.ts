/**
 * Servizio per la generazione di PDF per le vendite avanzate
 * Utilizza Puppeteer per convertire HTML in PDF con layout professionale
 */
import puppeteer from 'puppeteer';
import handlebars from 'handlebars';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import path from 'path';
import fs from 'fs/promises';

interface SaleData {
  sale: {
    id: number;
    saleNumber: string;
    customerName: string;
    customerDetails?: any;
    saleDate: string;
    status: string;
    totalWeight: number;
    totalAnimals: number;
    totalBags: number;
    notes?: string;
  };
  bags: Array<{
    id: number;
    bagNumber: number;
    sizeCode: string;
    totalWeight: number;
    originalWeight: number;
    weightLoss: number;
    animalCount: number;
    animalsPerKg: number;
    originalAnimalsPerKg: number;
    wastePercentage: number;
    notes?: string;
    allocations: Array<{
      sourceOperationId: number;
      sourceBasketId: number;
      allocatedAnimals: number;
      allocatedWeight: number;
      sourceAnimalsPerKg: number;
      sourceSizeCode: string;
      basketPhysicalNumber?: number;
    }>;
  }>;
  operations: Array<{
    operationId: number;
    basketId: number;
    originalAnimals: number;
    originalWeight: number;
    originalAnimalsPerKg: number;
    basketPhysicalNumber: number;
    date: string;
  }>;
}

// Template HTML per il PDF
const HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vendita Avanzata {{sale.saleNumber}}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
            background: white;
        }
        
        .header {
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
            color: white;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .header h1 {
            font-size: 24px;
            margin-bottom: 5px;
        }
        
        .header .subtitle {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .company-info {
            text-align: right;
            margin-top: -40px;
        }
        
        .sale-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 25px;
            padding: 0 20px;
        }
        
        .info-section {
            background: #f8fafc;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #3b82f6;
        }
        
        .info-section h3 {
            color: #1e40af;
            margin-bottom: 10px;
            font-size: 14px;
            font-weight: bold;
        }
        
        .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
        }
        
        .info-label {
            font-weight: bold;
            color: #64748b;
        }
        
        .info-value {
            color: #1e293b;
        }
        
        .summary-stats {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin: 20px 20px;
            padding: 20px;
            background: #f1f5f9;
            border-radius: 8px;
        }
        
        .stat-card {
            text-align: center;
            padding: 15px;
            background: white;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .stat-value {
            font-size: 18px;
            font-weight: bold;
            color: #1e40af;
            display: block;
        }
        
        .stat-label {
            font-size: 11px;
            color: #64748b;
            margin-top: 5px;
        }
        
        .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #1e40af;
            margin: 25px 20px 15px;
            padding-bottom: 5px;
            border-bottom: 2px solid #e2e8f0;
        }
        
        .table {
            width: 100%;
            border-collapse: collapse;
            margin: 0 20px 20px;
            max-width: calc(100% - 40px);
        }
        
        .table th {
            background: #1e40af;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: bold;
            font-size: 11px;
        }
        
        .table td {
            padding: 10px 8px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 11px;
        }
        
        .table tr:nth-child(even) {
            background: #f8fafc;
        }
        
        .table tr:hover {
            background: #f1f5f9;
        }
        
        .bag-header {
            background: #059669 !important;
            color: white;
            font-weight: bold;
        }
        
        .allocation-row {
            background: #ecfdf5 !important;
            font-size: 10px;
        }
        
        .allocation-row td {
            padding-left: 20px;
            color: #065f46;
        }
        
        .notes-section {
            margin: 20px;
            padding: 15px;
            background: #fffbeb;
            border-left: 4px solid #f59e0b;
            border-radius: 4px;
        }
        
        .notes-section h4 {
            color: #92400e;
            margin-bottom: 8px;
        }
        
        .footer {
            margin-top: 30px;
            padding: 20px;
            background: #f1f5f9;
            text-align: center;
            color: #64748b;
            font-size: 10px;
        }
        
        .page-break {
            page-break-before: always;
        }
        
        @media print {
            .header {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }
            .table th {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
            }
        }
        
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .text-green { color: #059669; }
        .text-red { color: #dc2626; }
        .text-blue { color: #2563eb; }
    </style>
</head>
<body>
    <div class="header">
        <h1>{{sale.saleNumber}} - Vendita Avanzata</h1>
        <p class="subtitle">Sistema di gestione acquacoltura FLUPSY Delta Futuro</p>
        <div class="company-info">
            <div><strong>Società Agricola Delta Futuro srl</strong></div>
            <div>Via Vallazza - 44020 Goro (FE)</div>
            <div>Email: deltafuturo.goro@gmail.com</div>
        </div>
    </div>

    <div class="sale-info">
        <div class="info-section">
            <h3>Informazioni Vendita</h3>
            <div class="info-row">
                <span class="info-label">Numero:</span>
                <span class="info-value">{{sale.saleNumber}}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Data:</span>
                <span class="info-value">{{formatDate sale.saleDate}}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Stato:</span>
                <span class="info-value">{{formatStatus sale.status}}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Generato:</span>
                <span class="info-value">{{currentDate}}</span>
            </div>
        </div>
        
        <div class="info-section">
            <h3>Cliente</h3>
            <div class="info-row">
                <span class="info-label">Nome:</span>
                <span class="info-value">{{sale.customerName}}</span>
            </div>
            {{#if sale.customerDetails.businessName}}
            <div class="info-row">
                <span class="info-label">Ragione Sociale:</span>
                <span class="info-value">{{sale.customerDetails.businessName}}</span>
            </div>
            {{/if}}
            {{#if sale.customerDetails.vatNumber}}
            <div class="info-row">
                <span class="info-label">P.IVA:</span>
                <span class="info-value">{{sale.customerDetails.vatNumber}}</span>
            </div>
            {{/if}}
        </div>
    </div>

    <div class="summary-stats">
        <div class="stat-card">
            <span class="stat-value">{{formatNumber sale.totalAnimals}}</span>
            <div class="stat-label">Animali Totali</div>
        </div>
        <div class="stat-card">
            <span class="stat-value">{{formatWeight sale.totalWeight}}</span>
            <div class="stat-label">Peso Totale</div>
        </div>
        <div class="stat-card">
            <span class="stat-value">{{sale.totalBags}}</span>
            <div class="stat-label">Sacchi</div>
        </div>
        <div class="stat-card">
            <span class="stat-value">{{formatAnimalsPerKg sale.totalAnimals sale.totalWeight}}</span>
            <div class="stat-label">Animali/kg</div>
        </div>
    </div>

    <h2 class="section-title">Configurazione Sacchi</h2>
    <table class="table">
        <thead>
            <tr>
                <th>Sacco</th>
                <th>Taglia</th>
                <th>Animali</th>
                <th>Peso Orig.</th>
                <th>Perdita</th>
                <th>Peso Finale</th>
                <th>Anim./kg</th>
                <th>Scarto %</th>
                <th>Note</th>
            </tr>
        </thead>
        <tbody>
            {{#each bags}}
            <tr class="bag-header">
                <td><strong>#{{bagNumber}}</strong></td>
                <td><strong>{{sizeCode}}</strong></td>
                <td class="text-right"><strong>{{formatNumber animalCount}}</strong></td>
                <td class="text-right"><strong>{{formatWeight originalWeight}}</strong></td>
                <td class="text-right"><strong>{{formatWeight weightLoss}}</strong></td>
                <td class="text-right"><strong>{{formatWeight totalWeight}}</strong></td>
                <td class="text-right"><strong>{{formatNumber animalsPerKg}}</strong></td>
                <td class="text-right"><strong>{{wastePercentage}}%</strong></td>
                <td>{{notes}}</td>
            </tr>
            {{#each allocations}}
            <tr class="allocation-row">
                <td>└─ Cestello #{{basketPhysicalNumber}}</td>
                <td>{{sourceSizeCode}}</td>
                <td class="text-right">{{formatNumber allocatedAnimals}}</td>
                <td class="text-right">{{formatWeight allocatedWeight}}</td>
                <td>-</td>
                <td>-</td>
                <td class="text-right">{{formatNumber sourceAnimalsPerKg}}</td>
                <td>-</td>
                <td>Op. #{{sourceOperationId}}</td>
            </tr>
            {{/each}}
            {{/each}}
        </tbody>
    </table>

    <h2 class="section-title">Operazioni di Origine</h2>
    <table class="table">
        <thead>
            <tr>
                <th>Operazione</th>
                <th>Data</th>
                <th>Cestello</th>
                <th>Animali</th>
                <th>Peso (kg)</th>
                <th>Animali/kg</th>
                <th>Stato</th>
            </tr>
        </thead>
        <tbody>
            {{#each operations}}
            <tr>
                <td><strong>#{{operationId}}</strong></td>
                <td>{{formatDate date}}</td>
                <td>#{{basketPhysicalNumber}}</td>
                <td class="text-right">{{formatNumber originalAnimals}}</td>
                <td class="text-right">{{formatWeight originalWeight}}</td>
                <td class="text-right">{{formatNumber originalAnimalsPerKg}}</td>
                <td><span class="text-green">Processata</span></td>
            </tr>
            {{/each}}
        </tbody>
    </table>

    {{#if sale.notes}}
    <div class="notes-section">
        <h4>Note Vendita</h4>
        <p>{{sale.notes}}</p>
    </div>
    {{/if}}

    <div class="footer">
        <p><strong>Società Agricola Delta Futuro srl</strong> - Sistema di gestione acquacoltura FLUPSY</p>
        <p>Documento generato automaticamente il {{currentDate}} - ID Vendita: {{sale.id}}</p>
    </div>
</body>
</html>
`;

export class PDFGeneratorService {
  private browser: any = null;

  async init() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
    }
  }

  async generateSalePDF(saleData: SaleData): Promise<Buffer> {
    await this.init();

    // Registra helper Handlebars
    this.registerHandlebarsHelpers();

    // Compila il template
    const template = handlebars.compile(HTML_TEMPLATE);
    
    // Prepara i dati per il template
    const templateData = {
      ...saleData,
      currentDate: format(new Date(), 'dd/MM/yyyy HH:mm', { locale: it })
    };

    const html = template(templateData);

    // Genera PDF
    const page = await this.browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '1cm',
        right: '1cm',
        bottom: '1cm',
        left: '1cm'
      },
      printBackground: true,
      preferCSSPageSize: true
    });

    await page.close();
    return pdfBuffer;
  }

  private registerHandlebarsHelpers() {
    // Helper per formattare date
    handlebars.registerHelper('formatDate', (date: string) => {
      if (!date) return '';
      return format(new Date(date), 'dd/MM/yyyy', { locale: it });
    });

    // Helper per formattare numeri
    handlebars.registerHelper('formatNumber', (number: number) => {
      if (!number) return '0';
      return number.toLocaleString('it-IT');
    });

    // Helper per formattare peso
    handlebars.registerHelper('formatWeight', (weight: number) => {
      if (!weight) return '0 kg';
      return `${weight.toFixed(2)} kg`;
    });

    // Helper per calcolare animali per kg
    handlebars.registerHelper('formatAnimalsPerKg', (animals: number, weight: number) => {
      if (!animals || !weight) return '0';
      return Math.round(animals / weight).toLocaleString('it-IT');
    });

    // Helper per formattare stato
    handlebars.registerHelper('formatStatus', (status: string) => {
      const statusMap: Record<string, string> = {
        'draft': 'Bozza',
        'confirmed': 'Confermata',
        'completed': 'Completata'
      };
      return statusMap[status] || status;
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Istanza singleton
export const pdfGenerator = new PDFGeneratorService();