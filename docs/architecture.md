# System Architecture

## Overview

Uvento is a university event management platform built with a modern full-stack architecture. The system enables organizers to create and manage events, while students can browse, register, and receive QR-coded tickets for attendance tracking.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 |
| Backend | Next.js Server Actions, API Routes |
| Database | PostgreSQL (Supabase) |
| ORM | Prisma 6 |
| Authentication | NextAuth v5 (Auth.js) |
| File Storage | Supabase Storage |
| QR Generation | qrcode (npm) |
| QR Scanning | html5-qrcode |
| Payments | Freedom Pay, Halyk epay (phased) |
| Email | Resend |
| Validation | Zod 4 |
| Forms | React Hook Form |
| Deployment | Vercel (planned) |

## Architecture Diagram

```mermaid
graph TB
    subgraph Client["Client (Browser)"]
        UI[React UI]
        Forms[React Hook Form + Zod]
        QRScan[html5-qrcode Scanner]
    end

    subgraph NextJS["Next.js 16 Application"]
        Pages[Pages & Layouts]
        SA[Server Actions]
        API[API Routes]
        MW[Middleware]
        Auth[NextAuth v5]
    end

    subgraph External["External Services"]
        Supabase[(Supabase PostgreSQL)]
        Storage[Supabase Storage]
        QR[QR Code Generator]
        Resend[Resend Email]
    end

    subgraph Payments["Payment Providers"]
        FreedomPay[Freedom Pay API]
        HalykPay[Halyk epay Widget]
    end

    UI --> Pages
    Forms --> SA
    UI --> API
    QRScan -->|ticketCode| SA
    MW -->|Route Protection| Pages
    MW -->|Role Check| Auth

    SA -->|Prisma ORM| Supabase
    API -->|Prisma ORM| Supabase
    Auth -->|JWT Sessions| Supabase
    SA -->|File Upload| Storage
    SA -->|Ticket Generation| QR
    SA -->|Notifications| Resend
    API -->|Init + Callback| FreedomPay
    API -->|OAuth + Callback| HalykPay
```

## Component Architecture

```mermaid
graph LR
    subgraph Public["Public Routes"]
        Home["/  — Event Listing"]
        EventPage["/events/:slug  — Event Details"]
        Login["/login"]
        Register["/register"]
    end

    subgraph Student["Student Routes (/my)"]
        MyTickets["/my/tickets"]
        MyEvents["/my/events"]
    end

    subgraph Organizer["Organizer Routes (/dashboard)"]
        Dashboard["/dashboard"]
        ManageEvents["/dashboard/events"]
        Registrations["/dashboard/registrations"]
        CheckIn["/dashboard/check-in"]
    end

    subgraph Admin["Admin Routes (/admin)"]
        AdminPanel["/admin"]
        UserMgmt["/admin/users"]
        OrgMgmt["/admin/organizations"]
    end
```

## Authentication & Authorization

The system uses role-based access control (RBAC) with three roles:

| Role | Access |
|------|--------|
| **STUDENT** | Browse events, register, view own tickets |
| **ORGANIZER** | All student permissions + create/manage events, view registrations, check-in attendees |
| **ADMIN** | Full system access, user management, organization management |

Route protection is handled via Next.js middleware:
- `/admin/*` — ADMIN only
- `/dashboard/*` — ORGANIZER and ADMIN
- `/my/*` — any authenticated user
- Public routes — no auth required

## Data Flow: Event Registration

```mermaid
sequenceDiagram
    actor S as Student
    participant UI as Frontend
    participant SA as Server Action
    participant DB as PostgreSQL
    participant QR as QR Generator

    S->>UI: Click "Register"
    UI->>SA: registerForEvent(eventId)
    SA->>DB: Check capacity & blacklist
    SA->>DB: Create Registration (PENDING)
    SA->>DB: Create Payment record
    alt Free Event
        SA->>DB: Confirm Registration
        SA->>QR: Generate QR (ticketCode)
        QR-->>SA: QR image
        SA-->>UI: Ticket with QR
    else Paid Event (Freedom Pay)
        SA->>DB: Payment status → PROCESSING
        SA-->>UI: Redirect to Freedom Pay hosted page
        Note over S,UI: Student pays on Freedom Pay
        UI-->>SA: Server callback (pg_result=1)
        SA->>DB: Payment → COMPLETED
        SA->>DB: Registration → CONFIRMED
        SA->>QR: Generate QR (ticketCode)
        SA-->>UI: Ticket with QR
    else Paid Event (Halyk epay)
        SA-->>UI: OAuth token + widget config
        Note over S,UI: Student pays via in-page widget
        UI-->>SA: Server callback (secretHash verified)
        SA->>DB: Payment → COMPLETED
        SA->>DB: Registration → CONFIRMED
        SA->>QR: Generate QR (ticketCode)
        SA-->>UI: Ticket with QR
    end
    UI-->>S: Show ticket
```

## Data Flow: Check-In

```mermaid
sequenceDiagram
    actor O as Organizer
    participant UI as Check-In Page
    participant SA as Server Action
    participant DB as PostgreSQL

    O->>UI: Scan QR code
    UI->>SA: verifyTicket(ticketCode)
    SA->>DB: Find Registration by ticketCode
    alt Valid & Not Used
        SA->>DB: Set checkedInAt = now()
        SA->>DB: Status → CHECKED_IN
        SA-->>UI: ✓ Valid ticket
    else Already Used
        SA-->>UI: ✗ Already checked in
    else Not Found
        SA-->>UI: ✗ Invalid ticket
    end
    UI-->>O: Show result
```

## Data Flow: Payment Refund

```mermaid
sequenceDiagram
    actor O as Organizer
    participant UI as Dashboard
    participant SA as Server Action
    participant PG as Payment Gateway
    participant DB as PostgreSQL

    O->>UI: Click "Refund"
    UI->>SA: refundPayment(paymentId)
    SA->>PG: Revoke request (full or partial)
    PG-->>SA: Refund confirmed
    SA->>DB: Payment → REFUNDED
    SA->>DB: Registration → CANCELLED
    SA-->>UI: Refund success
```

## Deployment Architecture

```mermaid
graph LR
    subgraph Vercel["Vercel"]
        App[Next.js App]
        Edge[Edge Middleware]
        Serverless[Serverless Functions]
    end

    subgraph Supabase["Supabase Cloud"]
        PG[(PostgreSQL)]
        ST[Storage CDN]
        RT[Realtime]
    end

    User[Browser] --> Edge
    Edge --> App
    App --> Serverless
    Serverless --> PG
    Serverless --> ST
```

**Deployment plan:**
- **Frontend + Backend**: Vercel (automatic deploys from `main` branch)
- **Database**: Supabase PostgreSQL (managed, auto-backups)
- **File Storage**: Supabase Storage (event covers, avatars)
- **Domain**: Custom domain via Vercel

## Planned Features (Stakeholder Requirements)

Features mapped to implementation phases:

### Phase 1 — MVP (Current)
| Feature | Status | Description |
|---------|--------|-------------|
| Role-based access (RBAC) | Done | STUDENT, ORGANIZER, ADMIN roles with middleware protection |
| Authentication | Done | Email/password via NextAuth v5 with JWT sessions |
| Event CRUD | In Progress | Create, edit, publish, cancel events |
| Registration & Tickets | In Progress | Register for events, unique QR ticket per registration |
| QR Check-In | Planned | Scan QR at event entrance, one-time use verification |
| Manual payment confirmation | Planned | Organizer confirms payment in dashboard |

### Phase 2 — Launch
| Feature | Description |
|---------|-------------|
| Automated payments | Freedom Pay integration (init → pay → callback → refund) |
| Automatic guest counting | Real-time count of purchased tickets, registered and checked-in guests |
| Total revenue calculation | Auto-calculate ticket revenue, discounts, and final profit per event |
| Email notifications | Registration confirmation, ticket delivery, event reminders via Resend |

### Phase 3 — Growth
| Feature | Description |
|---------|-------------|
| Halyk epay | Second payment option with in-page widget (better UX) |
| Promotions (3+1, 5+1) | Organizers create promotional rules; system auto-applies discounts |
| Blacklists | Organizers manage blacklist per organization; system checks on registration |
| Table assignment & seating | Assign tickets to tables, display seating information for guests |
