# API Contracts

## Overview

Uvento uses **Next.js Server Actions** as the primary data mutation layer, and **API Routes** for authentication endpoints. All inputs are validated with Zod schemas.

---

## Authentication

### POST `/api/auth/[...nextauth]`

NextAuth v5 handles all auth endpoints automatically:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/signin` | GET/POST | Sign-in page and handler |
| `/api/auth/signout` | POST | Sign out and clear session |
| `/api/auth/session` | GET | Get current session |
| `/api/auth/csrf` | GET | Get CSRF token |

---

## Server Actions

### `register(formData: FormData)`

**File:** `src/actions/auth.ts`

Create a new user account and sign in.

**Input:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | yes | min 2 characters |
| `email` | string | yes | valid email format |
| `password` | string | yes | min 6 characters |
| `confirmPassword` | string | yes | must match password |

**Response:**
| Outcome | Return |
|---------|--------|
| Success | Redirect to `/` |
| Email taken | `{ error: "Пользователь с таким email уже существует" }` |
| Validation fail | `{ error: "<validation message>" }` |
| Auth error | `{ error: "Ошибка при входе после регистрации" }` |

---

### `login(formData: FormData)`

**File:** `src/actions/auth.ts`

Authenticate an existing user.

**Input:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | string | yes | valid email format |
| `password` | string | yes | min 6 characters |

**Response:**
| Outcome | Return |
|---------|--------|
| Success | Redirect to `/` |
| Invalid credentials | `{ error: "Неверный email или пароль" }` |
| Validation fail | `{ error: "<validation message>" }` |

---

### `signOutAction()`

**File:** `src/actions/signout.ts`

Sign out the current user.

**Input:** none

**Response:** Redirect to `/`

---

## Planned API Contracts

The following endpoints will be implemented as Server Actions:

### Events

| Action | Input | Output | Auth |
|--------|-------|--------|------|
| `createEvent(formData)` | title, description, location, startDate, endDate, capacity, price, coverImage | `{ event }` or `{ error }` | ORGANIZER |
| `updateEvent(eventId, formData)` | same as create | `{ event }` or `{ error }` | ORGANIZER (own org) |
| `publishEvent(eventId)` | eventId | `{ success }` or `{ error }` | ORGANIZER (own org) |
| `cancelEvent(eventId)` | eventId | `{ success }` or `{ error }` | ORGANIZER (own org) |
| `deleteEvent(eventId)` | eventId | `{ success }` or `{ error }` | ORGANIZER (own org) |

### Registrations

| Action | Input | Output | Auth |
|--------|-------|--------|------|
| `registerForEvent(eventId)` | eventId | `{ registration, ticketCode }` or `{ error }` | STUDENT+ |
| `cancelRegistration(registrationId)` | registrationId | `{ success }` or `{ error }` | STUDENT (own) |
| `checkIn(ticketCode)` | ticketCode | `{ registration, user }` or `{ error }` | ORGANIZER |

### Payments

| Action | Input | Output | Auth |
|--------|-------|--------|------|
| `confirmPayment(registrationId)` | registrationId, method | `{ payment }` or `{ error }` | ORGANIZER |
| `refundPayment(paymentId)` | paymentId | `{ payment }` or `{ error }` | ORGANIZER |

### Users (Admin)

| Action | Input | Output | Auth |
|--------|-------|--------|------|
| `updateUserRole(userId, role)` | userId, role | `{ user }` or `{ error }` | ADMIN |
| `getUsers(filters)` | search, role, page | `{ users, total }` | ADMIN |

---

## Error Response Format

All server actions return errors in a consistent format:

```typescript
type ActionResult =
  | { error: string }       // failure
  | { success: true }       // success (no data)
  | { data: T }             // success with data
  | void                    // success with redirect
```

## HTTP Status Codes (API Routes)

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Validation error |
| 401 | Not authenticated |
| 403 | Not authorized (wrong role) |
| 404 | Resource not found |
| 409 | Conflict (e.g. duplicate registration) |
| 500 | Internal server error |
