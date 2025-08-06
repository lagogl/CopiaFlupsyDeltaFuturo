# FLUPSY Management System

## Overview

The FLUPSY Management System is a comprehensive web application for managing aquaculture operations, specifically designed for monitoring and controlling FLUPSY (Floating Upwelling System) installations. The system provides real-time tracking of baskets, cycles, operations, and inventory management for shellfish cultivation.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state management
- **Build Tool**: Vite for development and production builds
- **UI Components**: Radix UI primitives with custom shadcn/ui components

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

## Key Components

### Core Entities
1. **FLUPSY Systems** - Main floating upwelling installations
2. **Baskets** - Individual cultivation containers with physical positioning
3. **Cycles** - Cultivation periods with start/end dates and states
4. **Operations** - Various management activities (cleaning, screening, weighing, etc.)
5. **Lots** - Batch tracking for shellfish inventory
6. **Selections/Screenings** - Sorting and quality control processes

### Business Logic Components
1. **Inventory Management** - Real-time tracking of animal counts and weights
2. **Growth Forecasting** - SGR (Specific Growth Rate) calculations and predictions
3. **Mortality Tracking** - Automated mortality rate calculations
4. **External Data Synchronization** - Integration with external systems
5. **Quality Control** - Screening and selection processes

### Integration Components
1. **External API** - RESTful endpoints for third-party integration
2. **Data Import/Export** - JSON-based data exchange capabilities
3. **WebSocket Server** - Real-time updates and notifications
4. **Database Consistency Manager** - Automated data integrity checks

## Data Flow

### Primary Data Flow
1. **User Input** → React Components → TanStack Query → Express API → Drizzle ORM → PostgreSQL
2. **Real-time Updates** → WebSocket Server → Client WebSocket → React State Updates
3. **External Data** → External API → Database Synchronization → Internal State Updates

### Operation Workflow
1. User creates operations through the UI
2. Operations are validated and processed server-side
3. Database updates trigger WebSocket notifications
4. All connected clients receive real-time updates
5. Inventory calculations are automatically updated

### External Integration Flow
1. External systems authenticate via API key
2. Data is exchanged through standardized JSON formats
3. Synchronization processes maintain data consistency
4. Automated conflict resolution for data discrepancies

## External Dependencies

### Core Dependencies
- **@tanstack/react-query**: Server state management and caching
- **drizzle-orm**: Type-safe database operations
- **@neondatabase/serverless**: PostgreSQL connection management
- **express**: Web server framework
- **pg**: PostgreSQL client library
- **ws**: WebSocket implementation

### UI Dependencies
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **react-hook-form**: Form management
- **@hookform/resolvers**: Form validation

### Development Dependencies
- **typescript**: Type safety and development tooling
- **vite**: Fast development server and build tool
- **tsx**: TypeScript execution for Node.js
- **drizzle-kit**: Database migration tooling

## Deployment Strategy

### Development Environment
- **Runtime**: Node.js 20 with Replit environment
- **Database**: PostgreSQL 16 with automatic provisioning
- **Ports**: 
  - 5000: Main application server
  - 5001-5003: Additional service ports
- **Hot Reload**: Vite development server with automatic restart

### Production Build
- **Build Process**: Vite frontend build + esbuild backend bundle
- **Deployment Target**: Autoscale deployment on Replit
- **Environment**: Production Node.js with optimized builds
- **Database**: Production PostgreSQL with connection pooling

### Configuration Management
- **Environment Variables**: Database connections and API keys
- **Build Scripts**: Automated build and deployment processes
- **Monitoring**: Built-in health checks and status endpoints

## Recent Changes

✓ Fixed critical database connection issues during startup
✓ Simplified initialization process to prevent failures
✓ Re-enabled performance optimizations and database consistency checks
✓ Restored email scheduler and growth notification systems
✓ Application now runs stable on port 5000 with all features active
✓ All core functionality (baskets, operations, cycles, FLUPSY management) working
✓ WebSocket real-time updates functioning properly
✓ API caching system operational and optimized
✓ Fixed critical duplication bug in screening/selection operations
✓ Added visual enhancement: orange border for baskets containing animals
✓ Applied consistent styling across all FLUPSY visualizers
✓ **July 28, 2025**: Implemented complete Fatture in Cloud integration
✓ Added database tables for clients, DDT, configuration and sync logs
✓ Created backend controller with OAuth2 authentication and API endpoints
✓ Built comprehensive frontend configuration page with real-time sync
✓ Added navigation menu item in System section (admin only)
✓ **July 28, 2025**: Completed Fatture in Cloud integration testing
✓ Fixed OAuth2 redirect path and eliminated popup window behavior
✓ Resolved database schema issues and API parameter ordering
✓ Successfully synchronized 67 clients from Fatture in Cloud
✓ Implemented company data display when saving company ID
✓ All core functionality verified: authentication, client sync, company info display
✓ **August 6, 2025**: Enhanced manual editing functionality in operations
✓ Extended "Modifica manuale" checkbox to include mortality percentage and animals per kg
✓ Fixed decimal input validation for mortality field (now supports values like 2.50%)
✓ Implemented automatic calculation disable when manual mode is active
✓ Added proper number input types with step validation for precision
✓ **August 6, 2025**: Completed manual mode implementation with automatic weight calculation
✓ Fixed server validation to accept manual operations without sample weight requirement
✓ Implemented automatic total weight calculation: number of animals × average weight per animal
✓ Updated form validation logic to enable button correctly for both manual and automatic modes
✓ Set maximum limit for total weight field to 999,999 grams in non-manual mode
✓ **August 6, 2025**: Fixed database consistency issues after operation deletion
✓ Enhanced emergency delete route to properly handle cycle and basket cleanup
✓ Added comprehensive cache invalidation for all related data (operations, baskets, cycles, FLUPSY)
✓ Implemented WebSocket notifications for real-time updates after operation deletion
✓ Fixed dashboard visualization sync issues when operations are deleted
✓ **August 6, 2025**: Fixed numeric input cursor jumping issue in operation forms
✓ Resolved problem where cursor would jump back when entering 5th digit in weight fields
✓ Removed automatic thousands separator formatting during input to prevent cursor issues
✓ Changed weight field validation to accept only integers without decimal points
✓ **August 6, 2025**: Removed QuickWizard Multi-Step interface
✓ User feedback indicated the feature was not satisfactory and requested its removal
✓ Cleaned up menu item, route, and component files for "Inserimento Rapido"
✓ Maintained existing "Operazioni Rapide" as the preferred rapid entry method
✓ **August 6, 2025**: Implemented Spreadsheet Operations module
✓ Created completely independent menu item "Spreadsheet Operazioni" with table-based interface
✓ Mobile-first design with editable cells for rapid data entry like Excel/Google Sheets
✓ Real-time validation, auto-save functionality, and status indicators per row
✓ Supports all operation types (peso, misura, pulizia, trattamento, vagliatura)
✓ Batch operations with overview statistics and error handling per basket

## Changelog

- June 24, 2025: Fixed app startup issues and restored stability
- June 24, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.