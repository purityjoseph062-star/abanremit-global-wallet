# AbanRemit Demo vs Production

## Architecture

The app uses a single API interface (`ApiAdapter`) with two implementations, swappable via `VITE_API_MODE`:

| Mode | Setting | Adapter | Data Source |
|------|---------|---------|-------------|
| Demo | `VITE_API_MODE` not set or `"demo"` | `DemoApiAdapter` | Browser localStorage |
| Production | `VITE_API_MODE=laravel` | `LaravelApiAdapter` | Laravel REST API at `/api/v1` |

## What the Demo Does

- **Simulates server-side rules**: Fees, commissions, float deductions, idempotency, balance checks, wallet creation limits, exchange rates — all enforced in `DemoApiAdapter`
- **Persists to localStorage**: State survives page reloads via the demo store (`abanremit_demo_state_v1`)
- **Simulates latency**: 250–450ms delay on API calls for realistic UX
- **Provides seed data**: Fictional customer and agent personas, wallets, transactions, beneficiaries, notifications
- **Multi-currency wallets**: KES, USD, GBP, EUR wallets with demo FX rates
- **Exchange simulation**: Illustrative quotes with 60-second expiry, 1.5% spread

## What the Demo Does NOT Do

- **No real authentication**: Demo personas are switched in localStorage. No password, no session token, no JWT
- **No real money movement**: All balances are numbers in localStorage
- **No server-side security**: Permission checks are frontend-only for UX
- **No real external integrations**: No actual bank transfers, no payment provider callbacks
- **No multi-device sync**: Data is per-browser

## Production Requirements (Laravel)

### Authentication
- Sanctum session-based auth (cookie-based, CSRF protected)
- Agent profiles stored in `agent_profiles` table linked to `users`
- Operating status enforced server-side before every financial operation

### Permissions
- Same permission strings as frontend (`agent.cash_in.create`, etc.)
- Enforced via Laravel policies or middleware on every `/api/v1/agent/*` route
- Role assigned at user level, checked at request time

### Financial Rules (Must Match Demo)
| Rule | Demo Value | Laravel Must Enforce |
|------|-----------|---------------------|
| Commission rate | 0.5% | Configurable, server-side |
| Cash-in fee | 0 | — |
| Cash-out fee | 1% added on top | Configurable, server-side |
| Single tx limit | 10,000,000 minor units | Configurable per agent tier |
| Idempotency | UUID key → transaction ID | DB unique constraint on key |
| Wallet per currency | One per customer per currency | DB unique constraint on (owner_id, currency) |
| Exchange spread | 1.5% | Configurable per pair and tier |
| Exchange quote expiry | 60 seconds | Server-enforced expiry check |
| FX rates | Fixed demo rates to KES | Real rate provider or treasury-managed table |

### Two-Phase Cash-Out
- Phase 1: `POST /agent/cash-out` → reserve funds (available→held), status=processing
- Phase 2A: `POST /agent/cash-out/{id}/confirm-payout` → finalize debit, generate commission
- Phase 2B: `POST /agent/cash-out/{id}/report-payout-failure` → release held funds, status=failed
- **Critical**: Laravel must use database transactions for atomicity

### Float Management
- Replenishment requests do NOT change float balance (request only)
- Only operations-approved allocations change float
- Float movements must be append-only (no updates/deletes)

### Reconciliation
- System-calculated closing balance must derive from the same float movement ledger
- Variance calculation: `reportedClosing - systemCalculatedClosing`
- Status transitions: balanced → (auto) or variance_flagged → under_review → (ops action)

### Settlements
- Commission payouts mark commission entries as `settled`
- Float top-ups increase float account `available` and create a `replenishment` movement

## Switching to Production

Set in `.env`:
```
VITE_API_MODE=laravel
VITE_API_BASE_URL=https://api.abanremit.com
```

The `LaravelApiAdapter` will be used automatically. No component changes needed — all screens call `api.agents.*` which routes to the correct adapter.
