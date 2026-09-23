# Database Design (ERD)

## Overview

The database is hosted on Supabase (PostgreSQL) and managed via Prisma ORM. The schema covers users, organizations, events, registrations, payments, and categories.

## Entity-Relationship Diagram

```mermaid
erDiagram
    User {
        string id PK
        string email UK
        string passwordHash
        string name
        UserRole role
        string phone
        string avatarUrl
        datetime emailVerified
        datetime createdAt
        datetime updatedAt
    }

    Organization {
        string id PK
        string name
        string slug UK
        string description
        string logoUrl
        string contactEmail
        datetime createdAt
        datetime updatedAt
    }

    OrganizationMember {
        string id PK
        string userId FK
        string organizationId FK
        string role
        datetime joinedAt
    }

    Event {
        string id PK
        string title
        string slug UK
        string description
        string shortDescription
        string coverImageUrl
        string location
        string venue
        datetime startDate
        datetime endDate
        int capacity
        int price
        EventStatus status
        string organizationId FK
        datetime createdAt
        datetime updatedAt
    }

    Category {
        string id PK
        string name UK
        string slug UK
    }

    EventCategory {
        string eventId PK_FK
        string categoryId PK_FK
    }

    Registration {
        string id PK
        string userId FK
        string eventId FK
        RegistrationStatus status
        string ticketCode UK
        datetime checkedInAt
        datetime createdAt
        datetime updatedAt
    }

    Payment {
        string id PK
        string registrationId FK_UK
        string userId FK
        int amount
        PaymentStatus status
        string method
        string externalId
        datetime paidAt
        datetime createdAt
        datetime updatedAt
    }

    User ||--o{ OrganizationMember : "has memberships"
    Organization ||--o{ OrganizationMember : "has members"
    Organization ||--o{ Event : "hosts"
    User ||--o{ Registration : "registers for"
    Event ||--o{ Registration : "has"
    Registration ||--o| Payment : "has payment"
    User ||--o{ Payment : "makes"
    Event ||--o{ EventCategory : "tagged with"
    Category ||--o{ EventCategory : "applied to"
```

## Enums

### UserRole
| Value | Description |
|-------|-------------|
| `STUDENT` | Default role, can browse and register for events |
| `ORGANIZER` | Can create and manage events via dashboard |
| `ADMIN` | Full system access |

### EventStatus
| Value | Description |
|-------|-------------|
| `DRAFT` | Event created but not visible to students |
| `PUBLISHED` | Event is live and accepting registrations |
| `CANCELLED` | Event cancelled, registrations frozen |
| `COMPLETED` | Event has ended |

### RegistrationStatus
| Value | Description |
|-------|-------------|
| `PENDING` | Awaiting payment or confirmation |
| `CONFIRMED` | Registration confirmed, ticket active |
| `CANCELLED` | Registration cancelled by user or organizer |
| `CHECKED_IN` | Attendee checked in at the event |

### PaymentStatus
| Value | Description |
|-------|-------------|
| `PENDING` | Payment initiated, awaiting completion |
| `COMPLETED` | Payment successful |
| `FAILED` | Payment failed |
| `REFUNDED` | Payment refunded |

## Key Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| `events` | `(status, startDate)` | Efficient filtering of published upcoming events |
| `events` | `(organizationId)` | Quick lookup of events by organization |
| `registrations` | `(eventId, status)` | Fast attendee counts and status filtering |
| `payments` | `(status)` | Payment status reporting |

## Key Constraints

- `User.email` — unique
- `Registration(userId, eventId)` — unique (one registration per user per event)
- `OrganizationMember(userId, organizationId)` — unique
- `Payment.registrationId` — unique (one payment per registration)
- `Registration.ticketCode` — unique (for QR code verification)
- All foreign keys use `CASCADE` on delete
