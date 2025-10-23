# FLUPSY Management System

## Overview
The FLUPSY Management System is a web application designed for managing aquaculture operations, specifically FLUPSY (Floating Upwelling System) installations. Its primary purpose is to optimize aquaculture processes by providing real-time tracking of baskets, cycles, operations, and inventory for shellfish cultivation. Key capabilities include growth forecasting, mortality tracking, and integration with external systems. The system aims to enhance operational efficiency and provide intelligent insights for sustainable aquaculture practices.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query
- **Build Tool**: Vite
- **UI/UX Decisions**: Compact, professional, mobile-first spreadsheet-like interface with color-coded basket performance indicators, consistent styling, readability enhancements, and enhanced input precision. PWA configuration for smartphone installation and offline capabilities.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ES modules)
- **Database ORM**: Drizzle ORM
- **API Architecture**: RESTful API with external API integration
- **Real-time Communication**: WebSocket implementation

### Database Architecture
- **Primary Database**: PostgreSQL 16
- **ORM**: Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations
- **External Integration**: Supports separate external database connections for data synchronization.

### Key Components
- **Core Entities**: FLUPSY Systems, Baskets, Cycles, Operations (cleaning, screening, weighing), Lots, Selections/Screenings, Advanced Sales, DDT.
- **Business Logic**: Inventory Management, Growth Forecasting (size-specific SGR calculations from historical data), Mortality Tracking, External Data Synchronization, Quality Control, Advanced Sales with DDT Generation.
- **SGR Per Taglia System**: Advanced growth rate calculation system analyzing historical operations from same month previous year, specific per size category. Features automated monthly scheduler (day 1, 02:00), AI data quality validation, WebSocket-based progress tracking for manual recalculation, and intelligent fallback chain (sgr_per_taglia → sgr → 2.5% default).
  - **Database**: `sgr_per_taglia` table with unique index on (month, sizeId) storing calculated SGR, sample count, and last calculation timestamp.
  - **Calculation Formula**: SGR = [(ln(W2) - ln(W1)) / Days] × 100
  - **AI Quality Check**: Validates operations before calculations, excludes outliers (>10% or <-5% daily growth), handles mortality exceptions.
  - **Size Transition Handling**: Predictive system dynamically changes SGR when animals transition between size categories during growth predictions.
  - **Dashboard**: "SGR Per Taglia" tab in /sgr page displaying size-specific SGR values, recalculation button with real-time progress bar, and statistics (monitored sizes, average SGR, total samples).
  - **Full System Integration**: SGR hierarchy implemented across all prediction modules including cycle predictions, FlupsyComparison module, and growth prediction API. Uses Italian month names for database lookups and measurement-date-based projections for consistency.
- **AI Integration**: Hybrid system integrating DeepSeek-V3 for predictive growth analysis using real historical SGR data, anomaly detection, sustainability analysis, business analytics, and AI-enhanced performance scoring.
- **AI Report Generator**: Advanced report generation module with 10 comprehensive features:
  - **Dynamic Schema Auto-Generation**: Automatic database schema discovery (48 tables, 18 curated relationships) with fallback for missing foreign keys.
  - **Pre-Configured Templates**: 10 ready-to-use templates across 5 categories (Performance, Quality, Forecast, Operations, Sales).
  - **Multi-Format Export**: Excel (XLSX), CSV, JSON with dynamic MIME types and proper escaping.
  - **Preventive Validation**: 4-check validation system (length, generic patterns, domain keywords, temporal context) with suggestions.
  - **Conversational Memory**: Multi-turn chat support for iterative refinement, works for freeform and template-based requests.
  - **Intelligent Query Caching**: SHA-256-based cache with 30-minute TTL, automatic invalidation via WebSocket when new operations arrive, real-time statistics dashboard (hit/miss ratio, cached queries count). Cache service with NodeCache backend, logging for debugging.
  - **AI Insights Post-Extraction**: Automatic AI analysis of extracted data identifying patterns, anomalies, trends, correlations, and actionable recommendations. Insights included in user messages and as separate Excel sheet. Statistical analysis with key metrics, outlier detection, and temporal trend analysis.
- **Growth Prediction System**: Interactive growth forecasting with automatic weight calculation from size data, customizable projection start date, variable monthly SGR application, and intelligent decimal formatting for weights ranging from micrograms to grams. Formula: `peso_mg = 1,000,000 / media(animali_per_kg)`. Displays values with adaptive precision (6 decimals for <0.01mg, scientific notation for very small values).
- **DDT System**: Generates transport documents for advanced sales with three-state tracking, immutable customer data snapshots, traceability, subtotals by size, and integration with Fatture in Cloud API. Includes sale reversal functionality.
- **Dynamic Logo System**: Automated company logo integration in all PDF reports based on Fatture in Cloud Company ID.
- **NFC Tag Management**: Comprehensive NFC tag programming system with manual basket state override and timestamp tracking. Operators can toggle basket state between "available" and "in use" via visual toggle buttons (green/orange color-coded), complementing automatic state management during operations.
  - **NFC Data Storage v2.0**: Database `nfcData` field stores unique basket identifier (`basket-${basketId}-${timestamp}`) instead of physical tag serialNumber to prevent duplicate values when reusing tags.
  - **Tag Structure**: Physical tag contains JSON with basketId, physicalNumber, currentCycleId, flupsyId, position, redirectTo URL, and physical serialNumber.
  - **Tag Reading**: System reads basketId from tag's JSON payload for basket lookup, ensuring reliable identification regardless of tag reuse.
  - **Timestamp Tracking**: Database field `nfcLastProgrammedAt` stores ISO 8601 timestamp when tag is programmed/reprogrammed across all 4 programming methods (WeChat, Native NFC, USB bridge, Simulation). UI displays formatted timestamps in Italian locale (dd/mm/yyyy hh:mm) in management interface.
- **Spreadsheet Operations Module**: Mobile-first, editable cell interface for rapid data entry, real-time validation, auto-save, batch operations, dynamic size calculation, intelligent performance-based sorting, and visual performance indicators.
- **Operation Workflow**: Validated user operations are processed server-side, trigger WebSocket notifications, and update inventory calculations. All operations include source tracking to distinguish desktop manager operations from mobile NFC app operations.
- **Operation Source Tracking**: Database field `source` (enum: 'desktop_manager' | 'mobile_nfc') identifies operation origin. Desktop operations default to 'desktop_manager', mobile NFC operations use 'mobile_nfc'. Implemented across all 13 operation INSERT statements in 6 critical backend files.
- **Mixed-Lot Basket Tracking System**: Comprehensive automatic metadata enrichment for Ruditapes philippinarum operations on mixed-lot baskets. Implemented via dual PostgreSQL triggers ensuring automatic enrichment, derived field calculation, and immutability protection.
  - **Trigger Architecture**: Two-stage database trigger system for complete data integrity:
    - `trigger_enrich_mixed_lot_metadata` (BEFORE INSERT): Auto-calculates derived fields (average_weight, animals_per_kg) and enriches metadata/notes on operation creation
    - `trigger_protect_mixed_lot_metadata` (BEFORE UPDATE): Enforces immutability, prevents metadata/notes modification after initial enrichment
  - **Derived Fields Calculation**: INSERT trigger automatically calculates:
    - `average_weight = (total_weight * 1000) / animal_count` (mg per animal) - only when values > 0
    - `animals_per_kg = (animal_count / total_weight) * 1000` - only when values > 0 and not user-specified
    - Division-by-zero protection: returns NULL for zero/NULL inputs (production-safe)
  - **Automatic Enrichment**: INSERT trigger intercepts all peso/misura/prima-attivazione operations, queries basket_lot_composition table, and auto-populates metadata and notes fields for mixed-lot baskets.
  - **Metadata Structure**: JSON format `{isMixed: true, dominantLot: lotId, lotCount: number, composition: [{lotId, percentage, animalCount}]}` capturing complete proportional distribution and composition.
  - **Operator Notes Preservation**: Mobile NFC app can specify custom notes which are preserved and combined with mixed-lot info: `"Operator note | LOTTO MISTO: composition"`. For non-mixed baskets or when no custom notes provided, behavior unchanged.
  - **Human-Readable Notes**: Auto-generated format "LOTTO MISTO: Taylor (68.1% - 12255 animali) + Ecotapes Zeeland (31.9% - 5745 animali)" for immediate operator comprehension, prefixed with operator custom notes if provided.
  - **Guaranteed Immutability**: UPDATE trigger preserves original metadata/notes values, preventing accidental or malicious modification via API, service layer, or direct SQL. Audit trail cannot be tampered with after creation.
  - **Complete Audit Trail**: Every operation on mixed baskets receives immutable snapshot of lot composition at operation time, enabling historical traceability and regulatory compliance.
  - **Performance**: Database-side execution ensures zero overhead on Node.js application, no TypeScript compilation dependencies, atomic transaction consistency, and independence from hot-reload issues.
  - **Scope**: Applies to operation types: 'peso', 'misura', 'prima-attivazione'. Non-mixed baskets maintain NULL metadata/notes (intentional design).
- **FlupsyComparison Dashboard**: Interactive comparison module with dual-mode analysis ("Data Futura" for time-based projections, "Taglia Target" for size-based goals). Features visual totalizers panel with 4 color-coded cards tracking target achievement metrics (animals reaching target, animals reaching target within selected timeframe, animals out of target, total animals). Exports comprehensive Excel reports with 4 sheets: Totalizzazioni (summary metrics), Dettaglio Cestelli (basket-by-basket analysis), Previsione X giorni (future projections), Taglia TARGET (target achievement details). Size comparison logic uses weight-based thresholds (futureWeight >= targetMinWeight) for accurate classification across all basket states.
- **Query Optimization Pattern**: Utilizes simple separate queries, application-side data aggregation with `reduce()`, and `Promise.all()` for parallel enrichment in Drizzle ORM to avoid complex SQL subqueries.

### System Design Choices
- **Data Flow**: User input flows from React components to PostgreSQL via TanStack Query, Express API, and Drizzle ORM. Real-time updates via WebSocket.
- **External Integration Flow**: Standardized JSON data exchange with API key authentication, focusing on data consistency and conflict resolution.
- **Deployment Strategy**: Node.js 20 on Replit with PostgreSQL 16 for development; Vite/esbuild for production with autoscale deployment. PWA assets automatically served.

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
    - Uses `configurazione` and `fatture_in_cloud_config` tables for storing OAuth2 tokens and credentials.
    - Critical DDT transport fields `dn_ai_packages_number` and `dn_ai_weight` are strings at the root level of the document payload.