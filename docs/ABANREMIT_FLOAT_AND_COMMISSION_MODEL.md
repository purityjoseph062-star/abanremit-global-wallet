# AbanRemit Float and Commission Model

## Float Accounts

Each agent has one or more float accounts, one per currency they operate in.

### FloatAccount Fields
- `id` — unique identifier
- `agentId` — owning agent profile
- `currency` — KES, USD, GBP, EUR, UGX, TZS
- `allocated` — total amount allocated by operations
- `available` — current spendable balance
- `lastUpdated` — timestamp of last movement

### Float Lifecycle

```
[Operations allocates float]
        ↓
FloatAccount created: allocated = X, available = X
        ↓
[Cash-in performed]  → available decreases (agent gives out cash, float drops)
[Cash-out performed] → available increases (agent receives cash, float rises)
[Replenishment requested] → NO balance change (request is pending approval)
[Replenishment approved & allocated] → available increases (operations-side action)
```

### Key Rule: Replenishment ≠ Balance Change

A replenishment request creates a `ReplenishmentRequest` record with status `pending_approval`. It does NOT modify the float account balance. Only when operations approves and processes the allocation does the float account balance change. This prevents agents from spending float they don't have.

### Low Float Warning

When `available < allocated * 0.20`, the float account is flagged as low. The dashboard and float page display warnings prompting the agent to request replenishment.

## Float Movements

Every balance-changing event creates a `FloatMovement` record:

| Field | Description |
|-------|-------------|
| `id` | Unique ID |
| `reference` | Human-readable reference (FM-xxx) |
| `accountId` | Float account this movement belongs to |
| `currency` | Currency of the movement |
| `movementType` | `initial_allocation`, `cash_in_movement`, `cash_out_movement`, `agent_withdrawal`, `replenishment` |
| `amount` | Amount moved (positive = float increases, negative = float decreases) |
| `previousBalance` | Balance before this movement |
| `resultingBalance` | Balance after this movement |
| `initiator` | Who triggered the movement (agent code) |
| `status` | `completed`, `pending` |
| `txId` | Related transaction ID (if applicable) |
| `createdAt` | Timestamp |

### Movement Types

| Type | Direction | Trigger |
|------|-----------|---------|
| `initial_allocation` | + | Operations assigns float to agent |
| `cash_in_movement` | − | Agent performs cash-in (gives customer wallet credit, float drops) |
| `cash_out_movement` | + | Agent confirms cash-out payout (receives cash, float rises) |
| `agent_withdrawal` | − | Agent withdraws float to bank |
| `replenishment` | + | Operations approves replenishment request |

## Commission Model

### CommissionEntry Fields
- `id`, `reference` — identifiers
- `txId`, `txReference` — linked transaction
- `txType` — `cash_in` or `cash_out`
- `agentId` — earning agent
- `currency` — commission currency
- `txAmount` — original transaction amount
- `commissionRate` — rate applied (0.005 = 0.5%)
- `commissionAmount` — calculated commission
- `status` — `earned`, `settled`
- `createdAt` — when commission was earned

### Commission Lifecycle

```
[Transaction completed] → CommissionEntry created (status: earned)
                                    ↓
                        [Settlement processed by operations]
                                    ↓
                        CommissionEntry updated (status: settled)
                        Settlement record created (type: commission_payout)
```

### Commission Summary

The `commissionSummary()` endpoint returns:
- `earnedToday` — total commission earned today (all currencies)
- `earnedThisMonth` — total commission earned this month
- `pendingSettlement` — sum of commissions with status `earned`
- `settledTotal` — sum of commissions with status `settled`
- `byCurrency` — per-currency breakdown

### Rate

- Demo rate: `0.005` (0.5%)
- Applied to transaction amount (excluding fees)
- Generated only on `completed` transactions
- Cash-out commissions are generated at payout confirmation, not at initiation

## Settlements

Settlements represent money moving between the agent and AbanRemit operations:

| Type | Description |
|------|-------------|
| `commission_payout` | Operations pays out earned commissions to agent |
| `float_topup` | Operations tops up agent float (approved replenishment) |

### Settlement Fields
- `id`, `reference`
- `agentId`
- `type` — `commission_payout` or `float_topup`
- `amount`, `currency`
- `periodStart`, `periodEnd` — period the settlement covers
- `status` — `pending`, `completed`
- `createdAt`
