# Uvento — Technical Documentation

## Project Overview

Uvento is a university event management platform that allows organizations to create events, sell tickets, and track attendance via QR codes. Students can browse events, register, and receive digital tickets.

## Documents

| Document | WBS | Description |
|----------|-----|-------------|
| [Architecture](architecture.md) | 4.3 | System architecture, tech stack, component diagram, data flows |
| [Database ERD](database-erd.md) | 4.4 | Entity-relationship diagram, enums, indexes, constraints |
| [API Contracts](api-contracts.md) | 4.5 | Endpoint definitions, inputs, outputs, error format |
| [Git Workflow](git-workflow.md) | 4.2 | Branching strategy, commit conventions, PR rules |
| [Payment & QR Research](research-payments-qr.md) | 4.1 | QR-code solution, payment providers comparison, phased plan |

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Fill in Supabase credentials (see .env.example)

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed database (optional)
npm run db:seed

# Start development server
npm run dev
```

## WBS Progress

| WBS | Task | Status |
|-----|------|--------|
| 4.1 | Initialize Git repository | Done |
| 4.2 | Define Git workflow | Done |
| 4.3 | Define system architecture | Done |
| 4.4 | Design database | Done |
| 4.5 | Define API contracts | Done |
| 4.6 | Configure development environment | Done |
| 4.7 | Configure authentication | Done |
| 4.8 | Implement user roles | In Progress |
| 4.9 | Prepare deployment environment | To Do |
| 4.10 | Prepare technical documentation | Done |
