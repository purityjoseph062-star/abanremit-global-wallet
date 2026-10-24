# AbanRemit Integration Gaps

This document tracks what is implemented in the demo but not yet connected to a production Laravel backend.

## Fully Implemented (Demo)

| Feature | Demo Status | Notes |
|---------|-------------|-------|
| Agent authentication | Simulated via personas | No real auth |
| Customer authentication | Simulated via personas | No real auth |
| Customer search | ✓ | Searches localStorage users |
| Cash-in | ✓ | Full flow with commission and float |
| Cash-out (two-phase) | ✓ | Initiate → confirm/fail/cancel |
| Float accounts & ledger | ✓ | Seed data + live movements |
| Replenishment requests | ✓ | Create and cancel only |
| Commission ledger & summary | ✓ | Auto-generated on transactions |
| Settlements (view) | ✓ | Seed data only |
| Reconciliation | ✓ | Create and view |
| Reports with CSV export | ✓ | Date range summary |
| Notifications | ✓ | Auto-generated on financial events |
| Support tickets | ✓ | Create and reply |
| Agent profile | ✓ | View only |
| Security page | ✓ | Demo-labeled, sign-out |
| Multi-currency wallets | ✓ | KES, USD, GBP, EUR creation |
| Wallet details & statements | ✓ | Transaction history, CSV export, filters |
| Portfolio overview | ✓ | Aggregate value with FX conversion |
| Currency exchange | ✓ | Quote flow with expiry, idempotency |
| Beneficiary management | ✓ | Add, edit, remove with validation |
| Customer transactions | ✓ | Search, filters, pagination, CSV export |
| Account limits | ✓ | Display with verification warning |
| Customer support tickets | ✓ | Create, reply, status tracking |
| Verification page | ✓ | KYC status, progress steps (simulated) |
| Settings page | ✓ | Display currency, notification preferences |

## Not Yet Implemented

### Backend (Laravel)

| Gap | Priority | Description |
|-----|----------|-------------|
| Authentication system | High | No Laravel auth endpoints exist. Need Sanctum session auth, login/logout, agent profile lookup |
| Permission middleware | High | Server-side permission enforcement on all `/api/v1/agent/*` routes |
| Agent profiles table | High | DB table for agent code, outlet, operating status |
| Float accounts table | High | DB table with allocated/available balances per agent per currency |
| Float movements table | High | Append-only ledger of all float changes |
| Commission entries table | High | DB table with earned/settled status |
| Settlements table | Medium | DB table for commission payouts and float top-ups |
| Reconciliation calculations | High | Server-side closing balance calculation from float movements |
| Idempotency store | High | DB unique constraint on idempotency keys |
| Customer wallets table | High | DB table with unique (owner_id, currency) constraint |
| Exchange quotes table | High | DB table with expiry enforcement |
| Account limits per customer | Medium | Configurable limits per customer tier |
| Notification preferences | Medium | Per-category opt-in/opt-out settings |
| Support tickets table | Medium | DB table with conversation threads |
| Report aggregation | Medium | Server-side aggregation for date-range reports |

### Frontend (Demo Limitations)

| Gap | Priority | Description |
|-----|----------|-------------|
| Replenishment approval | Medium | Only request/cancel implemented. No approval flow (operations-side) |
| Settlement creation | Medium | Only viewing seed settlements. No create/initiate settlement flow |
| Transaction reversal | Medium | Permission exists (`agent.transactions.reverse.request`) but no UI |
| Customer registration | Medium | Permission exists for outlet_manager but no registration UI |
| Staff management | Low | Permission exists for outlet_manager but no staff management UI |
| Outlet management | Low | Permission exists for outlet_manager but no outlet config UI |
| Transfer creation (agent) | Low | Permission exists for outlet_manager but no agent transfer UI |
| Multi-currency float | Low | Seed has KES + USD but no currency exchange between float accounts |
| Receipt printing | Low | Uses browser print dialog; no thermal printer integration |
| PIN authorization | Low | Demo uses hardcoded PIN 1234; no real PIN verification |

### Reconciliation Gaps

| Gap | Description |
|-----|-------------|
| Opening balance | Demo uses a simplified calculation. Production needs precise start-of-day snapshot |
| Multi-currency reconciliation | UI supports one currency per reconciliation; no aggregate view |
| Historical drill-down | Cannot drill from variance into specific transactions |

### Notification Gaps

| Gap | Description |
|-----|-------------|
| Real-time push | No WebSocket/SSE. Notifications only update on query refetch |
| Email/SMS notifications | Not implemented. Demo only shows in-app notifications |
| Notification preferences | No per-category opt-in/opt-out settings |

## Migration Path

1. **Phase 1 — Auth & Profiles**: Implement Laravel auth, agent profiles, permission middleware
2. **Phase 2 — Financial Core**: Float accounts, movements, cash-in, cash-out, commissions, idempotency
3. **Phase 3 — Operations**: Replenishment approval, settlements, reconciliation calculations
4. **Phase 4 — Support & Reporting**: Support tickets, report aggregation, CSV export server-side
5. **Phase 5 — Advanced**: Transaction reversal, customer registration, staff management

Set `VITE_API_MODE=laravel` once Phase 1 is complete. The frontend requires no changes — all calls go through `api.agents.*`.
