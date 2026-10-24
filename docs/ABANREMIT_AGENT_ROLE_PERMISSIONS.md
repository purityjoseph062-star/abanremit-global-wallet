# AbanRemit Agent Role Permissions

## Roles

### `agent` — Standard Field Agent
### `outlet_manager` — Outlet Manager (extended agent)

## Permission Matrix

| Permission | agent | outlet_manager | Description |
|-----------|:-----:|:--------------:|-------------|
| `agent.dashboard.view` | ✓ | ✓ | View agent dashboard |
| `agent.customers.search` | ✓ | ✓ | Search customers by name/phone/email |
| `agent.customers.view` | ✓ | ✓ | View customer details and wallets |
| `agent.customers.register` | — | ✓ | Register new customers |
| `agent.cash_in.create` | ✓ | ✓ | Perform cash-in transactions |
| `agent.cash_in.confirm` | ✓ | ✓ | Confirm cash-in receipt |
| `agent.cash_out.create` | ✓ | ✓ | Initiate cash-out transactions |
| `agent.cash_out.confirm` | ✓ | ✓ | Confirm physical payout |
| `agent.transfers.create` | — | ✓ | Create transfers on behalf of customers |
| `agent.transactions.view` | ✓ | ✓ | View agent transaction history |
| `agent.transactions.reverse.request` | — | ✓ | Request transaction reversal |
| `agent.float.view` | ✓ | ✓ | View float accounts and ledger |
| `agent.float.adjust.request` | ✓ | ✓ | Request float replenishment |
| `agent.commissions.view` | ✓ | ✓ | View commission ledger and summary |
| `agent.settlements.view` | ✓ | ✓ | View settlement history |
| `agent.reconciliation.view` | ✓ | ✓ | View and create reconciliations |
| `agent.reports.view` | ✓ | ✓ | View and export reports |
| `agent.staff.manage` | — | ✓ | Manage outlet staff |
| `agent.outlet.manage` | — | ✓ | Manage outlet configuration |

## Enforcement

### Frontend (Demo)
- Route `beforeLoad` calls `requirePermission(permission)` which checks `can(role, permission)`
- Agent layout sidebar only shows nav items the user has permission for
- Each child route independently guards with its own `requirePermission`

### Backend (Laravel — must implement)
- Every `/api/v1/agent/*` endpoint must check the agent's role and permissions server-side
- The same permission strings defined in `src/lib/permissions.ts` must be enforced in Laravel middleware or policy classes
- Agent operating status must be checked before any financial operation
- Frontend permission checks are for UX only — they are NOT security

## Adding New Permissions

1. Add the permission string to the `Permission` type in `src/lib/permissions.ts`
2. Add it to the appropriate role arrays (`AGENT_PERMISSIONS`, `OUTLET_MANAGER_PERMISSIONS`)
3. Use it in route `beforeLoad` with `requirePermission()`
4. Add the corresponding server-side check in Laravel
