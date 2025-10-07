# FLUPSY Management System

## Overview
The FLUPSY Management System is a comprehensive web application for managing aquaculture operations, specifically designed for monitoring and controlling FLUPSY (Floating Upwelling System) installations. Its main purpose is to optimize aquaculture processes, providing real-time tracking of baskets, cycles, operations, and inventory management for shellfish cultivation. Key capabilities include growth forecasting, mortality tracking, and integration with external systems for seamless data flow. The system aims to enhance operational efficiency and provide intelligent insights for aquaculture management, with a business vision to provide innovative tools for sustainable aquaculture practices and expand market reach in the sector.

## User Preferences
Preferred communication style: Simple, everyday language.

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