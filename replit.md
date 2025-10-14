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
- **Business Logic**: Inventory Management, Growth Forecasting (SGR calculations), Mortality Tracking, External Data Synchronization, Quality Control, Advanced Sales with DDT Generation.
- **AI Integration**: Hybrid system integrating DeepSeek-V3 for predictive growth analysis, anomaly detection, sustainability analysis, business analytics, and AI-enhanced performance scoring.
- **DDT System**: Generates transport documents for advanced sales with three-state tracking, immutable customer data snapshots, traceability, subtotals by size, and integration with Fatture in Cloud API. Includes sale reversal functionality.
- **Dynamic Logo System**: Automated company logo integration in all PDF reports based on Fatture in Cloud Company ID.
- **Spreadsheet Operations Module**: Mobile-first, editable cell interface for rapid data entry, real-time validation, auto-save, batch operations, dynamic size calculation, intelligent performance-based sorting, and visual performance indicators.
- **Operation Workflow**: Validated user operations are processed server-side, trigger WebSocket notifications, and update inventory calculations.
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