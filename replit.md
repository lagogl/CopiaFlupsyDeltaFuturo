# FLUPSY Management System

## Overview
The FLUPSY Management System is a comprehensive web application for managing aquaculture operations, specifically designed for monitoring and controlling FLUPSY (Floating Upwelling System) installations. Its main purpose is to optimize aquaculture processes, providing real-time tracking of baskets, cycles, operations, and inventory management for shellfish cultivation. Key capabilities include growth forecasting, mortality tracking, and integration with external systems for seamless data flow. The system aims to enhance operational efficiency and provide intelligent insights for aquaculture management, with a business vision to provide innovative tools for sustainable aquaculture practices and expand market reach in the sector.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes (October 13, 2025)
- **OPERATION FORM - Blocco Operazioni su Cicli Chiusi + Fix Auto-Lotto Duplicazione** (October 13, 2025): Implementato blocco corretto + risolto bug auto-popolazione lotto
  - **Requisito Business CRITICO**: Cicli chiusi = SOLO visualizzazione, NESSUNA operazione permessa
  - **Problema 1**: Form permetteva erroneamente di tentare operazioni su cestelli senza ciclo attivo
  - **Problema 2**: Auto-popolazione lotto falliva in modalità "Duplica Operazione" → campo vuoto bloccava salvataggio
  - **Soluzione Implementata**:
    1. **Filtri rigorosi per cycleId**: Tutti i filtri richiedono match ESATTO con ciclo attivo (righe 195, 527, 607)
    2. **Blocco validazione form**: Se `!watchCycleId && tipo != 'prima-attivazione'` → form invalido (riga 226)
    3. **Fix auto-lotto duplicazione**: Rimosso `return` che bloccava useEffect quando cycleId non immediatamente disponibile (riga 600-602)
    4. **Messaggio utente chiaro**: Alert rosso visibile spiega perché operazione bloccata (righe 2155-2163)
  - **File**: `client/src/components/OperationFormCompact.tsx`
  - **Comportamento Corretto**: 
    - ✅ Cestello CON ciclo attivo → Operazioni permesse SOLO sul ciclo attivo, lotto auto-popolato
    - ⛔ Cestello SENZA ciclo attivo → SOLO Prima Attivazione permessa (apre nuovo ciclo)
    - 📋 Cicli chiusi → SOLO visualizzazione storica, zero modifiche
    - 🔄 Duplicazione operazioni → Lotto auto-popolato correttamente dopo caricamento cycleId
  - **UI**: Messaggio rosso chiaro quando bloccato + auto-popolazione lotto funzionante in duplicazione
- **REAL-TIME UPDATES - Fix Definitivo Cache Server** (October 13, 2025): Risolto bug critico cache server che causava ritardi nonostante fix frontend
  - **Problema**: Operazioni non apparivano per minuti nonostante `staleTime: 0` frontend
  - **Causa Root Reale**: Backend aveva cache con TTL 60 secondi in `operations-cache-service.ts` → dopo invalidazione WebSocket, frontend faceva refetch ma riceveva dati dalla cache server vecchia di 60 secondi
  - **Soluzione Definitiva**: Cambiato TTL da 60 secondi a `Infinity` (riga 28) → cache infinita con solo invalidazione esplicita via `OperationsCache.clear()` chiamato dopo ogni operazione
  - **File**: `server/operations-cache-service.ts` (riga 28)
  - **Flusso Corretto**: 
    1. Operazione salvata → Backend chiama `OperationsCache.clear()`
    2. WebSocket invalida cache frontend → Frontend fa refetch
    3. Backend non ha più cache → Query database → Dati freschi ✅
  - **Pattern Precedente (bug)**: Frontend `staleTime: 0` + Backend cache 60s = ritardi fino a 60 secondi
  - **Pattern Nuovo (fix)**: Frontend `staleTime: 0` + Backend TTL Infinity con clear esplicito = aggiornamenti istantanei
- **SPREADSHEET OPERATIONS - Validazione Date Corretta** (October 12, 2025): Risolto bug critico che impediva il salvataggio operazioni
  - **Problema**: Validazione date considerava operazioni di cicli chiusi, bloccando silenziosamente i salvataggi
  - **Causa Root**: `validateOperationDate()` filtrava TUTTE le operazioni del cestello senza distinguere ciclo attivo da cicli chiusi
  - **Soluzione 1**: Modificato filtro per considerare solo operazioni del ciclo corrente: `filter(op => op.basketId === basketId && (currentCycleId ? op.cycleId === currentCycleId : true))`
  - **Soluzione 2**: Aggiunto `currentCycleId` a righe spreadsheet e form di editing per passarlo alla validazione
  - **File**: `client/src/pages/SpreadsheetOperations.tsx` (righe 233-238, 580, 1153, 297)
  - **Verifica**: POST a `/api/direct-operations` ora funziona correttamente, operazioni salvate con successo
- **SISTEMA NOTIFICHE COMPLETAMENTE FUNZIONALE** (October 10, 2025): Sistema di notifiche real-time operativo al 100%
  - **Notifiche Vendita da Vagliature**: Implementata creazione automatica notifiche quando vagliature generano vendite
    - Pattern: `req.app.locals.createSaleNotification(operationId)` chiamato dopo insert operazione con `.returning()` 
    - File: `server/controllers/selection-controller.ts` (righe ~1216-1251)
  - **UI Notifiche Migliorata**: Icona campanella si colora per TUTTI i tipi di notifica, non solo vendite
    - Icona verde per qualsiasi notifica non letta (vendite, accrescimenti, altri)
    - Badge: verde per vendite, arancione per accrescimenti, rosso per altri tipi
    - File: `client/src/components/NotificationBell.tsx` (righe ~177-202)
  - **Sistema Notifiche Accrescimento Dual-Mode**: Due casistiche separate per massima precisione
    - **Casistica 1 - Real-Time (valore misurato)**: 
      - Funzione: `checkOperationForTargetSize(operationId)` 
      - Trigger: Dopo ogni operazione peso/prima-attivazione
      - Logica: Usa valore **reale misurato** dall'operazione (animalsPerKg) - NO proiezione SGR
      - Integrata in 3 punti in `server/routes.ts`: prima-attivazione (~2332), chiusura ciclo (~2531), operazioni standard (~2593)
    - **Casistica 2 - Batch Mezzanotte (proiezione SGR)**:
      - Funzione: `checkCyclesForTargetSizes()` 
      - Trigger: Timer a mezzanotte + endpoint manuale `POST /api/check-growth-notifications`
      - Logica: Solo cicli ATTIVI con operazioni passate → calcola proiezione giornaliera usando `sgr.percentage` (crescita % giornaliera per mese) → confronta con taglie target
      - Timer: Configurato in `server/index.ts` (righe 152-175), esecuzione giornaliera automatica
- **CRITICAL BUG FIX - Cache Invalidation dopo Popolamento FLUPSY**: Risolto bug critico che impediva l'aggiornamento automatico dei cestelli dopo il popolamento di un FLUPSY
  - **Problema**: Codice di invalidazione cache era nel file sbagliato (`server/routes.ts` invece di `server/modules/core/flupsys/flupsys.service.ts`)
  - **Causa Root**: La route POST `/api/flupsys/:id/populate` è gestita dal modulo FLUPSY, non da routes.ts
  - **Soluzione**: Aggiunto import dinamico di `invalidateCache` da `baskets-controller` in `flupsys.service.ts` metodo `populateFlupsy()` (righe ~239-248)
  - **Pattern**: Import dinamico con try-catch per evitare che errori di cache blocchino il popolamento
  - **Verifica**: Test confermati - cache viene invalidata correttamente (log: "✅ Cache cestelli invalidata dopo popolamento FLUPSY")
  - **Cleanup**: Rimosso codice legacy duplicato da routes.ts (ridotto da 7193 a ~7165 righe)
- **Major Refactoring Completato**: Modularizzazione di routes.ts (ridotto da 7873 a 7245 righe)
  - Nuovo modulo: `server/modules/system/maintenance` - Route di test, debug e emergenza
  - Nuovo modulo: `server/modules/system/database-management` - Backup, restore, export giacenze
  - Nuovo modulo: `server/modules/reports/eco-impact` - Gestione impatto ambientale e sostenibilità
  - Nuovo modulo: `server/modules/reports/sales-reports` - Report e statistiche vendite
  - Utility centralizzate: `server/utils/error-handler.ts` per gestione errori unificata
  - Servizi estratti: `server/services/basket-lot-composition.service.ts` per composizione lotti misti
  - Pulizia import non utilizzati e codice duplicato

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state management
- **Build Tool**: Vite
- **UI/UX Decisions**: Designed for a compact, professional, and mobile-first spreadsheet-like interface. Features color-coded basket performance indicators, consistent styling, readability enhancements (e.g., thousand separators), and enhanced input precision for average weight calculations (3 decimal places).

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM
- **API Architecture**: RESTful API with external API integration
- **Real-time Communication**: WebSocket implementation for live updates

### Database Architecture
- **Primary Database**: PostgreSQL 16
- **ORM**: Drizzle ORM with type-safe queries
- **Schema Management**: Drizzle Kit for migrations
- **External Integration**: Supports separate external database connections for data synchronization.

### Key Components
- **Core Entities**: FLUPSY Systems, Baskets, Cycles, Operations (cleaning, screening, weighing), Lots, Selections/Screenings, Advanced Sales, DDT (Documento di Trasporto).
- **Business Logic**: Inventory Management, Growth Forecasting (SGR calculations), Mortality Tracking, External Data Synchronization, Quality Control, Advanced Sales with DDT Generation.
- **AI Integration**: Hybrid system integrating DeepSeek-V3 for predictive growth analysis, anomaly detection, sustainability analysis, and business analytics. Includes an autonomous fallback system and provides FLUPSY-level insights with basket breakdown, featuring AI-enhanced performance scoring with predictive trend analysis.
- **DDT System** (October 2025): Complete transport document (DDT) generation for advanced sales with:
  - Three-state tracking: nessuno/locale/inviato
  - Immutable customer data snapshot for regulatory compliance
  - Complete traceability: sale → bags → allocations → baskets
  - Subtotals grouped by size (taglia) following DOCUMENTAZIONE_SISTEMA_DDT.md pattern
  - Integration with Fatture in Cloud API for DDT synchronization
  - PDF report generation with landscape orientation, customer details, and bag/basket allocation tables
  - **Sale Reversal** (October 2025): Physical deletion of advanced sales with cascading cleanup (bags, allocations, DDT, DDT lines, operation references) in atomic transaction. Restricted to sales with DDT status 'locale' or 'nessuno' - prevents deletion if DDT already sent to Fatture in Cloud. Includes ID validation to prevent 500 errors on invalid input.
- **Dynamic Logo System** (October 2025): Automated company logo integration in all PDF reports based on Fatture in Cloud Company ID:
  - Centralized logo service (`server/services/logo-service.ts`) with Company ID → logo mapping
  - Company 1017299 (EcoTapes Società Agricola) → logo-ecotapes.png
  - Company 13263 (Delta Futuro Soc. Agr. srl) → logo-delta-futuro.png
  - Integrated in 4 PDF types: Advanced Sales (Puppeteer), Sales Report (PDFKit), DDT (PDFKit), Screening/Selection (PDFKit)
  - Automatic logo retrieval from `configurazione` table using 'fatture_in_cloud_company_id' key

### System Design Choices
- **Data Flow**: User input flows from React components to PostgreSQL via TanStack Query, Express API, and Drizzle ORM. Real-time updates occur via WebSocket. External data is synchronized via API.
- **Operation Workflow**: Validated user operations are processed server-side, trigger WebSocket notifications, and update inventory calculations.
- **External Integration Flow**: Standardized JSON data exchange with API key authentication, including processes for data consistency and conflict resolution.
- **Spreadsheet Operations Module**: Independent module featuring a mobile-first, editable cell interface for rapid data entry, real-time validation, auto-save, batch operations, dynamic size calculation, intelligent performance-based sorting of baskets, and visual performance indicators.
- **Manual Editing**: Enhanced functionality for manual input of mortality percentage and animals per kg, with automatic calculations disabled when manual mode is active.
- **PWA Implementation**: Full Progressive Web App configuration enabling smartphone installation while maintaining desktop compatibility, including service worker for offline capabilities and web manifest.
- **Deployment Strategy**: Node.js 20 on Replit with PostgreSQL 16 for development; Vite/esbuild for production build with autoscale deployment. PWA assets automatically served for mobile installation.
- **Branding**: MITO SRL logo integrated consistently after page titles using a reusable `PageHeader` component.
- **Query Optimization Pattern** (October 2025): Critical pattern for Drizzle ORM queries - avoid complex SQL subqueries with `sql<number>` templates containing `${table.column}` references. Instead: (1) Use simple separate queries, (2) Aggregate data application-side with `reduce()`, (3) Use `Promise.all()` for parallel enrichment. This pattern is proven in production apps and prevents SQL syntax errors in complex aggregations.

## External Dependencies

### Core Libraries
- `@tanstack/react-query`
- `drizzle-orm`
- `@neondatabase/serverless`
- `express`
- `pg`
- `ws`

### UI Libraries
- `@radix-ui/***`
- `tailwindcss`
- `lucide-react`
- `react-hook-form`
- `@hookform/resolvers`

### Development Tools
- `typescript`
- `vite`
- `tsx`
- `drizzle-kit`

### Third-party Integrations
- DeepSeek API (for AI capabilities)
- Fatture in Cloud (for client and DDT management, via OAuth2 authentication and API)
  - **Implementation**: Uses `configurazione` table for storing OAuth2 tokens and credentials (chiave/valore pattern)
  - **Backend**: `server/controllers/fatture-in-cloud-controller.ts` with endpoints for OAuth2, client sync, DDT creation
  - **Frontend**: `/fatture-in-cloud` page (FattureInCloudConfig.tsx) for configuration and management
  - **Secrets**: FATTURE_IN_CLOUD_CLIENT_ID, FATTURE_IN_CLOUD_CLIENT_SECRET, FATTURE_IN_CLOUD_COMPANY_ID stored in Replit secrets
  - **Database Schema**: New `fatture_in_cloud_config` table added for dedicated OAuth2 configuration storage (October 2025)
  - **DDT Transport Fields** (October 12, 2025): Critical field names discovered after extensive testing:
    - ✅ **CORRECT**: `dn_ai_packages_number` (string, e.g., `"2"`) - Delivery Note Accompanying Invoice package count
    - ✅ **CORRECT**: `dn_ai_weight` (string, e.g., `"34.80"`) - Delivery Note Accompanying Invoice weight
    - Fields must be at **root level** of document payload, NOT in nested objects
    - Both fields require **string type**, not numbers (API validation fails with numeric values)
    - ❌ Failed attempts: `delivery_note_*` in extra_data, `ddt_transport.*` object, numeric `dn_ai_packages_number`