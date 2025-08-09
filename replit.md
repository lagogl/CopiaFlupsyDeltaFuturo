# FLUPSY Management System

## Overview
The FLUPSY Management System is a comprehensive web application for managing aquaculture operations, specifically designed for monitoring and controlling FLUPSY (Floating Upwelling System) installations. The system provides real-time tracking of baskets, cycles, operations, and inventory management for shellfish cultivation. Its main purpose is to optimize aquaculture processes, provide growth forecasting, mortality tracking, and integrate with external systems for seamless data flow.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Performance Optimizations - Successfully Completed

### Average Weight Calculation Precision Fix
- **Issue**: Cesta 20 showing "0g" in P.Medio(g) column instead of correct average weight (0.002g)
- **Root Cause**: Rounding precision issue in weight calculation (0.002g rounded to 0g with 2-decimal precision)
- **Solution**: Improved precision from 2 to 3 decimal places in `Math.round(weight * 1000) / 1000`
- **Result**: All baskets now show correct average weight values, including very small weights like 0.002g

### Debug Logging Performance Cleanup
- **Issue**: Excessive console.log statements impacting page load performance across multiple components
- **Solution**: Comprehensive debug logging cleanup while preserving critical error reporting
- **Components Optimized**:
  - `SpreadsheetOperations.tsx`: Removed detailed basket initialization, performance scoring, and operation processing logs
  - `Baskets.tsx`: Removed verbose FLUPSY filtering, size calculation, and basket processing debug logs
- **Result**: Significantly improved page load performance and reduced browser console noise

### Thousand Separators Implementation
- **Issue**: User requested thousand separators for numeric columns (Animali, Peso Tot(g), Anim/kg) in SpreadsheetOperations
- **Solution**: Added `formatNumberWithSeparators()` utility function using Italian locale formatting (`.toLocaleString('it-IT')`)
- **Implementation**: Conditional rendering for display-only fields showing formatted numbers while preserving editable input fields
- **Result**: Enhanced readability for large numbers while maintaining functionality

### Date-based Growth Predictions with Correct SGR Calculation
- **Issue**: Growth predictions were incorrect due to SGR calculation error and wrong size threshold reference
- **Root Cause**: SGR values in database were already daily percentages, but code was dividing by 30 treating them as monthly
- **Solution**: Fixed SGR calculation and corrected size threshold logic
- **Implementation**: 
  - Changed `targetWeeks` state to `targetDate` with date picker interface
  - Fixed SGR calculation: removed division by 30 since database values are already daily percentages
  - Corrected logic to use `targetSize.maxAnimalsPerKg` instead of `minAnimalsPerKg` as growth target threshold
  - Updated calculation: animals must drop BELOW max threshold to reach target size
  - Added detailed debug logging for growth prediction verification
- **Result**: Accurate growth predictions showing realistic timeframes (e.g., Cesta #20 reaches TP-2800 in 10 days with 8.3% daily SGR)

### AI-Enhanced Performance Scoring with Predictive Trend Analysis
- **Feature**: Implemented intelligent trend analysis using AI to enhance performance scoring algorithm
- **Innovation**: Added predictive trend multiplier that analyzes historical data patterns to adjust performance scores
- **Algorithm Enhancement**:
  - **Mortality Trend Analysis**: Detects patterns in mortality rates across last 3 operations with severe penalties for increasing trends
  - **Population Trend Monitoring**: Identifies significant population losses (>15% = penalty, >30% = severe penalty)
  - **Weight Growth Patterns**: Rewards consistent weight gain trends and penalizes weight loss
  - **Operation Frequency Analysis**: Considers management activity level (more frequent operations = better score)
- **Scoring Multipliers**:
  - Trend in miglioramento: +8% to +15% bonus
  - Trend stabile: neutral (1.0x)
  - Trend in peggioramento: -15% penalty
  - Trend critico: -25% penalty
- **Smart Tooltips Integration**: All ceste show detailed trend analysis in tooltips (critical ceste get enhanced analysis with specific recommendations)
- **Result**: More accurate performance scoring that considers trajectory, not just current state, helping operators anticipate problems before they become critical

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
- **Performance Optimization**: Debug logging cleanup in SpreadsheetOperations and Baskets modules to improve page load speed.
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