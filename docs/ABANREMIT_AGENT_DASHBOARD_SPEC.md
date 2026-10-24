# AbanRemit Agent Dashboard Specification

## Overview

The AbanRemit Agent Dashboard is a complete agent operations platform that enables field agents to perform cash-in, cash-out, float management, commission tracking, settlements, daily reconciliation, and customer service operations on behalf of AbanRemit.

## Personas

### Agent (role: `agent`)
- Standard field agent at an outlet
- Can perform cash-in, cash-out, customer search, view transactions
- Can view float, request replenishment, view commissions and settlements
- Can perform daily reconciliation and view reports
- Cannot manage staff or outlet configuration

### Outlet Manager (role: `outlet_manager`)
- Senior agent with extended permissions
- All standard agent permissions plus:
  - Staff management (`agent.staff.manage`)
  - Outlet management (`agent.outlet.manage`)
  - Customer registration (`agent.customers.register`)
  - Transfer creation (`agent.transfers.create`)
  - Transaction reversal requests (`agent.transactions.reverse.request`)

## Pages

| Route | Permission | Description |
|-------|-----------|-------------|
| `/agent` | `agent.dashboard.view` | Dashboard with metrics, alerts, quick actions |
| `/agent/customers` | `agent.customers.search` | Customer search with KYC status, wallet summaries |
| `/agent/cash-in` | `agent.cash_in.create` | 5-step cash-in wizard |
| `/agent/cash-out` | `agent.cash_out.create` | 6-step cash-out wizard with two-phase payout |
| `/agent/transactions` | `agent.transactions.view` | Transaction list with filters and detail dialog |
| `/agent/float` | `agent.float.view` | Float accounts, ledger, replenishment requests |
| `/agent/commissions` | `agent.commissions.view` | Commission summary and filterable ledger |
| `/agent/settlements` | `agent.settlements.view` | Settlement history |
| `/agent/reconciliation` | `agent.reconciliation.view` | Reconciliation list and creation form |
| `/agent/reports` | `agent.reports.view` | Date-range reports with CSV export |
| `/agent/notifications` | `agent.dashboard.view` | Notification center |
| `/agent/support` | `agent.dashboard.view` | Support tickets with conversation history |
| `/agent/profile` | `agent.dashboard.view` | Agent profile and role permissions |
| `/agent/security` | `agent.dashboard.view` | Session management and security info |

## Dashboard Metrics

The dashboard (`agent.dashboardMetrics()`) returns:
- Agent profile (code, outlet, operating status)
- Float accounts with available balances and low-float warnings
- Today's cash-in and cash-out volumes per currency
- Today's earned commission
- Pending transaction count (cash-outs awaiting payout)
- Last reconciliation status

## Alerts

- **Operating status warning**: If agent is not `active`, all financial operations are blocked
- **Low float**: Float account below 20% of allocated amount
- **Pending payouts**: Cash-out transactions in `processing` status
- **Failed transactions**: Cash-out transactions in `failed` status

## Architecture

All agent pages call only `api.agents.*` methods. The `DemoApiAdapter` simulates server-side rules (fees, commissions, float deductions, idempotency). The `LaravelApiAdapter` maps every method to a REST endpoint under `/api/v1/agent/*`.

### Single Source of Truth

All views (dashboard, float ledger, commission ledger, transaction list) derive from the same underlying demo state:
- `transactions[]` — all transaction records
- `wallets[]` — wallet balances (agent and customer)
- `floatAccounts[]` — float account balances
- `floatMovements[]` — float ledger entries
- `commissions[]` — commission entries

No page maintains its own copy of financial data. Every mutation flows through `api.agents.*` which updates the shared state.
