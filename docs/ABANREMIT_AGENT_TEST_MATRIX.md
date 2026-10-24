# AbanRemit Agent Test Matrix

## Test Categories

### 1. Authentication & Access Control

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Agent can access dashboard | Sign in as agent, navigate to `/agent` | Dashboard loads with metrics |
| Customer cannot access agent portal | Sign in as customer, navigate to `/agent` | Redirected to login or access denied |
| Outlet manager sees extended nav | Sign in as outlet_manager | Sidebar shows staff/outlet management items |
| Standard agent does not see extended nav | Sign in as agent | Sidebar hides staff/outlet management items |
| Inactive agent blocked from cash-in | Set agent operating status to suspended, attempt cash-in | Error: "Agent is not active" |

### 2. Cash-In

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Successful cash-in | Search customer → select wallet → enter amount → confirm | Transaction completed, customer wallet credited, agent float debited, commission earned |
| Insufficient float | Enter amount exceeding float balance | Error: "Available float is X" |
| Inactive customer wallet | Select wallet with non-active status | Wallet shown as disabled, cannot select |
| Amount validation | Enter 0 or negative | Review button disabled / error |
| Single tx limit exceeded | Enter amount > 10,000,000 | Error: "Exceeds agent single-transaction limit" |
| Idempotency replay | Submit same idempotency key twice | Same transaction returned, no duplicate |
| Customer wallet selection | Select customer → verify wallets listed | Only that customer's wallets shown (not agent's) |

### 3. Cash-Out (Two-Phase)

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Successful cash-out full flow | Initiate → confirm payout | Transaction completed, customer debited, agent float credited, commission earned |
| Insufficient customer funds | Enter amount + fee > customer balance | Error: "Available balance is X" |
| Report payout failure | Initiate → report failure | Held funds released, status=failed, no commission |
| Cancel cash-out | Initiate → cancel | Held funds released, status=cancelled |
| Confirm payout on non-processing tx | Attempt confirm on completed tx | Error: "Cash-out is already completed" |
| Fee calculation | Enter amount X | Fee = X * 0.01, total debit = X + fee |
| Idempotency on initiate | Submit same key twice | Same transaction returned |

### 4. Float Management

| Test | Steps | Expected Result |
|------|-------|-----------------|
| View float accounts | Navigate to float page | Shows agent's float accounts with balances |
| Float ledger matches transactions | Compare ledger entries to transactions | Every cash-in/cash-out has corresponding movement |
| Request replenishment | Submit request with amount and reason | Request created with status=pending_approval, balance unchanged |
| Cancel pending replenishment | Cancel a pending request | Status=cancelled |
| Low float warning | Float < 20% of allocated | Warning displayed on dashboard and float page |

### 5. Commissions

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Commission on cash-in | Perform cash-in | Commission entry created, status=earned, amount = 0.5% |
| Commission on cash-out confirm | Complete cash-out | Commission entry created at payout confirmation |
| No commission on failed cash-out | Report payout failure | No commission entry created |
| Commission summary | View commissions page | Summary cards show correct totals |
| Commission filter | Filter by status/currency | Filtered results match criteria |

### 6. Reconciliation

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Balanced reconciliation | Enter reported closing = system closing | Status=balanced, variance=0 |
| Variance flagged | Enter reported closing ≠ system closing | Status=variance_flagged, variance shown |
| Explanation required | Submit variance without explanation | Validation error |

### 7. Reports

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Date range report | Select date range, view summary | Per-currency breakdown shown |
| CSV export | Click export | CSV file downloads with correct data |

### 8. Support Tickets

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Create ticket | Fill category, subject, description | Ticket created with status=open |
| Reply to ticket | Add message to existing ticket | Message appended to conversation |
| View ticket history | Open ticket detail | Full conversation shown |

### 9. Single Source of Truth

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Dashboard matches transactions | Perform cash-in, check dashboard | Today's volume includes new transaction |
| Float ledger matches float balance | Perform cash-in, check float page | Movement entry exists, balance updated |
| Commission ledger matches transactions | Perform cash-in, check commissions | New commission entry exists |
| Transaction list matches dashboard | Compare dashboard pending count to transaction list | Counts match |

### 10. Notifications

| Test | Steps | Expected Result |
|------|-------|-----------------|
| Cash-in notification | Perform cash-in | Notification appears with category=transaction, severity=info |
| Cash-out processing notification | Initiate cash-out | Notification with severity=warning |
| Cash-out failure notification | Report payout failure | Notification with severity=error |
| Mark read | Click mark read on notification | Notification marked as read |
