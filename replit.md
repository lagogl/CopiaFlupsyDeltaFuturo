# FLUPSY Management System

## Overview
The FLUPSY Management System is a comprehensive web application for managing aquaculture operations, specifically designed for monitoring and controlling FLUPSY (Floating Upwelling System) installations. The system provides real-time tracking of baskets, cycles, operations, and inventory management for shellfish cultivation. Its main purpose is to optimize aquaculture processes, provide growth forecasting, mortality tracking, and integrate with external systems for seamless data flow.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state management
- **Build Tool**: Vite
- **UI Components**: Radix UI primitives with custom shadcn/ui components, designed for a compact, professional, and mobile-first spreadsheet-like interface. Visual enhancements include color-coded basket performance indicators and consistent styling.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL
- **API Architecture**: RESTful API with external API integration
- **Real-time Communication**: WebSocket implementation for live updates

### Database Architecture
- **Primary Database**: PostgreSQL 16
- **ORM**: Drizzle ORM with type-safe queries
- **Schema Management**: Drizzle Kit for migrations
- **External Integration**: Separate external database connection for data synchronization

### Key Components
- **Core Entities**: FLUPSY Systems, Baskets, Cycles, Operations (cleaning, screening, weighing), Lots, Selections/Screenings.
- **Business Logic**: Inventory Management, Growth Forecasting (SGR calculations), Mortality Tracking, External Data Synchronization, Quality Control.
- **Integration Components**: External API, Data Import/Export (JSON), WebSocket Server, Database Consistency Manager.

### System Design Choices
- **Data Flow**: User input processed via React components, TanStack Query, Express API, and Drizzle ORM to PostgreSQL. Real-time updates via WebSocket. External data synchronized via API.
- **Operation Workflow**: User-created operations are validated, processed server-side, trigger WebSocket notifications, and update inventory calculations.
- **External Integration Flow**: Standardized JSON data exchange via API key authentication, with synchronization processes for data consistency and conflict resolution.
- **Spreadsheet Operations Module**: Independent module with a mobile-first, editable cell interface for rapid data entry, real-time validation, auto-save, and batch operations. It includes dynamic size calculation, intelligent performance-based sorting of baskets, and visual performance indicators.
- **Data Precision**: Improved precision for average weight calculations (3 decimal places).
- **Manual Editing**: Enhanced functionality for manual input of mortality percentage and animals per kg, disabling automatic calculations when manual mode is active.
- **Deployment Strategy**: Node.js 20 on Replit with PostgreSQL 16 for development; Vite/esbuild for production build with autoscale deployment.

## External Dependencies

### Core Dependencies
- `@tanstack/react-query`
- `drizzle-orm`
- `@neondatabase/serverless`
- `express`
- `pg`
- `ws`

### UI Dependencies
- `@radix-ui/***`
- `tailwindcss`
- `lucide-react`
- `react-hook-form`
- `@hookform/resolvers`

### Development Dependencies
- `typescript`
- `vite`
- `tsx`
- `drizzle-kit`

### Third-party Integrations
- Fatture in Cloud (for client and DDT management, via OAuth2 authentication and API)