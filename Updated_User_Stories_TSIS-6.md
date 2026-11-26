# UVENTO TSIS 6 — User Stories & Profit Forecast

**Course:** IT Project Management (PjM 101)
**Group:** 2
**Date:** 7 October 2026

**Team:**

| Name | Role |
|---|---|
| Aigerim Darmesh | Project Manager |
| Aidos Tolendy | Developer |
| Aruzhan Gazhbek | UX/UI |
| Kidraliyeva Aneliya | User Research & QA |

## Table of Contents

1. [Scope Link](#1-scope-link)
2. [Detailed User Stories](#3-detailed-user-stories)
3. [Grooming Notes](#4-grooming-notes)
4. [Profit Forecast Calculation](#5-profit-forecast-calculation)
5. [AI Use Disclosure](#ai-use-disclosure)

---

## 1. Scope Link

Uvento is a web application for university event management. It replaces separate processes such as Telegram promotion, manual registration, offline ticket handling, printed participant lists, and manual entrance checks with one system.

**MVP Delivery Deadline:** 1 December 2026.

### Charter Objectives

| Obj # | Charter Objective |
|---|---|
| 1 | Deliver a working Uvento MVP with all nine Must features, including a mock payment flow, by 1 December 2026. |
| 2 | Test the system with 3 students and 2 event organizers; at least 4 of 5 users should complete their main flow without critical help. |
| 3 | Make sure all nine Must features pass functional testing before the final demo. |
| 4 | Complete course milestones on time; each one-week iteration must have a clear goal and deliverables. |

### The nine Must features for the semester

1. Event Management
2. Student Event Discovery
3. Registration for Event
4. Digital Mock Payment & Mock Transaction Record
5. QR Code Tickets
6. Online Participant List
7. Attendance Tracking
8. Organizer Dashboard
9. Admin Dashboard

### Out of scope

1. Real bank payment integration
2. Seat Selection
3. FAQ
4. Technical Support
5. Cross-University Events

---

## 3. Detailed User Stories

All 11 stories are **Must** items in the current MVP.

| ID | Title | Role |
|---|---|---|
| [US-01](#us-01--create-event-as-draft) | Create Event as Draft | Organizer |
| [US-02](#us-02--edit-event) | Edit Event | Organizer |
| [US-03](#us-03--publish-event) | Publish Event | Organizer |
| [US-04](#us-04--student-event-discovery) | Student Event Discovery | Student |
| [US-05](#us-05--register-for-an-event) | Register for an Event | Student |
| [US-06](#us-06--mock-payment-and-transaction-record) | Mock Payment and Transaction Record | Student |
| [US-07](#us-07--qr-code-ticket) | QR Code Ticket | Student |
| [US-08](#us-08--online-participant-list) | Online Participant List | Organizer |
| [US-09](#us-09--attendance-tracking-by-qr-scan) | Attendance Tracking by QR Scan | Organizer |
| [US-10](#us-10--organizer-dashboard) | Organizer Dashboard | Organizer |
| [US-11](#us-11--admin-dashboard) | Admin Dashboard | Admin |

---

### 3.1 US-01 — Create Event as Draft

> **User Story:** As an organizer, I want to create an event and save it as a draft, so that I can prepare the event before publishing it to students.

| Scenario | Given | When | Then |
|---|---|---|---|
| **Main** | The organizer has permission to create events and the event creation form is open. | I enter valid basic event information and save the event. | The event is saved with Draft status and is not visible to students. |
| **Alternative** | The organizer has permission to create an event, but some information required for publication is incomplete. | I save the event as a draft. | The event is saved as Draft and the incomplete information can be completed later. |
| **Edge** | The organizer enters only the minimum basic information needed to save a draft. | I save the event. | The system saves the Draft without requiring all publication information. |
| **Validation** | The organizer enters an invalid value in a required field. | I try to save the event. | The system shows a validation message and does not save the invalid value. |
| **Negative** | The current user does not have permission to create events. | I try to open the event creation form or save a new event. | Access is denied and no event is created. |
| **Duplicate** | An event with the same relevant identifying information already exists in the organizer's drafts. | I try to create and save another event with the same information. | The system prevents an unintended duplicate or clearly allows the organizer to continue only as a separate event. |
| **Cancel** | The organizer has entered information but decides not to save it. | I leave the creation form without saving. | No new event is created and no Draft record is added. |

**In Scope:** Create a new event; save it as Draft; allow publication-only information to remain incomplete; store event type and event details; keep Draft events hidden from students.

**Out of Scope:** Publishing the event (US-03); student registration (US-05); payment (US-06); QR ticket generation (US-07); Seat Selection; Cross-University Events.

---

### 3.2 US-02 — Edit Event

> **User Story:** As an organizer, I want to edit an event I created, so that its information stays accurate and up to date.

| Scenario | Given | When | Then |
|---|---|---|---|
| **Main** | An existing event created by the organizer is available for editing. | I change valid event information and save the changes. | The updated information is saved and replaces the previous information. |
| **Draft** | A Draft event created by the organizer is available for editing. | I complete or change its information and save it. | The Draft is updated and remains hidden from students. |
| **Published** | A published event created by the organizer is available for editing. | I change permitted event information and save it. | The updated information is saved and the event remains in its current publication status. |
| **Validation** | The organizer enters invalid or incomplete data into a field that must be valid. | I try to save the changes. | The system shows a validation message and the invalid changes are not applied. |
| **Negative** | The event belongs to another organizer. | I try to edit and save the event. | Access is denied and the other organizer's information is not changed. |
| **Cancel** | The organizer has changed information but has not saved it. | I cancel or leave the editing screen. | The previous saved event information remains unchanged. |
| **Concurrent/Edge** | The event has already changed status or information since the organizer opened the edit form. | I try to save the older version of the event. | The system avoids silently overwriting newer valid information and requires the organizer to use the current event data. |

**In Scope:** Edit events created by the organizer; update event details; validate edited information; preserve Draft or Published status unless another defined action changes it.

**Out of Scope:** Publishing an event (US-03); student registration (US-05); payment (US-06); QR ticket generation (US-07); editing another organizer's event; Seat Selection.

---

### 3.3 US-03 — Publish Event

> **User Story:** As an organizer, I want to publish a completed draft event, so that students can see and participate in it.

| Scenario | Given | When | Then |
|---|---|---|---|
| **Main** | A Draft event contains all required information for publication. | I publish the event. | Its status changes to Published and it becomes visible to students. |
| **Incomplete** | A Draft event is missing information required for publication. | I try to publish the event. | Publication is blocked and the system identifies the missing information. |
| **Paid Event** | A Draft is configured as a paid event but its required price or capacity is missing. | I try to publish it. | Publication is blocked until the required paid-event information is completed. |
| **Open Event** | A Draft is configured as an open event that does not require registration or payment. | I publish the event. | The event becomes Published and students can view it without a registration flow. |
| **No Permission** | The current user is not authorized to publish the event. | I try to publish the Draft. | Access is denied and the event remains Draft. |
| **Already Published** | The event is already Published. | I try to publish it again. | The system prevents duplicate publication and keeps one Published event record. |
| **Validation/Edge** | The event contains inconsistent or invalid publication data. | I try to publish it. | The system shows the relevant validation error and does not publish the event. |

**In Scope:** Publish completed Draft events; validate required publication information; make Published events visible to students; support open, free limited-capacity and paid participation types.

**Out of Scope:** Student registration (US-05); payment processing (US-06); QR generation (US-07); editing event information (US-02); real bank payment integration.

---

### 3.4 US-04 — Student Event Discovery

> **User Story:** As a student, I want to browse published upcoming events and see their key details and participation type, so that I can understand how to attend an event.

| Scenario | Given | When | Then |
|---|---|---|---|
| **Main** | Published upcoming events are available. | I open the event discovery page. | I see the available events with their title, date, time, description and participation type. |
| **No Events** | There are no published upcoming events. | I open the event discovery page. | I see an empty-state message explaining that no upcoming events are available. |
| **Open Event** | A published upcoming event is configured as Open. | I open its details. | I see that no registration or payment is required and I can understand how to attend. |
| **Free Limited** | A published upcoming event is free and has limited capacity. | I open its details. | I see that registration is required and the event capacity information is available. |
| **Paid Event** | A published upcoming event is paid and has limited capacity. | I open its details. | I see the ticket price, capacity information and that registration/payment are required. |
| **Draft/Past** | An event is either still a Draft or its date has already passed. | I open the student discovery page. | The event is not shown as an upcoming student event. |
| **Invalid/Unavailable** | A published event is temporarily unavailable or its required display information is invalid. | I try to open it from discovery. | The system does not expose misleading incomplete information and shows an appropriate unavailable/error state. |

**In Scope:** Display published upcoming events; show title, date, time, description and participation type; show relevant capacity and price information.

**Out of Scope:** Creating or editing events (US-01, US-02); registration (US-05); payment (US-06); QR tickets (US-07); Draft events; past events.

---

### 3.5 US-05 — Register for an Event

> **User Story:** As a student, I want to register for a limited-capacity event with available places, so that I can reserve a place to attend.

| Scenario | Given | When | Then |
|---|---|---|---|
| **Main – Free Event** | I am viewing a published free event that requires registration and has at least one available place. | I register for the event. | My registration is confirmed, one place is reserved, and I become eligible to receive a QR ticket. |
| **Main – Paid Event** | I am viewing a published paid event with available capacity. | I register for the event. | A temporary place reservation is created and I can proceed to mock payment. |
| **Full Capacity** | The event has reached its maximum confirmed capacity. | I try to register. | Registration is not created and the system shows that the event is full. |
| **Duplicate** | I already have a confirmed registration for the same event. | I try to register again. | The system prevents a duplicate registration and keeps only one place for me. |
| **Unavailable Event** | The event is a Draft, no longer available for registration, or has already ended. | I try to register. | Registration is rejected and no place is reserved. |
| **Open Event** | The published event is configured as Open and does not require registration. | I try to use the registration action. | The system does not create a registration because participation does not require one. |
| **Capacity Edge** | Only one place remains and another student completes registration before I submit mine. | I try to register. | The system checks current capacity and rejects my registration if no place remains; capacity is not exceeded. |

**In Scope:** Registration for published free or paid events with limited capacity; capacity check; one place per successful registration; immediate confirmation for free limited-capacity events; start of a temporary reservation for paid events.

**Out of Scope:** Open events that need no registration; mock payment processing (US-06); QR ticket generation (US-07); Seat Selection; waiting lists; registration cancellation.

---

### 3.6 US-06 — Mock Payment and Transaction Record

> **User Story:** As a student registered for a paid event, I want to complete a mock payment within the reservation period, so that my registration is confirmed and my payment is recorded.

| Scenario | Given | When | Then |
|---|---|---|---|
| **Main – Paid** | I registered for a paid event and my place is reserved for 10 minutes. | I complete the mock payment within the reservation period. | The payment is recorded and my registration status changes to Confirmed. |
| **Timeout** | I registered for a paid event but have not completed payment. | The 10-minute reservation period expires. | The temporary reservation expires, no successful payment is recorded, and the place becomes available again. |
| **Continue Payment** | My 10-minute reservation is still active. | I reopen the payment step and complete it. | The system accepts the mock payment and confirms my registration. |
| **Expired Reservation** | My temporary reservation has already expired. | I try to submit the mock payment. | The payment is rejected for that reservation and the event place is no longer reserved for me. |
| **Payment Error** | My reservation is active but the mock payment cannot be completed because of invalid payment input or a system error. | I submit the payment. | The system shows an error and the registration remains unconfirmed until a successful payment is completed. |
| **Duplicate Submission** | A successful mock payment has already been recorded for my registration. | I submit the payment again. | The system does not create a second successful transaction for the same registration. |
| **Wrong Registration** | I try to make a payment for a paid event without an active registration/reservation for that event. | I submit the payment. | The payment is rejected and no transaction record is created. |

**In Scope:** Mock payment for paid events; 10-minute temporary place reservation; successful transaction record; registration confirmation after payment; release of capacity after timeout.

**Out of Scope:** Real bank/payment integration; refunds; discounts and promotions; QR ticket generation (US-07); financial reporting and revenue analytics.

---

### 3.7 US-07 — QR Code Ticket

> **User Story:** As a registered student, I want to receive a unique QR ticket once my participation is confirmed, so that I can use it for event entry.

| Scenario | Given | When | Then |
|---|---|---|---|
| **Main – Free** | My registration for a free limited-capacity event is confirmed. | I open my event registration. | A unique QR ticket is available for my registration. |
| **Main – Paid** | My registration for a paid event is confirmed after successful mock payment. | I open my confirmed registration. | A unique QR ticket is created and displayed. |
| **Not Confirmed** | My registration is not confirmed because payment is incomplete or the registration is otherwise pending. | I try to open the ticket. | The system does not provide a valid QR ticket. |
| **Expired/Failed Payment** | My paid-event reservation expired or the payment failed. | I try to access the ticket. | No valid QR ticket is available because participation is not confirmed. |
| **Repeat Access** | I already have a valid QR ticket for a confirmed registration. | I open the ticket again. | The same ticket remains associated with my registration rather than creating an unintended duplicate ticket. |
| **Wrong Event** | The QR ticket belongs to a different event. | The organizer later scans it at another event. | The ticket is rejected for the wrong event and does not create attendance for that event. |
| **Open Event** | The event is Open and does not require registration. | I look for a registration QR ticket. | No registration QR ticket is generated for the open participation flow. |

**In Scope:** Generate a unique QR ticket for confirmed registrations; associate the ticket with the specific event and registration; make the ticket available to the registered student.

**Out of Scope:** QR scanning and attendance recording (US-09); payment processing (US-06); manual ticket creation; QR tickets for open events; duplicate attendance handling.

---

### 3.8 US-08 — Online Participant List

> **User Story:** As an organizer, I want to view the participants of my event with their registration, payment and attendance status, so that I can manage participants from one accurate list.

| Scenario | Given | When | Then |
|---|---|---|---|
| **Main** | The organizer's event has registered participants. | I open the participant list for the event. | I see each participant with registration, payment and attendance status. |
| **Empty** | The event has no confirmed participants. | I open the participant list. | I see an empty-state message and no false participant records. |
| **Free Participant** | A participant is confirmed for a free limited-capacity event. | I open the participant list. | The participant appears as Confirmed and payment is shown as Not Applicable. |
| **Paid Participant** | A participant completed the mock payment for a paid event. | I open or refresh the participant list. | The participant appears with confirmed registration and successful payment status. |
| **Attended Participant** | A confirmed participant has been successfully admitted by QR scan. | I refresh or reopen the participant list. | The participant's attendance status is shown as Attended. |
| **Unauthorized** | The current user is not the organizer of the event and has no permission to view its participant data. | I try to open the participant list. | Access is denied and participant information is not disclosed. |
| **Data Consistency** | A registration or attendance status has just changed. | I refresh the participant list. | The list reflects the latest confirmed registration, payment and attendance state without creating duplicate participants. |

**In Scope:** View participants for the organizer's events; show registration status, payment status where applicable and attendance status; keep the list synchronized with confirmed registrations and QR attendance.

**Out of Scope:** Creating registrations (US-05); payment processing (US-06); QR generation (US-07); attendance scanning (US-09); attendance analytics and reports; participant lists for another organizer's event.

---

### 3.9 US-09 — Attendance Tracking by QR Scan

> **User Story:** As an organizer, I want to scan a participant's QR ticket at the entrance, so that attendance is recorded automatically and entry is faster.

| Scenario | Given | When | Then |
|---|---|---|---|
| **Main** | I have access to the scanning screen for my event and the participant has a valid unused QR ticket for that event. | I scan the QR ticket. | The participant's attendance status changes to Attended in the participant list. |
| **Duplicate Scan** | The participant's QR ticket has already been successfully scanned for this event. | I scan the same QR ticket again. | The system identifies the ticket as already used and does not record attendance a second time. |
| **Wrong Event** | The QR ticket is valid but belongs to a different event. | I scan the ticket at my event. | The system rejects the ticket and does not record attendance for my event. |
| **Invalid QR** | The scanned code is damaged, invalid, or not recognized by the system. | I scan the QR ticket. | The system shows an error and no attendance is recorded. |
| **Not Confirmed** | The participant does not have a confirmed registration for the event. | I scan the participant's QR code. | Entry is rejected and attendance is not recorded. |
| **No Permission** | The current user does not have permission to scan attendance for the event. | I try to open or use the scanner. | Access is denied and no attendance can be recorded. |
| **Scan Edge** | A valid QR scan is received while the participant list is being refreshed. | I scan the ticket and then refresh the list. | The attendance result is stored once and the participant appears as Attended without duplication. |

**In Scope:** QR ticket scanning at the event entrance; validation for the correct event; automatic attendance update; prevention of duplicate attendance records.

**Out of Scope:** QR ticket generation (US-07); manual attendance entry; attendance analytics and reports; offline QR scanning; open events that do not use registration or QR tickets.

---

### 3.10 US-10 — Organizer Dashboard

> **User Story:** As an organizer, I want to see event capacity, registrations, attendance and event status on one dashboard, so that I can quickly monitor and manage my events.

| Scenario | Given | When | Then |
|---|---|---|---|
| **Main** | I have at least one event with defined capacity, registration and attendance data. | I open the organizer dashboard. | I see event capacity, registrations, attendance and event status in one place. |
| **Empty** | I have no created events. | I open the organizer dashboard. | I see an empty-state message instead of incorrect statistics. |
| **Full Event** | One of my events has reached its maximum confirmed capacity. | I open the dashboard. | The event shows the current registration count and zero available places. |
| **Payment Timeout Update** | A paid-event reservation has expired without successful payment. | I refresh the dashboard. | The dashboard reflects the current confirmed registration count and the released place. |
| **Attendance Update** | A participant has just been admitted through QR scanning. | I refresh the dashboard. | The attendance count/status reflects the newly recorded attendance. |
| **Multiple Events** | I manage more than one event with different participation types and statuses. | I open the dashboard. | The dashboard distinguishes my events and shows their current capacity, registration, attendance and status data. |
| **Unauthorized** | I am not the owner/organizer of another organizer's event. | I try to access that event's dashboard data. | Access is denied and private organizer data is not disclosed. |

**In Scope:** Show the organizer's events; display capacity, registrations, attendance and event status; reflect current confirmed registration and attendance data.

**Out of Scope:** Event creation/editing (US-01, US-02); admin user management (US-11); financial reporting; advanced analytics; another organizer's private dashboard data.

---

### 3.11 US-11 — Admin Dashboard

> **User Story:** As an admin, I want to view users, create Organizer accounts, block users, and delete user accounts, so that I can control access to the platform.

| Scenario | Given | When | Then |
|---|---|---|---|
| **Main – View Users** | The admin is authenticated and has permission to manage user accounts. | I open the User Management section. | I can view registered users with their roles and status. |
| **Create Organizer** | I am an authorized admin and the required Organizer information is valid and unique. | I create an Organizer account. | The Organizer account is created with the correct role and can access organizer functionality. |
| **Duplicate Account** | An account already exists with a unique identifier that must be unique. | I try to create another account using the same identifier. | The system shows a duplicate error and does not create a second account. |
| **Block User** | An existing user account is active and the admin has permission to block it. | I block the user. | The user status changes to Blocked and access is prevented according to the platform rules. |
| **Delete/Deactivate User** | A user exists and the admin confirms the deletion action. | I delete or deactivate the user account. | The account is removed or deactivated according to the project policy and is no longer active. |
| **Non-Admin** | The current user is not an authorized admin. | I try to open user management or perform an admin action. | Access is denied and user management data is not disclosed. |
| **Invalid Admin Input** | The admin provides missing or invalid information while creating or changing a user account. | I submit the action. | The system shows validation errors and does not apply the invalid change. |

**In Scope:** View users and roles/status; create Organizer accounts; block users; delete or deactivate user accounts according to the defined policy; restrict all admin functions to authorized admins.

**Out of Scope:** Student event discovery; event creation by organizers; real payment administration; advanced role management; cross-university administration; any admin action not defined in the MVP scope.

---

## 4. Grooming Notes

- **Date:** 07 October 2026
- **Duration:** 25 minutes
- **Attendees:** Aigerim Darmesh (Project Manager), Aidos Tolendy (Developer), Aruzhan Gazhbek (UX/UI), Kidraliyeva Aneliya (User Research & QA)

The team reviewed the stories to confirm that each item was understood, in scope, and small enough before estimation.

| # | Question | Decision |
|---|---|---|
| Q1 | Which information is required for Draft and which information is required before Publish? | A Draft may contain incomplete information. Basic information is enough to save it. All required publishing information must be complete before Publish. Capacity is required for limited-capacity events; ticket price is required for paid events. |
| Q2 | What happens for open, free limited-capacity, and paid events? | Open events need no registration or payment. Free limited-capacity events need registration and issue a QR ticket after registration. Paid events need registration and mock payment before confirmation and QR ticket issue. |
| Q3 | When is a place reserved for a paid event, and what happens if the student does not pay? | A place is reserved for 10 minutes after registration. If mock payment is not completed within 10 minutes, the reservation expires and the place becomes available again. |

### 4.1 Scope Decisions

**Scope Decision 1 — Event participation model.** The team defined three flows:
- open events need no registration;
- free limited-capacity events need registration but no payment;
- paid events need registration followed by mock payment before confirmation and QR ticket issue.

**Scope Decision 2 — Paid-event reservation timeout.** For paid events, one place is reserved for 10 minutes after registration. If mock payment is not completed within this period, the reservation expires and the place returns to available capacity.

**Additional clarification:** new events are saved as Draft and cannot be published until all required publishing information is complete. Admin functionality includes viewing all users, creating Organizer accounts, and blocking users.

---

## 5. Profit Forecast Calculation

### 5.1 Forecast Approach

The forecast covers 12 months and compares two cases: the current **Mock Payment MVP** and a future **Real Payment production** case. The Real Payment case uses three scenarios: More Pessimistic, Pessimistic, and Base.

USD is the main reporting currency. KZT values are shown in brackets.

**Planning exchange rate:** 1 USD = 447.02 KZT.

### 5.2 Main Assumptions

| Assumption | More Pessimistic | Pessimistic | Base |
|---|---|---|---|
| Paid events per month | 1 | 2 | 3 |
| Paid events per 9-month academic year | 9 | 18 | 27 |
| Potential participants per paid event | 200 | 400 | 600 |
| Purchase rate | 60% | 70% | 80% |
| Actual ticket buyers per event | 120 | 280 | 480 |
| Average ticket price | $1.12 (500 KZT) | $2.24 (1,000 KZT) | $6.71 (3,000 KZT) |
| Uvento commission | 5% | 5% | 7.5% |
| Payment processing fee | 2% of ticket GMV | 2% of ticket GMV | 2% of ticket GMV |
| Free limited-capacity events / 9 months | ~30 | ~40 | ~50 |
| Commission on KBTU-sponsored events | 0% | 0% | 0% |

Paid-event users are unique students. Ticket buyers per event represent transactions, so one student may buy tickets for more than one event during the year.

> **Payment fee assumption:** For this forecast, Uvento is assumed to cover the 2% payment processing fee on each successful transaction. The actual allocation of this fee has not yet been decided and may later be passed to event organizers or included in ticket pricing.

### 5.3 Revenue Formula

```text
Annual Paid Tickets = Paid Events per Year × Potential Participants per Event × Purchase Rate
Annual Ticket GMV   = Annual Paid Tickets × Average Ticket Price
Uvento Revenue      = Annual Ticket GMV × Uvento Commission Rate
```

| Line | More Pessimistic | Pessimistic | Base |
|---|---|---|---|
| Paid tickets over 9 months | 1,080 | 5,040 | 12,960 |
| Ticket GMV over 9 months | $1,208.00 (540,000 KZT) | $11,274.66 (5,040,000 KZT) | $86,975.97 (38,880,000 KZT) |
| Uvento commission rate | 5% | 5% | 7.5% |
| Uvento revenue over 9 months | $60.40 (27,000 KZT) | $563.73 (252,000 KZT) | $6,523.20 (2,916,000 KZT) |

### 5.4 Mock Payment MVP Cost

| Cost Item | Annual Cost |
|---|---|
| Vercel Hobby | $0 |
| Supabase Free | $0 |
| Domain | $0 |
| Payment processing | $0 |
| Other tools | $0 |
| Team salary cost | $0 |
| **Total monetary cost** | **$0 (0 KZT)** |

The team contributes about 27 team-hours per week, but the project is unpaid, so salary cost is $0. No real money is processed in the Mock Payment MVP; therefore, monetary revenue and net monetary value are also $0. This version is used to test the payment flow.

### 5.5 Real Payment Production Cost

| Cost Item | Annual Cost |
|---|---|
| Vercel Pro | $240/year |
| Supabase Pro | $300/year |
| .com domain | $18/year |
| Other tools | $0 |
| Team salary cost | $0 |
| **Fixed annual infrastructure cost** | **$558 (249,437 KZT)** |

Payment processing planning assumption is 2% of ticket GMV. This is not a signed provider contract.

```text
Payment Processing Cost = Annual Ticket GMV × 2%
```

### 5.6 Real Payment Scenario Comparison

| Line | More Pessimistic | Pessimistic | Base |
|---|---|---|---|
| Paid tickets over 9 months | 1,080 | 5,040 | 12,960 |
| Ticket GMV | $1,208.00 (540,000 KZT) | $11,274.66 (5,040,000 KZT) | $86,975.97 (38,880,000 KZT) |
| Total Uvento Revenue | $60.40 (27,000 KZT) | $563.73 (252,000 KZT) | $6,523.20 (2,916,000 KZT) |
| Payment processing cost (2%) | $24.16 (10,800 KZT) | $225.49 (100,800 KZT) | $1,739.52 (777,600 KZT) |
| Fixed infrastructure cost | $558.00 (249,437 KZT) | $558.00 (249,437 KZT) | $558.00 (249,437 KZT) |
| **Total Cost** | $582.16 (260,237 KZT) | $783.49 (350,237 KZT) | $2,297.52 (1,027,037 KZT) |
| **Net Value** | **-$521.76 (-233,237 KZT)** | **-$219.76 (-98,237 KZT)** | **$4,225.68 (1,888,963 KZT)** |

`Net Value = Total Benefit − Total Cost`

### 5.7 Interpretation

Under these assumptions, the Real Payment version has a negative net value in both the More Pessimistic and Pessimistic cases because fixed infrastructure costs are higher than Uvento's commission revenue. The Base case becomes profitable, with an estimated annual net value of about $2,277 (1,017,763 KZT). The result is most sensitive to paid-event attendance, average ticket price, and Uvento's commission rate.

---

## AI Use Disclosure

AI was used to create the layout of report.
