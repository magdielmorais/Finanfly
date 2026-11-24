# Security Summary

**Reviewed Files**: 22
**Issues Resolved**: 7

### Issues Resolved
| Area | File | Line | What Was Happening | Impact | Status | How It Was Fixed |
|---|---|---|---|---|---|---|
| Cross-User Row Overwrite | `server.ts`, `src/server/isolation.ts` | 1668, 2148 | Tables with global primary keys (`incomes`, `expenses`, `investments`, `trips`, `wishes`, `action_plans`, `deficit_actions`, `shopping_list`) used `.upsert(..., { onConflict: 'id' })` via service-role credentials without verifying whether incoming `id` values already belonged to another account. | Critical | Fixed | Added `assertNoForeignRowOwnership` before every entity upsert to verify row ownership in chunks and reject foreign IDs with HTTP 403 + audit logging, plus `remapCollidingImportIds` on backup imports. |
| Collision-Prone Record IDs | `src/utils/id.ts`, `src/components/Pages.tsx`, `src/components/InvestimentosPage.tsx`, `src/components/ViagemPage.tsx` | 493, 2174, 4192, 6668, 7138, 7670, 8183 | Client data-entry pages generated record IDs using `Date.now()` or `Math.random()`, creating collision risk across users writing in the same millisecond on global-PK tables. | High | Fixed | Added `generateRecordId(prefix)` backed by Web Crypto (`crypto.randomUUID()` / `crypto.getRandomValues()`) and updated all financial insertion pages to use it. |
| Arbitrary Payload Keys Accepted | `server.ts`, `src/server/isolation.ts` | 3727 | `POST /api/user/data` stripped only three metadata fields before merging client JSON into `user_data` and `user_backups`, allowing arbitrary top-level keys to be stored. | Medium | Fixed | Added `pickAllowedUserDataFields` allowlisting strictly the 17 array-backed financial keys and validating granular entity payloads. |
| Audit Filter String Manipulation | `server.ts`, `src/server/isolation.ts` | 4708 | `GET /api/admin/audit-logs` interpolated raw `email` query characters directly into a PostgREST `.or()` filter string, allowing commas or parentheses to alter filter expressions. | Medium | Fixed | Added `sanitizePostgrestEmailFilter` to restrict query input strictly to safe e-mail characters (`[a-z0-9@._+-]`). |
| Query-Parameter Token Exposure | `server.ts` | 2631 | `GET /api/auth/verify-session` accepted session tokens in URL query parameters (`req.query.token`), exposing tokens to server/proxy URL logs. | Medium | Fixed | Removed `req.query.token` fallback so session verification only accepts `x-auth-token` or `Authorization` headers. |
| Legacy Password Disclosure Route | `server.ts` | 4604 | `GET /api/admin/retrieve-password/:targetEmail` returned stored non-hashed passwords in plaintext when an unmigrated legacy account was queried. | Medium | Fixed | Updated the endpoint to never return stored password values and always instruct admins to issue a reset via Edit User. |
| Account-Switch Client UI State Isolation | `src/App.tsx` | 1341 | Switching users without reloading could preserve local form state in mounted page components such as `DadosPessoaisPage`. | Medium | Fixed | Added `key={currentUser.email}` on the authenticated `<Suspense>` view container so React unmounts and clears all form and filter state when switching accounts. |

### Safeguards Verified
| Area | File | How It's Protected |
|---|---|---|
| Session & Identity Binding | `server.ts` | `getAuthEmailFromReq()` ignores untrusted `x-user-email` headers and extracts identity solely from HMAC-SHA256 verified JWT tokens. |
| Per-User Query Filtering | `server.ts` | Every user read and delete path across all user-owned Supabase tables explicitly constrains `.eq('email', lowerEmail)` and authenticates via `requireAuth()`. |
| Retention & Soft-Delete Windows | `src/server/retention.ts`, `server.ts` | Server-side enforcement restricts trash and backup restoration strictly to 3 days (72h) and trims data older than 3 years before writing. |
| Client Storage & XSS | `src/App.tsx`, `src/utils/authToken.ts` | Authentication tokens remain strictly in RAM (`authToken.ts`), legacy `localStorage`/`sessionStorage` keys are scrubbed on startup/logout, and zero raw HTML injection sinks exist in components. |
| CORS & Security Headers | `src/server/security.ts` | Explicit origin allowlist rejects unauthorized origins with HTTP 403, paired with `helmet` security headers and per-IP/per-email brute-force rate limiters. |

## PoC Verification

### 1. Cross-User Row Overwrite via `onConflict: 'id'`
#### Summary
| Field | Value |
|---|---|
| Issue Type | Cross-User Row Ownership Bypass |
| Impact | Critical |
| Affected File | `server.ts:1668`, `server.ts:2148`, `src/server/isolation.ts:62` |
| Test Scenario | Authenticated user `atacante@example.com` submits `POST /api/user/entity/expenses` with `action: "upsert"` and `item.id: "exp-victim-1"`, which belongs to `vitima@example.com`. |

#### How It Was Fixed
Before running `.upsert(..., { onConflict: 'id' })` in both bulk table sync and granular entity mutation paths, `assertNoForeignRowOwnership` queries Supabase for the current `email` of every submitted `id` and aborts with HTTP 403 (`ForeignRowOwnershipError`) if any existing record belongs to a different account.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Authenticated request hits `POST /api/user/entity/expenses` (`server.ts:3767`) with `item.id = "exp-victim-1"`. | Handler passes JWT auth for `atacante@example.com` and enters `saveGranularEntityMutation`. |
| 2 | `assertNoForeignRowOwnership` (`server.ts:2148`, `src/server/isolation.ts:62`) queries `.from('expenses').select('id, email').in('id', ['exp-victim-1'])`. | Database returns existing row owned by `vitima@example.com`. |
| 3 | Ownership check detects email mismatch (`vitima@example.com !== atacante@example.com`) and throws `ForeignRowOwnershipError` before `.upsert()` runs. | Error caught at `server.ts:3811`, logs `CROSS_USER_ID_BLOCKED`, returns **HTTP 403** (`Operação negada`). Victim row untouched. |

#### Conclusion
**Fix Verified** - Automated unit verification (`tests/security.test.ts`) confirms any upsert carrying another user's `id` is blocked before database write.

### 2. Unfiltered Payload Keys on `/api/user/data` & Audit Log Filter Manipulation
#### Summary
| Field | Value |
|---|---|
| Issue Type | Mass Assignment / Query Filter Manipulation |
| Impact | Medium |
| Affected File | `server.ts:3727`, `server.ts:4708`, `src/server/isolation.ts:34` |
| Test Scenario | Client submits unexpected fields (`{ role: "admin", expenses: [] }`) to `POST /api/user/data`, or admin sends `GET /api/admin/audit-logs?email=a,actor_email.eq.admin`. |

#### How It Was Fixed
Added `pickAllowedUserDataFields` to accept exclusively the 17 array-backed financial domain keys and reject payloads with no valid domain arrays, and added `sanitizePostgrestEmailFilter` to strip filter meta-characters before constructing the `.or()` predicate.

#### Step-by-Step Trace
| Step | What Happens in the Code | Outcome |
|---|---|---|
| 1 | Crafted JSON body arrives at `POST /api/user/data` (`server.ts:3727`) or crafted email query arrives at `GET /api/admin/audit-logs` (`server.ts:4708`). | Request enters validation helpers. |
| 2 | `pickAllowedUserDataFields` discards non-domain properties (`role`, `isBlocked`, etc.) while `sanitizePostgrestEmailFilter` strips commas and parentheses. | Both untrusted inputs are neutralized prior to database serialization or query execution. |
| 3 | Database only writes allowlisted financial arrays or searches sanitized alphanumeric e-mail text. | **Handled Safely** |

#### Conclusion
**Fix Verified** - Regression tests in `tests/security.test.ts` confirm injected object keys and PostgREST filter operators are stripped prior to execution.
