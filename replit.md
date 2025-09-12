# Overview

FleetPro is a comprehensive vehicle fleet management ERP system built as a full-stack web application. The system manages vehicle owners, vehicles, projects, assignments, and payments in a single integrated platform. It provides dashboards, CRUD operations for all entities, and tracks financial aspects of fleet operations including rental payments and project assignments.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **Routing**: Wouter for client-side routing (lightweight alternative to React Router)
- **State Management**: TanStack Query (React Query) for server state management
- **Forms**: React Hook Form with Zod schema validation
- **Layout**: Responsive design with collapsible sidebar navigation

## Backend Architecture
- **Runtime**: Node.js with Express.js web framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful API with JSON responses
- **Request Handling**: Express middleware for JSON parsing, URL encoding, and request logging
- **Error Handling**: Centralized error handling middleware with proper HTTP status codes

## Data Storage Solutions
- **Database**: PostgreSQL using Neon serverless database
- **ORM**: Drizzle ORM with connection pooling via Neon serverless pool
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Validation**: Zod schemas for runtime type validation and form validation

## Database Schema Design
- **Entities**: Owners, Vehicles, Projects, Assignments, Payments
- **Relationships**: 
  - Vehicles belong to Owners (many-to-one)
  - Assignments link Vehicles to Projects (many-to-many through assignment)
  - Payments track Assignment billing (one-to-many)
- **Status Tracking**: Enum-style status fields for lifecycle management
- **Audit Fields**: Created timestamps on all entities

## Development Environment
- **Build System**: Vite for fast development and optimized production builds
- **Code Quality**: TypeScript strict mode with comprehensive type checking
- **Development Server**: Express server with Vite middleware integration for HMR
- **Asset Management**: Static file serving and path resolution

## Project Structure
- **Monorepo Design**: Shared schema and types between client and server
- **Client Directory**: React frontend application
- **Server Directory**: Express backend API
- **Shared Directory**: Common TypeScript types and database schemas

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL database hosting
- **Connection Pooling**: Neon serverless pool for efficient database connections

## UI and Styling Libraries
- **Radix UI**: Headless UI components for accessibility and behavior
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library for consistent iconography
- **Class Variance Authority**: Type-safe CSS class composition

## Development and Build Tools
- **Vite**: Development server and build tool
- **esbuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind CSS integration

## Form and Validation
- **React Hook Form**: Performant form library with minimal re-renders
- **Zod**: TypeScript-first schema validation
- **Hookform Resolvers**: Integration between React Hook Form and Zod

## Data Fetching and State
- **TanStack Query**: Server state management with caching and synchronization
- **Wouter**: Lightweight client-side routing

## Development Environment (Replit)
- **Replit Plugins**: Development tooling including error overlay, cartographer, and dev banner
- **WebSocket Support**: For Neon database real-time connections using ws library