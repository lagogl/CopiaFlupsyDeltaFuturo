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
- **Core Entities**: FLUPSY Systems, Baskets, Cycles, Operations (cleaning, screening, weighing), Lots, Selections/Screenings.
- **Business Logic**: Inventory Management, Growth Forecasting (SGR calculations), Mortality Tracking, External Data Synchronization, Quality Control.
- **AI Integration**: Hybrid system integrating DeepSeek-V3 for predictive growth analysis, anomaly detection, sustainability analysis, and business analytics. Includes an autonomous fallback system and provides FLUPSY-level insights with basket breakdown, featuring AI-enhanced performance scoring with predictive trend analysis.

### System Design Choices
- **Data Flow**: User input flows from React components to PostgreSQL via TanStack Query, Express API, and Drizzle ORM. Real-time updates occur via WebSocket. External data is synchronized via API.
- **Operation Workflow**: Validated user operations are processed server-side, trigger WebSocket notifications, and update inventory calculations.
- **External Integration Flow**: Standardized JSON data exchange with API key authentication, including processes for data consistency and conflict resolution.
- **Spreadsheet Operations Module**: Independent module featuring a mobile-first, editable cell interface for rapid data entry, real-time validation, auto-save, batch operations, dynamic size calculation, intelligent performance-based sorting of baskets, and visual performance indicators.
- **Manual Editing**: Enhanced functionality for manual input of mortality percentage and animals per kg, with automatic calculations disabled when manual mode is active.
- **PWA Implementation**: Full Progressive Web App configuration enabling smartphone installation while maintaining desktop compatibility, including service worker for offline capabilities and web manifest.
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