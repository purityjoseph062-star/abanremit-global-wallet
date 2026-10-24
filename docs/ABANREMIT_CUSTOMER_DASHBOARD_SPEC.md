# AbanRemit Customer Dashboard Spec

## Overview

The customer dashboard is the primary interface for AbanRemit customers to manage multi-currency wallets, send and receive money, exchange currencies, view transaction history, manage beneficiaries, and configure account settings.

## Navigation

The portal shell uses a sidebar (desktop) and bottom nav (mobile) with three navigation groups:

| Group | Pages |
|-------|-------|
| Money | Dashboard, Wallets, Send, Deposit, Withdraw, Receive, Exchange |
| Activity | Transactions, Beneficiaries |
| Account | Notifications, Limits, Support, Security, Settings |

All portal routes use `ssr: false` and are guarded by `requirePermission` in `beforeLoad`.

## Dashboard

The dashboard shows:
- **Portfolio total card**: Aggregate value of all wallets in display currency (KES), with FX rates used and last-updated timestamp
- **Primary action grid**: 6 buttons (Add money, Withdraw, Send, Request, Exchange, New wallet)
- **Wallet grid**: First 4 wallets with balance, currency flag, and "View details" link
- **Recent activity**: Latest 5 transactions
- **Pending transactions**: Transactions in pending/processing state
- **Verification alert**: Shown if KYC status is not approved
- **Statements link**: Quick access to wallet statements

## Wallet Creation

4-step flow:
1. **Choose currency**: Select from available currencies (KES, USD, GBP, EUR in demo). Eligibility check prevents duplicates.
2. **Review**: Show wallet details, currency info, terms
3. **Confirm**: Create wallet with idempotency key. Generates permanent wallet number (`100` + 12 random digits)
4. **Success**: Show wallet number with copy button, links to add money or view wallet

Rules:
- One wallet per customer per currency (enforced server-side)
- Idempotency key via `crypto.randomUUID()`
- Duplicate prevention returns existing wallet if same currency

## Wallet Details

- Wallet card with balance breakdown (available, pending, held)
- Action buttons: Add money, Withdraw, Send, Exchange
- Transaction history with filters (type, status, date range) and search
- CSV statement export

## Currency Exchange

4-step flow:
1. **Select wallets**: Choose source and destination wallets (must be different currencies)
2. **Amount & quote**: Enter amount, get illustrative quote with rate, fee, and expiry (60 seconds)
3. **Confirm**: Execute exchange with idempotency key. Posts ledger entries to both wallets.
4. **Result**: Show receipt with source/dest amounts, rate, and download option

## Transactions

- Searchable, filterable list of all transactions
- Filters: type, status, currency, date range
- Pagination
- CSV export
- Click through to transaction detail with timeline and ledger

## Beneficiaries

- Add recipient with name, type (wallet/bank/mobile_money), destination, provider, currency
- Edit existing recipients (all fields editable)
- Remove recipients (confirmation dialog)
- All 6 currencies supported (KES, UGX, TZS, USD, GBP, EUR)
- Zod validation on all fields

## Account Pages

### Notifications
- List with unread count badge
- Mark individual notifications as read
- Severity badges (info, warning, error)

### Limits
- Display daily transfer, daily withdrawal, single transaction, and monthly volume limits
- Verification status warning if KYC not approved

### Support
- Support ticket list with status badges
- Create new ticket dialog (category, subject, description)
- Reply thread within each ticket

### Security
- 2FA toggle (simulated)
- Login alerts preference
- Active sessions list with revoke option
- Security event log

### Settings
- Display currency preference
- Notification preferences (email, SMS, push toggles)
- Account info (name, email, phone)

### Verification
- KYC status display
- Verification progress steps
- Document upload UI (simulated, no real file upload)

## Design

- Semantic theme tokens scoped to the portal
- Consistent 8px spacing system
- shadcn/ui component library
- Responsive: sidebar on desktop, bottom nav on mobile
- Loading skeletons, empty states, and error states throughout
