# AbanRemit Wallet Creation & Currency Model

## Supported Currencies

| Code | Name | Symbol | Precision | Demo Available |
|------|------|--------|-----------|----------------|
| KES | Kenyan Shilling | KSh | 2 | Yes |
| USD | US Dollar | $ | 2 | Yes |
| GBP | British Pound | £ | 2 | Yes |
| EUR | Euro | € | 2 | Yes |
| UGX | Ugandan Shilling | USh | 0 | No |
| TZS | Tanzanian Shilling | TSh | 0 | No |

Currencies with `demoAvailable: false` are listed for reference but cannot be selected in the demo wallet creation flow. Production will gate availability based on customer tier and regulatory permissions.

## Wallet Structure

```typescript
interface Wallet {
  id: string;          // internal ID, never shown as account number
  number: string;      // permanent public wallet account number
  ownerId: string;
  currency: CurrencyCode;
  accountType: "personal" | "business" | "agent";
  status: "active" | "suspended" | "pending_activation";
  available: number;   // integer minor units
  pending: number;     // integer minor units
  held: number;        // integer minor units
}
```

## Wallet Number Generation

Wallet numbers follow the format: `100` + 12 random digits (15 digits total).

The `100` prefix identifies the wallet as a customer personal wallet. Production should use a sequential or assigned range managed by the database to guarantee uniqueness.

## Creation Rules

1. **One wallet per customer per currency**: A customer cannot have two KES wallets. The eligibility check (`wallets.eligibility`) returns `canCreate: false` with `reason: "existing_wallet"` and the existing wallet ID if a wallet for that currency already exists.

2. **Idempotency**: Wallet creation requires an `Idempotency-Key`. If the same key is replayed with the same payload, the original wallet is returned. A different payload with the same key returns `IDEMPOTENCY_CONFLICT`.

3. **KYC gating**: Production must verify the customer's KYC status before allowing wallet creation. Demo allows creation regardless of KYC status but shows a verification alert on the dashboard.

4. **Account type**: Personal customers create `personal` wallets. Business customers create `business` wallets. The account type is derived from the customer's role, not selected during creation.

## Demo FX Rates

The demo uses fixed illustrative rates against KES with a spread:

| Pair | Rate | Inverse |
|------|------|---------|
| USD→KES | 129.50 | KES→USD: 0.00772 |
| GBP→KES | 164.20 | KES→GBP: 0.00609 |
| EUR→KES | 140.80 | KES→EUR: 0.00710 |

A 1.5% spread is applied on exchanges. These rates are for demo only and are clearly labeled as illustrative in the UI.

## Portfolio Valuation

Portfolio total is calculated by converting all wallet balances to the display currency (KES by default) using the demo rates:

```
totalValueMinor = Σ (wallet.available + wallet.pending) × rate(wallet.currency → displayCurrency)
```

The rates used and their last-updated timestamp are displayed alongside the total.

## Exchange Flow

1. Customer selects source and destination wallets
2. Enters amount in source currency
3. System generates an `ExchangeQuote` with:
   - Rate (illustrative, includes spread)
   - Fee (0 in demo)
   - Destination amount
   - Total debit from source
   - Expiry (60 seconds)
4. Customer confirms within the expiry window
5. System posts ledger entries: debit source wallet, credit destination wallet
6. Transaction created with type `exchange`, channel `fx`

## Production Requirements

- FX rates must come from a real rate provider or treasury-managed rate table
- Spread must be configurable per currency pair and customer tier
- Exchange must be atomic (database transaction) — both wallet updates succeed or both fail
- Quote expiry must be enforced server-side
- Idempotency key must have a DB unique constraint
