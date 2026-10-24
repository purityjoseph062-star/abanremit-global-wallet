# AbanRemit Reconciliation Model

## Purpose

Daily reconciliation ensures the agent's reported cash position matches the system's calculated position. It is the agent's end-of-day accountability checkpoint.

## Reconciliation Fields

| Field | Description |
|-------|-------------|
| `id` | Unique identifier |
| `reference` | Human-readable reference (REC-xxx) |
| `agentId` | Agent who performed the reconciliation |
| `businessDate` | The business day being reconciled (YYYY-MM-DD) |
| `currency` | Currency being reconciled |
| `openingBalance` | Float balance at start of business day |
| `closingBalance` | System-calculated closing balance |
| `reportedClosing` | Agent's reported physical cash count |
| `variance` | `reportedClosing - closingBalance` |
| `status` | `balanced`, `variance_flagged`, `under_review` |
| `explanation` | Agent's explanation if variance exists |
| `createdAt` | When reconciliation was submitted |

## Reconciliation Flow

```
[Agent ends business day]
        ↓
[Agent counts physical cash on hand]
        ↓
[Agent enters: business date, currency, reported closing balance, explanation]
        ↓
POST /agent/reconciliations
        ↓
        ┌─────────────────────────────────────────────┐
        │ Server calculates:                          │
        │  1. openingBalance = float at day start     │
        │  2. Sum today's cash-in movements (−)       │
        │  3. Sum today's cash-out movements (+)      │
        │  4. closingBalance = opening + cashouts −   │
        │     cashins                                 │
        │  5. variance = reportedClosing −            │
        │     closingBalance                          │
        └─────────────────────────────────────────────┘
        ↓
   variance === 0?
    ├── YES → status: balanced
    └── NO  → status: variance_flagged, explanation required
              (operations team reviews)
```

## Variance Scenarios

| Variance | Meaning | Action |
|----------|---------|--------|
| 0 | Balanced | No action needed |
| Positive | Agent has MORE cash than system expects | Possible unrecorded cash-in, or previous day carryover |
| Negative | Agent has LESS cash than system expects | Possible unrecorded cash-out, theft, or counting error |

## Status Lifecycle

```
balanced           → Reconciliation accepted, no issues
variance_flagged   → Variance detected, awaiting operations review
under_review       → Operations is investigating the variance
```

## Rules

- One reconciliation per (agent, businessDate, currency) combination
- Cannot reconcile a future date
- Explanation is required when variance ≠ 0
- Reconciliation does not modify float balances — it is a reporting/audit function only
- The system-calculated closing balance is derived from the same `floatMovements` ledger that drives the dashboard and float page — no separate calculation exists

## Dashboard Integration

The dashboard shows the last reconciliation status. If today's reconciliation hasn't been submitted, a reminder appears.
