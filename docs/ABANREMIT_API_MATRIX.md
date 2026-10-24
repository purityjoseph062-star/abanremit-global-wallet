# AbanRemit API Matrix

All endpoints are under `/api/v1`. Authentication via session cookie (Sanctum). Idempotency keys sent via `Idempotency-Key` header.

## Customer Endpoints

### Wallets

| Method | Endpoint | Body | Description | Idempotent |
|--------|----------|------|-------------|------------|
| GET | `/wallets` | — | List customer's wallets | No |
| GET | `/wallets/{id}` | — | Wallet details | No |
| POST | `/wallets` | `{currency, idempotencyKey}` | Create wallet | Yes |
| GET | `/wallets/eligibility?currency={}` | — | Check if customer can create wallet for currency | No |
| GET | `/wallets/{id}/statement?from={}&to={}` | — | Account statement | No |
| GET | `/wallets/{id}/transactions?type={}&status={}&q={}` | — | Transactions for a specific wallet | No |

### Currencies & Portfolio

| Method | Endpoint | Description | Idempotent |
|--------|----------|-------------|------------|
| GET | `/currencies` | List supported currencies with metadata | No |
| GET | `/portfolio` | Portfolio summary (total value, rates, counts) | No |

### Exchange

| Method | Endpoint | Body | Description | Idempotent |
|--------|----------|------|-------------|------------|
| POST | `/exchange/quote` | `{sourceWalletId, destWalletId, amount}` | Get exchange quote | No |
| POST | `/exchange` | `{sourceWalletId, destWalletId, amount, quoteId, idempotencyKey}` | Execute exchange | Yes |

### Deposits & Withdrawals

| Method | Endpoint | Body | Description | Idempotent |
|--------|----------|------|-------------|------------|
| POST | `/wallets/{id}/deposits` | `{method, amount, payerPhone?, idempotencyKey}` | Deposit funds | Yes |
| POST | `/wallets/{id}/withdrawals` | `{method, amount, beneficiaryId?, pin, idempotencyKey}` | Withdraw funds | Yes |

### Transfers

| Method | Endpoint | Body | Description | Idempotent |
|--------|----------|------|-------------|------------|
| POST | `/transfers` | `{walletId, beneficiaryId, amount, quoteId, pin, idempotencyKey}` | Send money | Yes |

### Beneficiaries

| Method | Endpoint | Body | Description | Idempotent |
|--------|----------|------|-------------|------------|
| GET | `/beneficiaries` | — | List beneficiaries | No |
| POST | `/beneficiaries` | `{name, type, destination, provider?, currency}` | Add beneficiary | No |
| PUT | `/beneficiaries/{id}` | `{name, type, destination, provider?, currency}` | Update beneficiary | No |
| DELETE | `/beneficiaries/{id}` | — | Remove beneficiary | No |

### Transactions

| Method | Endpoint | Description | Idempotent |
|--------|----------|-------------|------------|
| GET | `/transactions?type={}&status={}&currency={}&q={}&from={}&to={}` | List all transactions | No |
| GET | `/transactions/{id}` | Single transaction detail | No |

### Account

| Method | Endpoint | Description | Idempotent |
|--------|----------|-------------|------------|
| GET | `/notifications` | List notifications | No |
| POST | `/notifications/{id}/read` | Mark notification as read | No |
| GET | `/limits` | Account limits | No |
| GET | `/support/tickets` | List support tickets | No |
| POST | `/support/tickets` | `{category, subject, description}` | Create support ticket | No |
| POST | `/support/tickets/{id}/messages` | `{body}` | Reply to ticket | No |

## Agent Endpoints

## Agent Identity

| Method | Endpoint | Description | Idempotent |
|--------|----------|-------------|------------|
| GET | `/agent/me` | Agent profile (code, outlet, status) | No |
| GET | `/agent/dashboard` | Dashboard metrics (float, volumes, commission, pending) | No |

## Customers

| Method | Endpoint | Description | Idempotent |
|--------|----------|-------------|------------|
| GET | `/agent/customers?q={query}` | Search customers by name/phone/email | No |
| GET | `/agent/customers/{id}` | Get customer summary (KYC, wallets, tx count) | No |
| GET | `/agent/customers/{id}/wallets` | Get customer's wallets (full wallet objects) | No |

## Cash-In

| Method | Endpoint | Body | Description | Idempotent |
|--------|----------|------|-------------|------------|
| POST | `/agent/cash-in` | `{agentWalletId, customerWalletNumber, amount}` | Deposit cash into customer wallet | Yes |

**Flow**: Agent confirms physical cash receipt → customer wallet credited → agent float debited → commission earned (0.5%) → float movement recorded.

## Cash-Out (Two-Phase)

| Method | Endpoint | Body | Description | Idempotent |
|--------|----------|------|-------------|------------|
| POST | `/agent/cash-out` | `{agentWalletId, customerWalletId, amount}` | Initiate cash-out (reserves funds) | Yes |
| POST | `/agent/cash-out/{txId}/confirm-payout` | — | Confirm physical payout (finalizes debit) | No |
| POST | `/agent/cash-out/{txId}/report-payout-failure` | `{reason}` | Report payout failure (releases held funds) | No |
| POST | `/agent/cash-out/{txId}/cancel` | — | Cancel processing cash-out (releases held funds) | No |

**Phase 1 (Initiate)**: Customer funds moved from `available` to `held`. Transaction status = `processing`. No commission, no float movement.

**Phase 2a (Confirm Payout)**: Held funds debited. Agent float credited. Commission earned (0.5%). Float movement recorded. Status = `completed`.

**Phase 2b (Report Failure)**: Held funds released back to `available`. Status = `failed`. No commission, no float movement.

## Transactions

| Method | Endpoint | Description | Idempotent |
|--------|----------|-------------|------------|
| GET | `/agent/transactions?type={}&status={}&currency={}&q={}` | Agent's cash-in/cash-out transactions | No |
| GET | `/agent/transactions/{id}` | Single transaction detail | No |

## Float

| Method | Endpoint | Body | Description | Idempotent |
|--------|----------|------|-------------|------------|
| GET | `/agent/float/accounts` | Agent's float accounts | No |
| GET | `/agent/float/ledger` | Float movement history | No |
| GET | `/agent/float/replenishment-requests` | Replenishment request history | No |
| POST | `/agent/float/replenishment-requests` | `{accountId, amount, reason}` | Request float replenishment | Yes |
| POST | `/agent/float/replenishment-requests/{id}/cancel` | — | Cancel pending request | No |

**Note**: Replenishment requests do NOT change float balance. Only an approved allocation (processed by operations team) changes the ledger.

## Commissions

| Method | Endpoint | Description | Idempotent |
|--------|----------|-------------|------------|
| GET | `/agent/commissions/summary` | Commission summary (earned today, month, pending, settled) | No |
| GET | `/agent/commissions?status={}&type={}&currency={}` | Filterable commission ledger | No |

## Settlements

| Method | Endpoint | Description | Idempotent |
|--------|----------|-------------|------------|
| GET | `/agent/settlements` | Settlement history (commission payouts, float top-ups) | No |

## Reconciliation

| Method | Endpoint | Body | Description | Idempotent |
|--------|----------|------|-------------|------------|
| GET | `/agent/reconciliations` | Reconciliation history | No |
| POST | `/agent/reconciliations` | `{businessDate, currency, reportedClosing, explanation?}` | Create daily reconciliation | No |

## Reports

| Method | Endpoint | Description | Idempotent |
|--------|----------|-------------|------------|
| GET | `/agent/reports/summary?from={}&to={}` | Date-range report with per-currency breakdown | No |

## Support

| Method | Endpoint | Body | Description | Idempotent |
|--------|----------|------|-------------|------------|
| GET | `/agent/support/tickets` | Support ticket list | No |
| POST | `/agent/support/tickets` | `{category, subject, description, txRef?}` | Create support ticket | No |
| POST | `/agent/support/tickets/{id}/messages` | `{body}` | Reply to support ticket | No |

## Error Codes

| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION` | 422 | Invalid input |
| `UNAUTHENTICATED` | 401 | Not signed in |
| `FORBIDDEN` | 403 | Role lacks permission |
| `NOT_FOUND` | 404 | Resource not found |
| `AGENT_INACTIVE` | 403 | Agent operating status not active |
| `WALLET_INACTIVE` | 422 | Wallet not in active status |
| `INSUFFICIENT_FLOAT` | 422 | Agent float too low for cash-in |
| `INSUFFICIENT_FUNDS` | 422 | Customer balance too low for cash-out |
| `LIMIT_EXCEEDED` | 422 | Exceeds single-transaction limit |
| `INVALID_STATE` | 422 | Transaction in wrong state for operation |
| `IDEMPOTENCY_CONFLICT` | 409 | Same key, different payload |
| `NETWORK` | 503 | API unavailable |
