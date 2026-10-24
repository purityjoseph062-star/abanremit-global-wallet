# AbanRemit Data Model

## Core Entities

### User

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| name | string | Full name |
| email | string | Unique |
| phone | string | E.164 format |
| country | string | ISO 3166-1 alpha-2 |
| role | Role enum | customer, business_customer, agent, etc. |
| kycStatus | KycStatus enum | draft, submitted, pending_review, approved, rejected |

### Wallet

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Internal primary key |
| number | string(15) | Permanent public account number, unique |
| ownerId | UUID | FK to User |
| currency | CurrencyCode | KES, USD, GBP, EUR, UGX, TZS |
| accountType | AccountType | personal, business, agent |
| status | WalletStatus | active, suspended, pending_activation |
| available | bigint | Integer minor units |
| pending | bigint | Integer minor units |
| held | bigint | Integer minor units |

**Constraint**: Unique on (ownerId, currency) — one wallet per customer per currency.

### Transaction

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| reference | string | Human-readable reference (e.g. ABR-...) |
| idempotencyKey | UUID | Unique, prevents duplicate operations |
| type | TxType | transfer, deposit, withdrawal, exchange, cash_in, cash_out |
| channel | TxChannel | wallet, bank, mobile_money, card, agent, fx |
| status | TxStatus | pending, processing, completed, failed, reversed, cancelled, expired |
| walletId | UUID | FK to Wallet |
| ownerId | UUID | FK to User |
| currency | CurrencyCode | Transaction currency |
| amount | bigint | Integer minor units |
| fee | bigint | Integer minor units |
| fxRate | decimal(18,8) | Nullable, for exchange transactions |
| destAmount | bigint | Nullable, for exchange |
| destCurrency | CurrencyCode | Nullable, for exchange |
| counterparty | string | Display name, not full details |
| method | string | Nullable, deposit/withdrawal method |
| destination | string | Nullable, masked destination |
| nextAction | string | Nullable, pending action hint |
| createdAt | timestamp | |
| timeline | json | Array of {status, at, note} |
| ledger | json | Array of {account, debit, credit, currency} |

### Beneficiary

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| ownerId | UUID | FK to User |
| name | string | Recipient display name |
| type | BeneficiaryType | wallet, bank, mobile_money |
| destination | string | Wallet number, bank account, or phone |
| provider | string | Nullable, bank/MMO provider name |
| currency | CurrencyCode | Default currency for transfers to this beneficiary |
| verified | boolean | Whether destination has been verified |

### ExchangeQuote

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| sourceWalletId | UUID | FK to Wallet |
| destWalletId | UUID | FK to Wallet |
| sourceCurrency | CurrencyCode | |
| destCurrency | CurrencyCode | |
| amount | bigint | Source amount in minor units |
| rate | decimal(18,8) | Exchange rate including spread |
| fee | bigint | Fee in minor units |
| destAmount | bigint | Destination amount in minor units |
| totalDebit | bigint | Total debited from source (amount + fee) |
| expiresAt | timestamp | Quote expiry |
| illustrative | true | Always true in demo |

### Statement

| Field | Type | Notes |
|-------|------|-------|
| walletId | UUID | FK to Wallet |
| walletNumber | string | For display |
| currency | CurrencyCode | |
| openingBalance | bigint | |
| closingBalance | bigint | |
| from | date | Statement start |
| to | date | Statement end |
| lines | StatementLine[] | Ordered by date ascending |

### StatementLine

| Field | Type | Notes |
|-------|------|-------|
| date | timestamp | Transaction date |
| reference | string | Transaction reference |
| type | TxType | |
| description | string | Human-readable description |
| debit | bigint | Amount debited (0 if credit) |
| credit | bigint | Amount credited (0 if debit) |
| balance | bigint | Running balance after this line |
| currency | CurrencyCode | |

### AccountLimits

| Field | Type | Notes |
|-------|------|-------|
| dailyTransferLimit | bigint | Minor units |
| dailyWithdrawalLimit | bigint | Minor units |
| singleTransactionLimit | bigint | Minor units |
| monthlyVolumeLimit | bigint | Minor units |
| currency | CurrencyCode | Limit currency |

### CustomerSupportTicket

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| reference | string | Human-readable reference |
| category | string | |
| subject | string | |
| description | string | |
| status | SupportTicketStatus | open, in_progress, waiting_customer, waiting_ops, resolved, closed |
| createdAt | timestamp | |
| messages | SupportTicketMessage[] | Conversation thread |

### AppNotification

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | Primary key |
| title | string | |
| body | string | |
| at | timestamp | |
| read | boolean | |
| txId | UUID | Nullable, FK to Transaction |
| category | string | Nullable |
| severity | "info" \| "warning" \| "error" | Nullable |

## Money Representation

All monetary amounts are stored as **integer minor units** (e.g., cents). This avoids floating-point rounding errors. The `precision` field on `CurrencyInfo` indicates how many decimal places the currency uses for display:

- KES, USD, GBP, EUR: precision 2 (100 minor units = 1 major unit)
- UGX, TZS: precision 0 (1 minor unit = 1 major unit)

Conversion: `displayAmount = minorUnits / (10 ^ precision)`

## Demo Persistence

Demo state is stored in `localStorage` under key `abanremit_demo_state_v1` via a `useSyncExternalStore`-based store. The state includes:

- Current user (demo persona)
- All wallets for that user
- All transactions
- All beneficiaries
- All notifications
- All support tickets
- Exchange quotes (ephemeral, with expiry)
- Idempotency key → result mapping

State is seeded on first load with a default customer persona, KES wallet, and sample transactions.
