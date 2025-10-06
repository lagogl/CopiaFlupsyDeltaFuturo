// Sistema di traduzioni per il menu multilingue
export interface MenuTranslations {
  // Header
  title: string;
  menu: string;
  userDropdown: {
    myAccount: string;
    settings: string;
    logout: string;
  };

  // Categorie del menu
  categories: {
    operational: string;
    monitoring: string;
    inventory: string;
    analysis: string;
    sales: string;
    system: string;
  };

  // Voci del menu
  menuItems: {
    dashboard: string;
    lotManagement: string;
    basketManagement: string;
    positionManagement: string;
    operations: string;
    advancedOperations: string;
    spreadsheetOperations: string;
    screeningWithMap: string;
    screeningHistory: string;
    nfcFirstActivation: string;
    flupsyScanMobile: string;
    flupsyUnits: string;
    flupsyComparison: string;
    growthPath: string;
    advancedSelection: string;
    productionCycles: string;
    sizeTable: string;
    stockInventory: string;
    stockRangeCalculation: string;
    export: string;
    aiDashboard: string;
    aiReportGenerator: string;
    statistics: string;
    lotsAnalytics: string;
    lotLedgerStatistics: string;
    sgrIndices: string;
    salesReports: string;
    plantDiary: string;
    environmentalImpact: string;
    salesManagement: string;
    nfcTagManagement: string;
    settings: string;
    notificationManagement: string;
    invoicesInCloud: string;
    databaseBackup: string;
    adminUtilities: string;
  };

  // Footer della lingua
  languageSelector: {
    language: string;
  };
}

export const translations: Record<'it' | 'en', MenuTranslations> = {
  it: {
    title: "FLUPSY Ecotapes/Delta Futuro",
    menu: "Menu",
    userDropdown: {
      myAccount: "Il mio account",
      settings: "Impostazioni",
      logout: "Logout"
    },
    categories: {
      operational: "GESTIONE OPERATIVA",
      monitoring: "MONITORAGGIO",
      inventory: "INVENTARIO",
      analysis: "ANALISI",
      sales: "VENDITE",
      system: "SISTEMA"
    },
    menuItems: {
      dashboard: "Dashboard",
      lotManagement: "Gestione Lotti",
      basketManagement: "Gestione Ceste",
      positionManagement: "Gestione Posizioni",
      operations: "Operazioni",
      advancedOperations: "Operazioni Avanzate",
      spreadsheetOperations: "Spreadsheet Operazioni",
      screeningWithMap: "Vagliatura con Mappa",
      screeningHistory: "Storico Vagliature",
      nfcFirstActivation: "Prima Attivazione NFC",
      flupsyScanMobile: "FlupsyScan Mobile",
      flupsyUnits: "Unità FLUPSY",
      flupsyComparison: "Confronto FLUPSY",
      growthPath: "Percorso di Crescita",
      advancedSelection: "Selezione Avanzata",
      productionCycles: "Cicli Produttivi",
      sizeTable: "Tabella Taglie",
      stockInventory: "Inventario Giacenze",
      stockRangeCalculation: "Calcolo Giacenze Range",
      export: "Esportazione",
      aiDashboard: "AI Dashboard",
      aiReportGenerator: "Generatore Report AI",
      statistics: "Statistiche",
      lotsAnalytics: "Analisi Lotti",
      lotLedgerStatistics: "Statistiche Lot Ledger",
      sgrIndices: "Indici SGR",
      salesReports: "Report di Vendita",
      plantDiary: "Diario di Impianto",
      environmentalImpact: "Impatto Ambientale",
      salesManagement: "Gestione Vendite",
      nfcTagManagement: "Gestione Tag NFC",
      settings: "Impostazioni",
      notificationManagement: "Gestione Notifiche",
      invoicesInCloud: "Fatture in Cloud",
      databaseBackup: "Backup Database",
      adminUtilities: "Utilità Amministrazione"
    },
    languageSelector: {
      language: "LINGUA | LANGUAGE"
    }
  },
  en: {
    title: "FLUPSY Ecotapes/Delta Futuro",
    menu: "Menu",
    userDropdown: {
      myAccount: "My Account",
      settings: "Settings",
      logout: "Logout"
    },
    categories: {
      operational: "OPERATIONS MANAGEMENT",
      monitoring: "MONITORING",
      inventory: "INVENTORY",
      analysis: "ANALYSIS",
      sales: "SALES",
      system: "SYSTEM"
    },
    menuItems: {
      dashboard: "Dashboard",
      lotManagement: "Lot Management",
      basketManagement: "Basket Management",
      positionManagement: "Position Management",
      operations: "Operations",
      advancedOperations: "Advanced Operations",
      spreadsheetOperations: "Spreadsheet Operations",
      screeningWithMap: "Screening with Map",
      screeningHistory: "Screening History",
      nfcFirstActivation: "NFC First Activation",
      flupsyScanMobile: "FlupsyScan Mobile",
      flupsyUnits: "FLUPSY Units",
      flupsyComparison: "FLUPSY Comparison",
      growthPath: "Growth Path",
      advancedSelection: "Advanced Selection",
      productionCycles: "Production Cycles",
      sizeTable: "Size Table",
      stockInventory: "Stock Inventory",
      stockRangeCalculation: "Stock Range Calculation",
      export: "Export",
      aiDashboard: "AI Dashboard",
      aiReportGenerator: "AI Report Generator",
      statistics: "Statistics",
      lotsAnalytics: "Lots Analytics",
      lotLedgerStatistics: "Lot Ledger Statistics",
      sgrIndices: "SGR Indices",
      salesReports: "Sales Reports",
      plantDiary: "Plant Diary",
      environmentalImpact: "Environmental Impact",
      salesManagement: "Sales Management",
      nfcTagManagement: "NFC Tag Management",
      settings: "Settings",
      notificationManagement: "Notification Management",
      invoicesInCloud: "Invoices in Cloud",
      databaseBackup: "Database Backup",
      adminUtilities: "Admin Utilities"
    },
    languageSelector: {
      language: "LINGUA | LANGUAGE"
    }
  }
};