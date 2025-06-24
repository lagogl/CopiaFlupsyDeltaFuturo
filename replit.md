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

## Changelog

- June 24, 2025: Fixed app startup issues and restored stability
- June 24, 2025: Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.