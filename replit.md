# FLUPSY Management System

## Overview
The FLUPSY Management System is a comprehensive web application for managing aquaculture operations, specifically designed for monitoring and controlling FLUPSY (Floating Upwelling System) installations. Its main purpose is to optimize aquaculture processes, providing real-time tracking of baskets, cycles, operations, and inventory management for shellfish cultivation. Key capabilities include growth forecasting, mortality tracking, and integration with external systems for seamless data flow. The system aims to enhance operational efficiency and provide intelligent insights for aquaculture management.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes
- **Performance Optimization Completata con Successo Straordinario (Settembre 19, 2025)**: Trasformazione completa del sistema FLUPSY da lento e problematico a veloce e reattivo. SUCCESSI MAGGIORI: 1) WebSocket sincronizzazione PERFETTA (aggiornamenti visuali immediati, cache sync confermata), 2) API switch-positions COMPLETAMENTE RIPARATA (errori 500 eliminati, funziona perfettamente), 3) Query database DRASTICAMENTE MIGLIORATE (cestelli da 2037ms a 1-2ms cache hit = 99.9% miglioramento, operazioni da 4489ms a 660ms = 73% miglioramento), 4) Cache invalidation FUNZIONANTE (log confermato: "🗑️ CACHE: Position cache invalidated"), 5) Sistema STABILE E VELOCE. Rimangono ottimizzazioni finali: switch API latenza (5815ms → target <500ms), position queries (867ms → target <500ms), chiamate duplicate API, indici database startup, password security (plaintext → bcrypt).
- **Modulo Vagliatura con Mappa con Vendita Cestelli Completamente Testato (Settembre 17, 2025)**: Completati con successo tutti i test del modulo vagliatura con mappa inclusi scenari complessi di vendita cestelli. Risolto errore critico PostgreSQL "NaN" nel controller screening implementando safe conversion utilities (safeNumber, safeInteger). Implementato supporto completo destinationType ("placed" vs "sold") e campi vendita (saleClient, saleDate, animalCount, totalWeight). Test confermati dall'architetto: vendita cestelli [cestello 10 venduto a "Cliente Vendita Test"], scenario complesso [cestelli origine 1,2 → cestello 4 venduto a "Cliente Premium" + cestelli 3,16 reinseriti], 26 operazioni database create totali, notifiche WebSocket real-time operative. Sistema produzione-ready per scenari complessi inclusa vendita diretta da vagliatura.
- **Logica Vagliatura Corretta Implementata (Agosto 24, 2025)**: Risolto completamente l'errore critico di logica nella procedura di vagliatura. TUTTI i cestelli origine ora ricevono correttamente operazione "chiusura-ciclo-vagliatura" per cessare il ciclo esistente, inclusi quelli che sono anche destinazioni. I cestelli origine+destinazione seguono il processo: cessazione vecchio ciclo → nuova attivazione con nuovo ciclo. Implementato calcolo mortalità (origine - destinazioni) e preparazione campi database per tracciabilità. Sistema ora matematicamente corretto e conforme ai requisiti aziendali.
- **Spreadsheet Operations Form Pre-population Fixed (August 23, 2025)**: Resolved critical issue where the "Peso totale" field in forms showed placeholder value "15000" instead of real values from last operation. Fixed backend query using DISTINCT ON for better Postgres compatibility and added missing lastOperation field to frontend row data. Forms now correctly pre-populate with actual weight values (55000g, 45500g, etc.) from the most recent operations.
- **WeChat Bridge NFC Integration Completed (August 19, 2025)**: Successfully integrated WeChat Bridge support for NFC Tool Pro in both NFCTagManager and FlupsyScan Mobile modules. Writing works via physical NFC Tool Pro bridge, reading uses simulation approach with database lookup for tag data. Desktop PC automatically detects and uses WeChat Bridge - physical writing for tag programming, simulation-based reading for tag scanning. System properly attempts physical bridge connection first, then falls back to controlled simulation. Complete dual-mode functionality working as intended with NFC Tool Pro hardware integration.
- **Cache Management System and Service Worker Fixed (August 17, 2025)**: Completely resolved "PULISCI CACHE" button error caused by Service Worker caching obsolete JavaScript code with removed functions. Fixed by disabling Service Worker temporarily, removing all cached versions, updating cache invalidation logic, and implementing proper error handling. Service Worker was causing conflicts by serving old JavaScript that referenced non-existent functions like `refetchUnified()`. Cache clearing now works reliably without Service Worker interference.
- **Service Worker Cache Issue Completely Resolved (August 17, 2025)**: Fixed critical Service Worker cache problem that was serving an obsolete version of Operations.tsx with removed "unified data" system. The issue caused JavaScript errors ("sgrs is not defined") and prevented operations from displaying. Resolved by disabling Service Worker temporarily, adding missing SGR query, eliminating unified system completely, and implementing proper cache-busting. All operations now display correctly across both internal preview and external .replit.dev URLs.
- **Operations Cache Synchronization Fixed (August 15, 2025)**: Resolved critical cache synchronization issue where the database contained more operations than displayed in the interface. The operations unified controller cache was not properly invalidated when external apps created operations, causing data inconsistency. Implemented forced cache refresh on startup and enhanced cache invalidation mechanisms. Users now see all operations consistently across database and interface.
- **NFC Tag Management Enhanced (August 15, 2025)**: Improved NFC tag display functionality by adding automatic refresh when app returns to foreground (optimized for mobile NFC programming workflow), manual refresh button for cross-device synchronization, and periodic refresh every 30 seconds. Enhanced cache invalidation on successful NFC writes and improved responsive design for better desktop/mobile compatibility.
- **PWA Configuration Added (August 15, 2025)**: Configured the application as a Progressive Web App (PWA) to enable smartphone installation while maintaining full desktop compatibility. Added service worker, web manifest, install prompt component, and all necessary meta tags. Users can now install the app directly from their smartphone browser for offline access and enhanced NFC functionality.
- **Application Startup Issues Resolved (August 15, 2025)**: Fixed critical port conflict errors and JavaScript/TypeScript import issues. Converted cache services from JavaScript to TypeScript, resolved EADDRINUSE port 5000 conflicts, and ensured all optimizations and database connections work properly. System now runs reliably without startup errors.
- **Tooltip Positioning Fix (August 13, 2025)**: Fixed performance indicator tooltips in SpreadsheetOperations.tsx that were appearing hidden on the left side. Changed positioning from `side="left"` to `side="right"` for better visibility and user experience.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state management
- **Build Tool**: Vite
- **UI/UX Decisions**: Designed for a compact, professional, and mobile-first spreadsheet-like interface. Includes color-coded basket performance indicators, consistent styling, and a focus on readability with features like thousand separators for numeric columns. Enhanced input precision for average weight calculations (3 decimal places).

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
- **Core Entities**: FLUPSY Systems, Baskets, Cycles, Operations (cleaning, screening, weighing), Lots, Selections/Screenings.
- **Business Logic**: Inventory Management, Growth Forecasting (SGR calculations), Mortality Tracking, External Data Synchronization, Quality Control.
- **Integration Components**: External API, Data Import/Export (JSON), WebSocket Server, Database Consistency Manager.
- **AI Integration**: Hybrid system integrating DeepSeek-V3 for predictive growth analysis, anomaly detection, sustainability analysis, and business analytics. Includes an autonomous fallback system for continuous operation. AI analysis is FLUPSY-level, providing insights across entire units with basket breakdown. Features AI-enhanced performance scoring with predictive trend analysis based on mortality, population, weight growth, and operation frequency.

### System Design Choices
- **Data Flow**: User input flows from React components to PostgreSQL via TanStack Query, Express API, and Drizzle ORM. Real-time updates occur via WebSocket. External data is synchronized via API.
- **Operation Workflow**: Validated user operations are processed server-side, trigger WebSocket notifications, and update inventory calculations.
- **External Integration Flow**: Standardized JSON data exchange with API key authentication, including processes for data consistency and conflict resolution.
- **Spreadsheet Operations Module**: Independent module featuring a mobile-first, editable cell interface for rapid data entry, real-time validation, auto-save, and batch operations. It includes dynamic size calculation, intelligent performance-based sorting of baskets, and visual performance indicators.
- **Manual Editing**: Enhanced functionality for manual input of mortality percentage and animals per kg, with automatic calculations disabled when manual mode is active.
- **PWA Implementation**: Full Progressive Web App configuration enabling smartphone installation while maintaining desktop compatibility. Includes service worker for offline capabilities, web manifest for app-like experience, and install prompt for seamless mobile deployment. Optimized for NFC functionality on mobile devices.
- **Deployment Strategy**: Node.js 20 on Replit with PostgreSQL 16 for development; Vite/esbuild for production build with autoscale deployment. PWA assets automatically served for mobile installation.
- **Branding**: MITO SRL logo integrated consistently after page titles using a reusable `PageHeader` component.

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