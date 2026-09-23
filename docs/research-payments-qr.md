# Research: Payment & QR-Code Integration Options

## 1. QR-Code Integration

### Chosen Solution: `qrcode` (npm)

The `qrcode` library was selected for ticket QR code generation. It is the most popular Node.js QR library with 1M+ weekly downloads, zero native dependencies, and supports both server-side (PNG/SVG buffer) and client-side (canvas/data URL) rendering.

### How It Works

```
Registration confirmed → ticketCode (unique cuid) → QR encode → Display to student
```

Each `Registration` record has a unique `ticketCode` field. The QR code encodes this code. At the event, the organizer scans the QR with a phone camera, the system looks up the `ticketCode`, verifies it hasn't been used, and marks the registration as `CHECKED_IN`.

### QR Verification Flow

| Step | Action | Result |
|------|--------|--------|
| 1 | Organizer opens check-in page on phone | Camera activates |
| 2 | Scans attendee's QR code | `ticketCode` extracted |
| 3 | System queries `Registration` by `ticketCode` | Record found or not |
| 4a | Valid + not used | Set `checkedInAt`, status → `CHECKED_IN` |
| 4b | Already used | Reject — show when it was used |
| 4c | Not found | Reject — invalid ticket |

### Security Considerations

- `ticketCode` is a `cuid()` — random, non-sequential, not guessable
- One-time use enforced at database level (`checkedInAt` is set only once)
- Unique constraint on `ticketCode` prevents duplicates
- QR scanning requires ORGANIZER role (route-protected)

### Alternatives Considered

| Library | Pros | Cons | Decision |
|---------|------|------|----------|
| **qrcode** | Lightweight, works in Node + browser, PNG/SVG output | — | **Selected** |
| qrcode-generator | Smaller bundle | Less features, fewer formats | Not needed |
| @zxing/library | Full barcode/QR scanner + generator | Heavy (200KB+), overkill for generation only | Not needed for generation; may use for camera scanning |

For QR **scanning** on the organizer's device, two approaches:
1. **html5-qrcode** — browser-based camera scanning, no app install needed
2. **Native camera** — phone camera reads QR as URL, opens check-in page with ticketCode in URL

Recommendation: **html5-qrcode** for the check-in page — works cross-platform, no app needed.

---

## 2. Payment Integration Options

### Context

Uvento targets university students in Kazakhstan. The payment system must support:
- Small amounts (1,000–10,000 KZT typical event price)
- Mobile-first payments (students use phones)
- Low or no integration cost for MVP

### Options Comparison

| Option | Integration Effort | Fees | Popularity (KZ) | API Access | MVP Suitable |
|--------|-------------------|------|------------------|------------|--------------|
| **Manual Confirmation** | None | None | — | — | **Yes** |
| **Kaspi QR / Kaspi Pay** | High | ~1-2% | Very High | Closed (requires contract as ИП/ТОО) | No |
| **Halyk epay** | Medium | ~2-3% | High | Open API, test sandbox available | Possible |
| **CloudPayments** | Medium | ~2.5-3.5% | Medium | REST API, works with KZ cards | Possible |
| **Stripe** | Low | 2.9% + 30¢ | Low | Excellent API + docs | No (limited KZ support) |
| **Freedom Pay** | Medium | ~2% | Growing | API available | Possible |

### Option Details

#### Manual Confirmation (Recommended for MVP)

The organizer shares payment details (Kaspi transfer number or bank account). The student sends money directly. The organizer manually marks the registration as `CONFIRMED` in the dashboard.

**Pros:**
- Zero integration cost and time
- No legal entity required (ИП/ТОО)
- Works immediately
- Students already familiar with Kaspi transfers

**Cons:**
- Manual work for organizer
- No automatic confirmation
- Doesn't scale beyond ~50 registrations per event

**Implementation:** Add a "Confirm Payment" button to the organizer dashboard. When clicked, set `Payment.status = COMPLETED` and `Registration.status = CONFIRMED`.

---

#### Kaspi QR / Kaspi Pay

The most popular payment method in Kazakhstan. ~90% of mobile payments go through Kaspi.

**Pros:**
- Every student has Kaspi
- Instant payments
- QR-based — aligns with our QR ticket system

**Cons:**
- API requires a legal entity (ИП or ТОО) and a contract with Kaspi
- Integration documentation is not public
- Approval process takes 2-4 weeks

**When to integrate:** After MVP validation, when the platform has real users and the team has a legal entity.

---

#### Halyk epay

Halyk Bank's online payment gateway. Supports Visa/Mastercard from any KZ bank.

**Integration approach:** OAuth2 + client-side widget
1. Backend получает OAuth-токен (`POST /oauth2/token` с `client_credentials`)
2. Frontend загружает JS SDK (`payment-api.js`) и вызывает `halyk.pay()`
3. Оплата происходит прямо на странице (без редиректа)
4. Server-to-server callback подтверждает оплату через `secretHash`

**URLs:**
- Test OAuth: `https://test-epay-oauth.epayment.kz`
- Prod OAuth: `https://epay-oauth.homebank.kz`
- Test widget: `https://test-epay.epayment.kz/payform/payment-api.js`
- Prod widget: `https://epay.homebank.kz/payform/payment-api.js`

**Env vars:** `HALYK_CLIENT_ID`, `HALYK_CLIENT_SECRET`, `HALYK_TERMINAL_ID`, `HALYK_TEST_MODE`

**Pros:**
- Open API with test sandbox
- Widget integration — оплата без редиректа (лучший UX)
- Supports Visa/Mastercard from any KZ bank

**Cons:**
- Requires legal entity for production
- Not as widely used as Kaspi among students
- Higher friction (card details vs. one-tap Kaspi)
- No built-in refund flow in widget

---

#### Freedom Pay

Payment gateway with growing presence in Kazakhstan. Server-side redirect model.

**Integration approach:** Server-side init + redirect
1. Backend вызывает `POST api.freedompay.kz/init_payment.php` с подписанными параметрами
2. Получает `redirect_url` → перенаправляет пользователя на страницу FreedomPay
3. Пользователь оплачивает на hosted page FreedomPay
4. Server-to-server callback (`result`) подтверждает оплату
5. Backend отвечает подписанным XML

**Signature:** MD5-подпись на каждый запрос/ответ (`pg_sig`). Алгоритм: script name + sorted params + secret key → MD5.

**Key endpoints:**
- `init_payment.php` — инициализация платежа
- `get_status3.php` — проверка статуса
- `revoke.php` — полный или частичный рефанд

**Env vars:** `FREEDOMPAY_MERCHANT_ID`, `FREEDOMPAY_SECRET_KEY`, `FREEDOMPAY_TEST_MODE`

**Pros:**
- API available with documentation
- Full payment lifecycle: init → pay → check → refund
- Partial refunds supported
- Status polling endpoint for recovery of stuck payments

**Cons:**
- Redirect-based (user leaves the page)
- MD5 signing adds complexity
- Requires legal entity for production
- Needs rate limiting (~1.5s between requests)

---

### Provider Comparison for Uvento

| Aspect | Halyk epay | Freedom Pay |
|--------|-----------|-------------|
| **UX** | Widget on page (better) | Redirect to external page |
| **Integration complexity** | Medium | Medium |
| **Refunds** | Manual/custom | Built-in API (full + partial) |
| **Status recovery** | Manual | `get_status3.php` + cron sync |
| **Signing** | OAuth2 token + secretHash | MD5 signature on every request |
| **Legal entity required** | Yes | Yes |
| **Test sandbox** | Yes | Yes |

---

### Recommendation

```
Phase 1 (MVP):       Manual confirmation via dashboard
Phase 2 (Launch):    Freedom Pay (full lifecycle: pay → check → refund → status sync)
Phase 3 (Growth):    Add Halyk epay as second option (better UX with widget)
Phase 4 (Scale):     Kaspi QR (requires separate contract)
```

This phased approach allows the team to:
1. Launch quickly with zero payment integration overhead
2. Add automated payments with FreedomPay (most complete API, refunds included)
3. Improve UX with Halyk widget (in-page payment without redirect)
4. Maximize reach with Kaspi (most popular, but hardest to integrate)

### Integration Plan for Phase 2 (Freedom Pay)

| Component | Description |
|-----------|-------------|
| `src/lib/freedompay/client.ts` | API client: init, getStatus, revoke |
| `src/lib/freedompay/signature.ts` | MD5 signing and verification |
| `src/app/api/payments/freedompay/init/route.ts` | Init payment, create record, return redirect URL |
| `src/app/api/payments/freedompay/result/route.ts` | Server callback, verify signature, confirm payment |
| `src/app/api/payments/freedompay/check/route.ts` | Pre-payment validation (optional) |
| Cron / scheduled task | Sync stuck PROCESSING payments via `get_status3.php` |

### Database Support

The current schema already supports all phases:
- `Payment.method` — stores payment method (`"manual"`, `"freedompay"`, `"halyk"`, `"kaspi"`)
- `Payment.externalId` — stores external transaction ID from payment provider
- `Payment.status` — tracks payment lifecycle (`PENDING` → `COMPLETED` / `FAILED` / `REFUNDED`)
- `Payment.paidAt` — timestamp of successful payment

No schema changes needed when adding new payment providers.
