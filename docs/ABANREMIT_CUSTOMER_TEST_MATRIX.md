# AbanRemit Customer Test Matrix

## Wallet Management

| ID | Test | Steps | Expected Result |
|----|------|-------|-----------------|
| CW-01 | Create KES wallet | Dashboard → New wallet → Select KES → Review → Confirm | Wallet created with 15-digit number, appears in wallet list |
| CW-02 | Create USD wallet | Repeat with USD | Wallet created, balance in USD |
| CW-03 | Create GBP wallet | Repeat with GBP | Wallet created |
| CW-04 | Create EUR wallet | Repeat with EUR | Wallet created |
| CW-05 | Duplicate wallet prevention | Try creating second KES wallet | Eligibility check blocks, shows existing wallet link |
| CW-06 | Idempotency on create | Submit same idempotency key twice | Same wallet returned, no duplicate |
| CW-07 | Wallet details page | Click wallet → View details | Shows balance, actions, transaction history |
| CW-08 | Statement export | Wallet details → Export CSV | CSV downloads with opening/closing balance and lines |

## Dashboard

| ID | Test | Steps | Expected Result |
|----|------|-------|-----------------|
| CD-01 | Portfolio total displays | Load dashboard | Total value in KES with FX rates shown |
| CD-02 | Portfolio multi-currency | Create USD + GBP wallets, fund them | Total converts all to KES using demo rates |
| CD-03 | Action grid navigation | Click each of 6 action buttons | Navigates to correct page |
| CD-04 | Recent activity | Load dashboard | Shows latest 5 transactions |
| CD-05 | Pending transactions | Have a processing transaction | Shows in pending section |
| CD-06 | Verification alert | KYC not approved | Alert banner visible |
| CD-07 | Empty wallet state | No wallets exist | Shows empty state with create link |

## Currency Exchange

| ID | Test | Steps | Expected Result |
|----|------|-------|-----------------|
| CE-01 | Exchange KES→USD | Exchange → Select KES source, USD dest → Enter amount → Confirm | Source debited, dest credited, receipt shown |
| CE-02 | Exchange USD→KES | Reverse direction | Correct inverse rate applied |
| CE-03 | Quote expiry | Wait 60+ seconds after quote | Quote expired, must re-quote |
| CE-04 | Same currency blocked | Select KES for both | Cannot proceed |
| CE-05 | Insufficient funds | Exchange more than available | Error shown, cannot proceed |
| CE-06 | Idempotency on exchange | Submit same key twice | Same result, no double debit |
| CE-07 | Receipt download | After exchange → Download | Receipt file downloads |

## Beneficiaries

| ID | Test | Steps | Expected Result |
|----|------|-------|-----------------|
| CB-01 | Add wallet beneficiary | Beneficiaries → Add → type wallet, KES | Saved, appears in list |
| CB-02 | Add bank beneficiary | type bank, with provider | Saved, appears in list |
| CB-03 | Add mobile money beneficiary | type mobile_money, with provider | Saved |
| CB-04 | Edit beneficiary | Click edit icon → change name → save | Updated, toast shown |
| CB-05 | Cancel edit | Click edit → Cancel edit | Form resets to add mode |
| CB-06 | Delete beneficiary | Click delete → confirm | Removed, toast shown |
| CB-07 | Validation errors | Submit with empty name | Zod validation errors shown |

## Transactions

| ID | Test | Steps | Expected Result |
|----|------|-------|-----------------|
| CT-01 | Transaction list | Load transactions page | All transactions shown |
| CT-02 | Filter by type | Select type filter | Only matching types shown |
| CT-03 | Filter by status | Select status filter | Only matching statuses shown |
| CT-04 | Search | Enter search term | Results filtered by reference/counterparty |
| CT-05 | Date range filter | Select from/to dates | Only transactions in range shown |
| CT-06 | CSV export | Click export | CSV downloads |
| CT-07 | Pagination | More than page size | Pagination controls work |

## Account Pages

| ID | Test | Steps | Expected Result |
|----|------|-------|-----------------|
| CA-01 | Notifications list | Load notifications | Shows notifications with read/unread state |
| CA-02 | Mark notification read | Click notification | Marked as read, unread count updates |
| CA-03 | Limits display | Load limits page | Shows all 4 limit types with currency |
| CA-04 | Limits verification warning | KYC not approved | Warning shown |
| CA-05 | Create support ticket | Support → New ticket → fill → submit | Ticket created, appears in list |
| CA-06 | Reply to ticket | Open ticket → type reply → send | Message added to thread |
| CA-07 | Security page | Load security | Shows 2FA toggle, sessions, events |
| CA-08 | Settings page | Load settings | Shows display currency, notification prefs |
| CA-09 | Verification page | Load verification | Shows KYC status and progress steps |

## Navigation & Guards

| ID | Test | Steps | Expected Result |
|----|------|-------|-----------------|
| CN-01 | Sidebar navigation | Click each sidebar item | Correct page loads |
| CN-02 | Mobile bottom nav | Resize to mobile | Bottom nav appears, sidebar hidden |
| CN-03 | Permission guard | Attempt restricted route | Redirected or blocked |
| CN-04 | Portal shell renders | Load any portal page | Sidebar + content area render correctly |
