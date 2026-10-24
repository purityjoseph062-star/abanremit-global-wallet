# AbanRemit Payment Lifecycle

## Transaction Statuses

| Status | Description |
|--------|-------------|
| pending | Created, awaiting processing |
| processing | In progress (funds may be held) |
| completed | Successfully settled |
| failed | Did not complete, funds released |
| reversed | Completed then reversed |
| cancelled | Cancelled before processing |
| expired | Quote or pending action expired |

## Deposit Flow

```
Customer selects wallet → chooses method (mobile_money/bank/card/agent)
  → enters amount → system calculates fee & net credit
  → customer confirms (idempotency key)
  → POST /api/v1/wallets/{id}/deposits
  → wallet.available += net (amount − fee)
  → transaction status: completed (demo) or processing (production, pending confirmation)
  → notification generated
```

## Withdrawal Flow

```
Customer selects wallet → chooses method (mobile_money/bank/agent)
  → enters amount → system calculates fee & total debit
  → customer enters PIN → confirms (idempotency key)
  → POST /api/v1/wallets/{id}/withdrawals
  → wallet.available -= total (amount + fee)
  → transaction status: processing (demo may simulate success/failure)
  → if success: status → completed, notification generated
  → if failure: status → failed, funds returned to available
```

## Transfer (Send) Flow

```
Customer selects wallet → selects beneficiary
  → enters amount → gets quote (rate + fee)
  → customer enters PIN → confirms (idempotency key)
  → POST /api/v1/transfers
  → wallet.available -= (amount + fee)
  → transaction status: processing
  → counterparty receives funds (external)
  → status → completed (or failed if external rejection)
  → notification generated
```

## Exchange Flow

```
Customer selects source wallet → selects destination wallet (different currency)
  → enters amount → gets exchange quote (rate, fee, destAmount, expiry 60s)
  → customer confirms within expiry (idempotency key)
  → POST /api/v1/exchange
  → source wallet.available -= totalDebit (amount + fee)
  → dest wallet.available += destAmount
  → transaction type: exchange, channel: fx
  → status: completed (atomic in production)
  → notification generated
```

## Cash-In (Agent → Customer)

```
Agent confirms physical cash receipt from customer
  → enters customer wallet number + amount (idempotency key)
  → POST /api/v1/agent/cash-in
  → customer wallet.available += amount
  → agent float.available -= amount
  → commission earned (0.5% of amount)
  → float movement recorded
  → transaction type: cash_in, channel: agent
  → status: completed
```

## Cash-Out (Customer → Agent, Two-Phase)

```
Phase 1 — Initiate:
  Agent enters customer wallet + amount (idempotency key)
  → POST /api/v1/agent/cash-out
  → customer wallet.available -= amount, wallet.held += amount
  → transaction status: processing
  → no commission, no float movement yet

Phase 2A — Confirm Payout:
  Agent confirms physical cash delivered
  → POST /api/v1/agent/cash-out/{id}/confirm-payout
  → customer wallet.held -= amount
  → agent float.available += amount
  → commission earned (0.5%)
  → float movement recorded
  → transaction status: completed

Phase 2B — Report Failure:
  Agent reports payout failed
  → POST /api/v1/agent/cash-out/{id}/report-payout-failure
  → customer wallet.held -= amount, wallet.available += amount
  → transaction status: failed
  → no commission, no float movement

Phase 2C — Cancel:
  → POST /api/v1/agent/cash-out/{id}/cancel
  → same as failure but status: cancelled
```

## Idempotency

All money-moving operations require an `Idempotency-Key` header (UUID). The server must:

1. Check if the key exists with the same payload → return original result
2. Check if the key exists with different payload → return `409 IDEMPOTENCY_CONFLICT`
3. Store the key → result mapping in a unique-constrained table

## Ledger Entries

Every transaction records ledger lines showing the double-entry:

```
Transfer example:
  Customer wallet: debit 10,500 (10,000 + 500 fee)
  Fee account:     credit 500
  Settlement:      credit 10,000

Exchange example:
  Source wallet:   debit 12,950
  Dest wallet:     credit 100.00 USD
  FX gain/loss:    debit/credit variance
```

## Notification Generation

Notifications are generated automatically on financial events:

| Event | Severity | Category |
|-------|----------|----------|
| Deposit completed | info | transaction |
| Withdrawal completed | info | transaction |
| Withdrawal failed | error | transaction |
| Transfer completed | info | transaction |
| Transfer failed | error | transaction |
| Exchange completed | info | transaction |
| Wallet created | info | wallet |
| Limit exceeded | warning | compliance |
