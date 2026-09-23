# Uvento

University event management platform. Organizers create events, students register and receive QR-coded tickets for attendance tracking.

## Tech Stack

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4
- **Backend:** Next.js Server Actions, API Routes
- **Database:** PostgreSQL (Supabase)
- **ORM:** Prisma 6
- **Auth:** NextAuth v5 (credentials, JWT sessions)
- **QR:** qrcode (generation), html5-qrcode (scanning — planned)
- **Validation:** Zod 4, React Hook Form

## What's Done

- User authentication (register, login, sign out)
- Role-based access control (Student, Organizer, Admin)
- Route protection via middleware (`/admin`, `/dashboard`, `/my`)
- Database schema: users, organizations, events, registrations, payments, categories
- Supabase integration (PostgreSQL + Storage)

## What's Planned

- Event creation and management (CRUD, publish/cancel)
- Event registration with capacity check
- QR ticket generation and one-time check-in
- Payment integration (Freedom Pay, Halyk epay — phased)
- Organizer dashboard (registrations, revenue, check-in)
- Promotions (3+1, 5+1 rules)
- Blacklists
- Table/seating assignment
- Email notifications (Resend)

## Getting Started

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

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Documentation

See [docs/](docs/) for architecture, ERD, API contracts, git workflow, and payment/QR research.
