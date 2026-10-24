# AbanRemit Agent Financial Lifecycle

## Cash-In Lifecycle

```
[Agent searches customer] → [Selects wallet] → [Enters amount] → [Confirms cash receipt]
                                                                          ↓
                                                                    POST /agent/cash-in
                                                                          ↓
                                                    ┌──────────────────────────────────┐
                                                    │ Server validates:                │
                                                    │  • Agent operating status active │
                                                    │  • Customer wallet active        │
                                                    │  • Amount > 0                    │
                                                    │  • Amount ≤ single-tx limit      │
                                                    │  • Float sufficient              │
                                                    └──────────────────────────────────┘
                                                                          ↓
                                                    ┌──────────────────────────────────┐
                                                    │ Atomic state changes:            │
                                                    │  • Customer wallet +amount       │
                                                    │  • Agent float -amount           │
                                                    │  • Commission entry (earned)     │
                                                    │  • FloatMovement (cash_in)       │
                                                    │  • Transaction (completed)       │
                                                    └──────────────────────────────────┘
                                                                          ↓
                                                                    [Receipt available]
```

**Status**: Single-phase. Transaction is `completed` immediately upon confirmation.

## Cash-Out Lifecycle (Two-Phase)

```
PHASE 1: INITIATE
[Agent searches customer] → [Selects wallet] → [Enters amount] → [Review] → [Initiate]
                                                                                ↓
                                                                    POST /agent/cash-out
                                                                                ↓
                                                    ┌──────────────────────────────────┐
                                                    │ Server validates:                │
                                                    │  • Agent active                  │
                                                    │  • Customer wallet active        │
                                                    │  • Customer balance ≥ amount+fee │
                                                    │  • Amount ≤ single-tx limit      │
                                                    └──────────────────────────────────┘
                                                                                ↓
                                                    ┌──────────────────────────────────┐
                                                    │ State changes:                   │
                                                    │  • Customer available -total     │
                                                    │  • Customer held +total          │
                                                    │  • Transaction (processing)      │
                                                    │  • NO commission yet             │
                                                    │  • NO float movement yet         │
                                                    └──────────────────────────────────┘
                                                                                ↓
                                                           [Awaiting payout confirmation]

PHASE 2A: CONFIRM PAYOUT
[Agent confirms physical cash handed to customer]
                ↓
POST /agent/cash-out/{txId}/confirm-payout
                ↓
                                                    ┌──────────────────────────────────┐
                                                    │ State changes:                   │
                                                    │  • Customer held -total          │
                                                    │  • Agent float +amount           │
                                                    │  • Commission entry (earned)     │
                                                    │  • FloatMovement (cash_out)      │
                                                    │  • Transaction (completed)       │
                                                    └──────────────────────────────────┘

PHASE 2B: REPORT PAYOUT FAILURE
[Agent reports cash could not be paid]
                ↓
POST /agent/cash-out/{txId}/report-payout-failure
                ↓
                                                    ┌──────────────────────────────────┐
                                                    │ State changes:                   │
                                                    │  • Customer held -total          │
                                                    │  • Customer available +total     │
                                                    │  • Transaction (failed)          │
                                                    │  • NO commission                 │
                                                    │  • NO float movement             │
                                                    └──────────────────────────────────┘
```

**Why two-phase?** Prevents premature financial completion. The agent must physically hand cash to the customer before the debit is finalized. If the customer doesn't show up or refuses, funds are released back — no money lost.

## Transaction Statuses

| Status | Cash-In | Cash-Out | Meaning |
|--------|:-------:|:--------:|---------|
| `pending` | — | Initial | Request created |
| `processing` | — | Phase 1 done | Funds held, awaiting payout |
| `completed` | Final | Phase 2A | Fully settled, ledger posted |
| `failed` | — | Phase 2B | Payout failed, funds released |
| `cancelled` | — | Cancelled | Agent cancelled, funds released |

## Idempotency

All money-moving operations (`cashIn`, `cashOut`) require an `Idempotency-Key` header. If the same key is replayed, the original transaction is returned without side effects. Different payload with same key returns `IDEMPOTENCY_CONFLICT`.

## Commission Generation

- **Rate**: 0.5% of transaction amount (demo)
- **Cash-in**: Commission generated immediately on completion
- **Cash-out**: Commission generated only on payout confirmation (Phase 2A)
- **No commission** on: failed, cancelled, or processing transactions
- Commission status starts as `earned`, moves to `settled` when paid out via settlement

## Fees

| Operation | Fee | Who Pays |
|-----------|-----|----------|
| Cash-in | 0 | No fee |
| Cash-out | 1% of amount (added on top) | Customer pays (debited from wallet) |

## Single Transaction Limit

- `AGENT_SINGLE_TX_LIMIT = 10,000,000` (minor units)
- Exceeding this requires supervisor/outlet manager approval (not yet implemented)
