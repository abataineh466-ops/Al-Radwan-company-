# Security Specification & Payload-First TDD — Al-Radwan Law Firm Firestore

## 1. Relationship Mapping & Master Source of Truth

- **Bootstrap Administrator**: Verified Google account `abataineh466@gmail.com` (`request.auth.token.email_verified == true && request.auth.token.email == 'abataineh466@gmail.com'`).
- **Authorized Administrators (`/admins/{adminId}`)**: Secondary firm partners/admins granted elevated permissions strictly by an existing administrator. Users can NEVER self-register into `/admins` or modify their own admin role.
- **Private Firm Collections (`/lawyers`, `/cases`, `/bookings`, `/intakes`, `/inquiries`)**: All five collections contain sensitive client and attorney PII (names, Jordanian phone numbers, legal dispute facts, court names). Therefore:
  - **No blanket `isSignedIn()` reads**: Every `get` and `list` requires either `isBootstrapAdmin()` (zero DB lookups in `list`) or `isAdmin()` / strict ownership (`existing().createdByUid == request.auth.uid`).
  - **No unauthenticated writes**: Every mutation requires `request.auth != null && request.auth.token.email_verified == true`.
  - **Strict schema & temporal integrity**: Every `create` enforces `hasAll` + `hasOnly`, `createdByUid == request.auth.uid`, `createdAt == request.time`, `updatedAt == request.time`, regex-hardened IDs (`^[a-zA-Z0-9_\-]+$`), bounded string sizes matching `firebase-blueprint.json`, and bounded allowlisted arrays (`specialties.size() <= 7`).
  - **Terminal State Locking**: Closed cases (`stage == 'closed'`) and completed/cancelled bookings (`status in ['completed', 'cancelled']`) cannot be altered by non-admin actors; only verified admins can override terminal states.

## 2. Data Invariants

1. **Identity Integrity**: On `create`, `incoming().createdByUid == request.auth.uid`. On `update`, `incoming().createdByUid == existing().createdByUid` and `incoming().createdAt == existing().createdAt` (immortal fields).
2. **Temporal Integrity**: On `create`, `incoming().createdAt == request.time && incoming().updatedAt == request.time`. On `update`, `incoming().updatedAt == request.time`.
3. **Path-ID Binding & Hardening**: Every single-document operation (`get`, `create`, `update`, `delete`) enforces `isValidId(docId)` (`<= 128` chars, `^[a-zA-Z0-9_\-]+$`), and on `create`, `incoming().id == docId`.
4. **PII Isolation**: No authenticated non-admin user can read another user's case, booking, intake summary, or contact inquiry.
5. **Bounded Array Guarding**: `FirmLawyer.specialties` MUST be a list of length `1..7` whose elements belong strictly to the 7 valid specialty IDs (`hasOnly`).
6. **Action-Based Updates**: Every `update` begins with `isValid[Entity](incoming())` and strictly allowlists changed keys via `incoming().diff(existing()).affectedKeys().hasOnly([...])`.

## 3. The "Dirty Dozen" Adversarial Payloads (Must All Return `PERMISSION_DENIED`)

1. **Shadow Field Injection (Cases)**: Creating a case with an extra ghost field `{ "isVerifiedByCourt": true }`.
2. **Email Spoofing Attack (Admin Bypass)**: Authenticated request claiming `email: "abataineh466@gmail.com"` with `email_verified: false`.
3. **Identity Spoofing (Bookings)**: Creating a booking with `createdByUid: "victim-uid-999"` while signed in as `"attacker-uid-111"`.
4. **Privilege Escalation (Self-Admin)**: Non-admin signed-in user attempting to write `/admins/{ownUid}` with `role: "managing_partner"`.
5. **Resource Poisoning (Oversized ID)**: Writing a case with a 200-character document ID containing invalid characters (`../../etc/passwd`).
6. **Value Poisoning (Oversized Summary)**: Updating a case `summary` with a 5,000-character payload exceeding `maxLength: 2000`.
7. **PII Blanket Read (Unauthorized `get`)**: Non-admin user reading another user's `/bookings/{id}` containing client phone and dispute details.
8. **Query Scraping (Unauthorized `list`)**: Non-admin user issuing an unfiltered `list` query on `/cases` or `/inquiries`.
9. **Client Timestamp Forgery**: Creating a lawyer or case with a spoofed past timestamp (`createdAt != request.time`).
10. **Immortal Field Tampering**: Updating a booking to change `createdAt` or `createdByUid`.
11. **Terminal State Violation**: Non-admin updating a `closed` case's `stage` back to `litigation` or modifying a `completed` booking.
12. **Array Allowlist / Size Violation**: Creating a `FirmLawyer` with `specialties: ["hacking", "invalid"]` or `specialties: []` (empty) or 8+ entries.

## 4. Test Runner

Executed via `npx --yes tsx --test firestore.rules.test.ts` verifying every single Dirty Dozen payload is denied (`PERMISSION_DENIED`) alongside valid operational payloads and rule-file structural assertions.
