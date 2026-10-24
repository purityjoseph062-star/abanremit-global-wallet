# AbanRemit Role Permission Matrix

## Roles

| Role | Description |
|------|-------------|
| customer | Personal account holder |
| business_customer | Business account holder |
| agent | Agent outlet operator |
| outlet_manager | Manages an outlet and its staff |
| support_officer | Handles customer support tickets |
| compliance_officer | KYC review and AML monitoring |
| payment_ops_officer | Float management and settlements |
| finance_officer | Financial reporting and reconciliation |
| administrator | System administration |
| super_administrator | Full system access |

## Customer Permissions

| Permission | customer | business_customer | agent | outlet_manager |
|------------|----------|-------------------|-------|----------------|
| wallet.view | ✓ | ✓ | — | — |
| wallet.create | ✓ | ✓ | — | — |
| wallet.statement.view | ✓ | ✓ | — | — |
| transfer.create | ✓ | ✓ | — | — |
| deposit.create | ✓ | ✓ | — | — |
| withdrawal.create | ✓ | ✓ | — | — |
| exchange.create | ✓ | ✓ | — | — |
| beneficiary.view | ✓ | ✓ | — | — |
| beneficiary.create | ✓ | ✓ | — | — |
| beneficiary.update | ✓ | ✓ | — | — |
| beneficiary.delete | ✓ | ✓ | — | — |
| transaction.view | ✓ | ✓ | — | — |
| transaction.export | ✓ | ✓ | — | — |
| portfolio.view | ✓ | ✓ | — | — |
| notification.view | ✓ | ✓ | — | — |
| notification.mark_read | ✓ | ✓ | — | — |
| limits.view | ✓ | ✓ | — | — |
| support.create | ✓ | ✓ | — | — |
| support.view | ✓ | ✓ | — | — |
| support.reply | ✓ | ✓ | — | — |
| security.view | ✓ | ✓ | — | — |
| security.update_settings | ✓ | ✓ | — | — |
| settings.view | ✓ | ✓ | — | — |
| settings.update | ✓ | ✓ | — | — |
| verification.view | ✓ | ✓ | — | — |
| verification.submit | ✓ | ✓ | — | — |

## Agent Permissions

| Permission | agent | outlet_manager |
|------------|-------|----------------|
| agent.dashboard.view | ✓ | ✓ |
| agent.customer.search | ✓ | ✓ |
| agent.customer.view | ✓ | ✓ |
| agent.customer.wallets.view | ✓ | ✓ |
| agent.cash_in.create | ✓ | ✓ |
| agent.cash_out.create | ✓ | ✓ |
| agent.cash_out.confirm_payout | ✓ | ✓ |
| agent.cash_out.report_failure | ✓ | ✓ |
| agent.cash_out.cancel | ✓ | ✓ |
| agent.transaction.view | ✓ | ✓ |
| agent.float.view | ✓ | ✓ |
| agent.float.replenishment.request | ✓ | ✓ |
| agent.float.replenishment.cancel | ✓ | ✓ |
| agent.commission.view | ✓ | ✓ |
| agent.settlement.view | ✓ | ✓ |
| agent.reconciliation.create | ✓ | ✓ |
| agent.reconciliation.view | ✓ | ✓ |
| agent.report.view | ✓ | ✓ |
| agent.support.view | ✓ | ✓ |
| agent.support.create | ✓ | ✓ |
| agent.support.reply | ✓ | ✓ |
| agent.profile.view | ✓ | ✓ |
| agent.customer.register | — | ✓ |
| agent.staff.manage | — | ✓ |
| agent.transfer.create | — | ✓ |
| agent.transaction.reverse | — | ✓ |

## Enforcement

- **Frontend**: Route guards via `requirePermission` in TanStack Router `beforeLoad`. Blocks navigation to pages the user's role cannot access.
- **Backend (Laravel)**: Must enforce the same permissions via Laravel policies or middleware on every `/api/v1/*` route. Frontend checks are for UX only — the server is the source of truth.

## Role Isolation

Customer and agent portals are completely separate:
- Customer routes: `/app/*`
- Agent routes: `/agent/*`
- No shared state, no cross-portal navigation
- Demo personas are role-specific — a customer persona cannot access agent pages and vice versa
