# AbanRemit Global Wallet

# ABANREMIT — MASTER PRODUCT BUILD SPECIFICATION

## Mission

Build AbanRemit from scratch as a premium, fully interactive international digital wallet and remittance platform.

The frontend must be implemented completely in Lovable before live financial integrations are enabled. The backend will be Laravel 13 with PHP 8.4 and a PostgreSQL database. React and TypeScript will power the web application.

The product should combine the usability, transparent pricing and multi-currency experience associated with leading international money-transfer products with an original AbanRemit brand and a comprehensive wallet, agent and administration ecosystem.

This is a functional demonstration, not a static Figma-like mockup. All intended demo interactions must work. Never represent simulated funds, verification, payments or provider responses as real.

## 1. Technology and architecture

- React, TypeScript and Vite.
- Tailwind CSS and a consistent reusable component system.
- React Router for navigation.
- React Hook Form and Zod for form validation.
- TanStack Query for server-state integration readiness.
- A typed, centralized API client.
- Separate API service modules for authentication, wallets, transfers, beneficiaries, payments, statements, KYC, agents, administration and compliance.
- Versioned REST API base path: /api/v1.
- Laravel 13 and PHP 8.4 as the planned backend.
- PostgreSQL as the authoritative database.
- Redis for queues, rate limiting and appropriate caching.
- OpenAPI 3.1 as the API contract format.

Do not scatter mock responses throughout components. Build a DemoApiAdapter and a LaravelApiAdapter implementing the same typed interfaces. Use environment configuration to select the adapter. Demo mode must work without a Laravel server. Production mode must not silently fall back to fake data when the API is unavailable.

Never place provider secrets, privileged credentials or real payment signing keys in frontend code.

## 2. Product design

Create an original, premium AbanRemit design system.

Design goals:
- Beautiful, clean, confident and trustworthy financial-product interface.
- Responsive desktop, tablet and mobile layouts.
- Refined typography, generous spacing, excellent alignment and consistent iconography.
- Thoughtful light theme and optional dark theme.
- Accessible contrast, keyboard navigation, visible focus states and semantic forms.
- Polished loading, empty, error, success, pending and disabled states.
- Responsive tables that transform appropriately on small screens.
- Subtle purposeful transitions, not excessive animation.
- Consistent navigation, breadcrumbs, dialogs, toast notifications and confirmation screens.
- Currency formatting and locale-aware date/number formatting.
- Clearly distinguishable demo-mode banner and simulated transaction references.

Create a cohesive logo treatment and brand identity for AbanRemit. Avoid copying another company's branding, exact screen layouts or proprietary assets.

## 3. Public website

Implement:
- Homepage with product explanation and clear calls to action.
- Personal wallet features.
- International transfers and supported corridors information.
- Business and agent services.
- Transparent fees and exchange-rate explanation.
- Security and customer protection page.
- Help centre and frequently asked questions.
- Contact and support form.
- Terms, privacy and legal placeholder pages clearly marked for legal review.
- Login, registration and password recovery.
- Responsive footer and navigation.

Do not claim that unsupported countries, currencies or payment methods are available.

## 4. Authentication and onboarding

Create complete interactive flows for:
- Registration as personal customer, business customer or agent applicant.
- Country selection and international telephone input.
- Email and phone verification screens.
- Login, logout, password reset and session-expiry handling.
- Optional MFA demonstration.
- Legal name, date of birth, nationality and residence information.
- Identity document type and secure-upload interface.
- KYC status, review progress, missing-document requests and resubmission.
- Onboarding progress indicator and appropriate validation.

Use fictional seed identities and simulated OTP verification in demo mode. Clearly mark the simulated flow. Never collect real identity documents in the frontend demo.

Model the states: draft, submitted, pending_review, additional_information_required, approved and rejected. Wallet activation and transaction capabilities must depend on the appropriate configured verification state.

## 5. Customer portal

Build every screen with functioning navigation and coherent demo data.

### Dashboard
- Total balance with currency context.
- Individual currency wallet cards.
- Unique wallet account number with copy action.
- QR receive preview.
- Send, receive, add money, withdraw and exchange shortcuts.
- Recent activity.
- Pending transactions and notifications.
- Exchange-rate preview and clear demo indicators.

### My wallets
- List currency wallets.
- Wallet details and transaction history.
- Create an eligible currency wallet.
- Display wallet number, currency, status and account type.
- Copy number and open receive-money options.
- Show available, pending and held amounts separately.
- Support empty and suspended states.

Use an illustrative number such as 100000284751 only as demo data. Account numbers must be modeled separately from internal database IDs. The actual Laravel backend will generate and uniquely enforce permanent wallet numbers.

### Send money
Implement a multi-step transfer wizard:
1. Choose wallet and source currency.
2. Select or create a recipient.
3. Choose wallet, bank, mobile-money or international payout route where enabled in demo configuration.
4. Enter amount and recipient details.
5. Calculate illustrative fee and FX quote.
6. Display sender total, recipient amount, exchange rate, fee and quote expiry.
7. Show a full confirmation screen.
8. Require simulated authorization.
9. Create a demo transaction with an idempotency reference.
10. Show processing or completed state and a downloadable demo receipt.

Support validation, cancel, back, retry, duplicate-submit protection and failure scenarios.

### Receive money
- Display wallet number.
- Copy account number.
- QR code preview with non-sensitive receive identifier.
- Payment request form.
- Shareable demo receive instructions.
- Incoming transaction history.

### Add money
Create selectable card, bank transfer, mobile-money and agent cash-in methods, each with its own form, status handling and demo disclaimer.

Do not collect or persist real card details. Use test-only placeholders.

### Withdraw
- Choose eligible withdrawal method.
- Select verified destination.
- Enter amount.
- Show fee and total debit.
- Confirm and authenticate.
- Track pending, processing, completed, failed and reversed states.

### Beneficiaries
- List, search, create, edit and delete saved recipients.
- Support recipient types for internal wallets, banks and mobile money.
- Validate destination details.
- Show verification state and recent transfers.
- Require confirmation before destructive actions.

### Transactions and payments
- Searchable transaction list.
- Filters for date, type, currency, status and channel.
- Pagination.
- Transaction details and status timeline.
- Reference, fee, FX rate, sender and recipient information when authorized.
- Linked receipt, refund or reversal details when applicable.

### E-statements
- Choose currency and date range.
- Filter and preview transactions.
- Export a functioning demo CSV.
- Generate a printable or downloadable demo statement.
- Show statement generation progress and error states.

Statements must be designed for future ledger-derived data. Never treat editable display balances as accounting records.

### Currency exchange
- Currency-pair selector.
- Amount entry.
- Buy and sell quote presentation.
- Illustrative rate, spread, fee and recipient amount.
- Quote freshness and expiry.
- Explicit conversion confirmation.
- Transaction history.

Use clearly labelled fictional demo rates unless connected to a configured rate provider. Never present seeded values as live market rates.

### KYC and security
- Verification progress.
- Document checklist.
- Additional information requests.
- Session and device list demonstration.
- Password update form.
- PIN management demonstration.
- MFA preferences.
- Notification preferences.
- Account limits display.
- Security activity history.

### Support and disputes
- Searchable help centre.
- Contact support form.
- Complaint and dispute submission.
- Case list and detail view.
- Transaction tracing form.
- Status updates and response history.

## 6. Agent portal

Create a distinct agent experience with separate demo role and permissions.

Include:
- Agent dashboard and outlet profile.
- Agent account number.
- Wallet and available float.
- Cash-in workflow.
- Cash-out workflow.
- Transaction history and receipts.
- Daily and monthly totals.
- Commission history.
- Pending settlements.
- Reconciliation reports.
- Outlet status and transaction limits.

Cash-in demo flow:
1. Find a fictional customer by wallet number or verified phone.
2. Show only privacy-approved identity information.
3. Enter amount and applicable fee.
4. Confirm that cash has been received.
5. Simulate an authorized cash-in.
6. Show customer credit and agent float effects as a demo journal.
7. Generate a reference and receipt.

Cash-out demo flow:
1. Validate a customer request or authorized withdrawal reference.
2. Check status, expiry, limits and available agent float.
3. Simulate required customer authentication.
4. Confirm cash disbursement.
5. Finalize the demo transaction and commission.
6. Generate a receipt.

Implement duplicate-submit prevention, role checks, float limits and a blocked exceptional-transaction approval flow. Agents must never approve their own exceptional transactions.

Every cash movement must display a DEMO label and must not represent real cash as having been received or dispensed.

## 7. Administration portal

Build a separate administrative layout with role-aware navigation.

### Overview
- Customer and wallet counts.
- Transaction volume and value.
- Pending payment operations.
- KYC review queue.
- Agent activity.
- Reconciliation exceptions.
- Risk alerts.
- Recent audit events.

Use clearly identified fictional seed metrics.

### Customer management
- Search, filters and pagination.
- Customer profile and authorized wallet summary.
- KYC state and risk status.
- Restrictions and review history.
- Authorized transaction history.
- Support case links.

### Wallet operations
- Search wallet numbers.
- View status, currency and permitted account details.
- Inspect available, held and pending balances.
- View ledger history and holds.
- Request an adjustment through a controlled workflow.
- Require reason, evidence placeholder, authorized approver and audit record.
- Never expose an unprotected direct balance-edit control.

### Payment operations
- Transfers, deposits, withdrawals and remittances.
- Pending, processing, completed, failed and reversed transactions.
- Provider reference display.
- Simulated callback event history.
- Retry eligibility and failure explanations.
- Refund and reversal request workflows.
- Settlement and reconciliation queue.

### Agent management
- Agent applications and approvals.
- Outlet details and verification status.
- Float and transaction limits.
- Commission rules and earned commission history.
- Settlement status.
- Suspend and reactivate workflow with reason and audit entry.

### Compliance and risk
- KYC review queue.
- Sanctions and PEP screening result placeholders.
- Risk alerts and case management.
- Transaction investigation.
- Restriction history.
- Suspicious activity review placeholder.
- Role-restricted case notes and audit logs.

### Configuration
- Supported countries and corridors.
- Currencies and precision.
- Payment methods and provider capabilities.
- Fee schedules.
- Transaction limits.
- FX quote settings.
- Commission policies.
- Notification templates.
- Roles and permissions.

Configuration changes must have validation, confirmation and an audit trail in demo mode.

## 8. Roles and access control

Support:
- Customer.
- Business customer.
- Agent.
- Support officer.
- Compliance officer.
- Payment operations officer.
- Finance/treasury officer.
- Administrator.
- Super administrator.

Use a central permissions model. Do not merely hide navigation links: route guards and action-level authorization must also be implemented in the frontend demo, with equivalent enforcement required by Laravel.

A user must not access another customer's private records by changing a URL or object identifier.

Sensitive actions must show the required authorization, confirmation and audit workflow.

## 9. Laravel API matrix

Create the following version-controlled documentation:
- docs/ABANREMIT_PRODUCT_SPEC.md
- docs/ABANREMIT_ARCHITECTURE.md
- docs/ABANREMIT_API_MATRIX.md
- docs/ABANREMIT_OPENAPI.yaml
- docs/ABANREMIT_DATA_MODEL.md
- docs/ABANREMIT_ROLE_PERMISSION_MATRIX.md
- docs/ABANREMIT_PAYMENT_LIFECYCLE.md
- docs/ABANREMIT_DEMO_VS_PRODUCTION.md
- docs/ABANREMIT_TEST_ACCEPTANCE_MATRIX.md
- docs/ABANREMIT_INTEGRATION_GAPS.md

Use /api/v1 as the API base path.

For every endpoint document:
- Unique endpoint ID.
- HTTP method and path.
- Purpose and frontend screen/action.
- Authentication requirement.
- Required role and permission.
- Path, query and body parameters.
- Request JSON schema and validation.
- Success response schema.
- Error responses.
- Pagination and filtering behavior.
- Idempotency requirement.
- Rate limits.
- Sensitive-data considerations.
- Database and ledger side effects.
- Payment lifecycle behavior.
- Audit requirements.
- Test scenarios.
- Current implementation status.

Cover auth, registration, OTP, profiles, KYC, wallets, wallet account numbers, balances, ledger statements, beneficiaries, transfer quotes, internal transfers, deposits, withdrawals, payment requests, external providers, FX, agents, cash-in/out, commissions, settlements, reconciliation, disputes, notifications, security, admin operations, compliance and audit logs.

Create a frontend action-to-endpoint mapping. Every user-facing operation must map to a defined service method and contract. Mark demo-only actions explicitly.

Use standard JSON response envelopes, consistent error codes, pagination conventions, validation errors and correlation IDs. Use OpenAPI schemas rather than undocumented payloads.

## 10. Financial integrity requirements

Design all financial screens and contracts around these rules:
- Permanent unique wallet numbers, separate from internal IDs.
- Double-entry ledger.
- Balanced journal entries.
- Atomic financial posting.
- Immutable posted entries.
- Explicit pending, processing, posted, failed, cancelled and reversed lifecycle semantics.
- Idempotency keys for money-moving requests.
- Provider callbacks authenticated and deduplicated.
- Server-side calculation of balances, fees and exchange amounts.
- Currency-aware decimal precision and safe monetary arithmetic.
- No negative available balance unless an explicitly approved product rule permits it.
- Balance reservations for in-flight operations.
- Safe reversals instead of editing posted entries.
- Independent reconciliation of providers and agent settlements.
- Audit logs for sensitive administrative actions.
- Consistent locking and concurrency protection.

The frontend must never calculate an authoritative balance or determine that an external payment has settled.

## 11. Demo data and persistence

Create a coherent, fictional seed dataset for all roles and portals.

The demo must support:
- Switching between explicitly labelled demo personas.
- Persistent demo state across refreshes.
- Creating and editing beneficiaries.
- Navigating through transaction workflows.
- Generating unique demo references.
- Viewing simulated ledger effects.
- Filtering transactions and reports.
- Exporting demo CSV and printable statements.
- Simulating success, pending, rejection, timeout and reversal scenarios.
- Resetting demo data to its original state.

Do not use real customer data, real identity documents, real provider credentials or live payment APIs. Keep demo storage isolated from production storage.

If local storage is used, make it clear that it is only a demo persistence mechanism and must never store secrets or sensitive identity documents.

## 12. Definition of done

Do not declare completion until:
- Every listed route exists and renders correctly.
- Every navigation link leads to a functional destination.
- Every visible button performs a meaningful action.
- All forms validate and show actionable errors.
- All tables support their promised search, filtering and pagination.
- All money movement demos include confirmation, status tracking and receipts.
- All roles have tested route and action restrictions.
- All portal screens use consistent shared components.
- The frontend compiles without TypeScript errors.
- Tests cover primary workflows, failures and duplicate submissions.
- The API matrix covers every implemented user action.
- The OpenAPI document agrees with the typed frontend contracts.
- Demo and production modes are clearly separated.
- No dead buttons, fake live balances, broken links or undocumented API dependencies remain.

## Execution instructions

Work incrementally through the complete product. First establish the design system, route inventory, typed domain models, API adapter interfaces and documentation structure. Then implement the portals and workflows, testing each module as it is completed.

Do not stop after generating the landing page or dashboard. Do not replace missing modules with empty placeholder pages. Do not claim a backend endpoint is implemented merely because the frontend has a mock adapter.

The final deliverable is a beautiful, coherent, fully interactive AbanRemit demo and a complete Laravel API integration contract that a backend engineer can implement without guessing what each screen expects.### 2\. Unique wallet account number

Every customer should receive a permanent, unique wallet account number immediately after successful registration.

### My Digital Wallet

Personal account

Active

Unique Wallet Account Number

### 100000284751

  Copy

Wallet currency

### KES

Account type

### Personal

Illustrative account number and balances; this is a design example, not a real wallet.

### Account-number requirements

* Generate account numbers automatically using a secure, unique numbering service.

* Never assign the same number to two customers.

* Allow customers to share the number to receive funds.

* Support wallet lookup by account number, subject to privacy controls.

* Support multiple currency wallets under one customer profile.

* Keep the wallet account number separate from the internal database ID.

* Allow business and agent wallets to have their own account numbers.

* Never recycle account numbers belonging to closed accounts.

### 3\. Complete money movement functionality

The application must support the following payment routes.

Wallet to wallet

Send money using an account number, phone number, QR code or saved beneficiary.

Wallet to bank

Transfer to linked or newly verified bank accounts through supported banking partners.

Wallet to mobile money

Send to supported mobile-money numbers and providers in enabled countries.

Cash-in through agents

An authorized agent accepts cash and credits the customer's wallet after confirming receipt of funds.

Cash-out through agents

A verified customer requests a withdrawal, and the agent dispenses cash after authorization.

Card and bank deposits

Fund wallets using supported debit or credit cards and bank transfer/payment integrations.

The platform should also allow direct transfers from one bank or mobile-money account to another through the connected providers, even where the money does not first enter the customer's wallet.

Important: Every payment route must check the source of funds, recipient details, limits, fees, transaction status and provider confirmation before finalizing the ledger entries.

### 4\. Registration and customer verification

Registration should support international customers and agents.

### Registration form

### Registration form preview

Interactive example of the fields to include in the application. This form does not create a real account or submit personal information.

Account type

Personal customer

Business customer

Money transfer agent

Country of registration🇰🇪 Kenya

Full legal name

Mobile number

Email address

Identity document

Passport

National ID

Residence permit / alien ID

Preferred wallet currencyKES — Kenyan shilling

Use these settings for the technical specification

### Identity verification stages

* Verify phone number by OTP.

* Verify email where required.

* Collect legal name, date of birth, nationality and residence details.

* Collect the passport or other permitted identity document.

* Perform document verification and selfie/liveness checks where appropriate.

* Screen for sanctions, politically exposed persons and applicable risk indicators.

* Assign KYC level and transaction limits.

* Activate the wallet after all required checks are passed.

Collect only necessary personal data, protect identity documents and control access to KYC records in line with applicable privacy requirements.

### 5\. Customer portal modules

| Module        | Required functionality                                          |
| ------------- | --------------------------------------------------------------- |
| Dashboard     | Balance, wallet number, recent transactions and shortcuts       |
| My Wallets    | Create or access permitted currency balances                    |
| Add Money     | Card, bank, mobile money and agent cash-in                      |
| Send Money    | Wallet, bank, mobile money and international transfers          |
| Withdraw      | Bank withdrawal, mobile money and agent cash-out                |
| Receive Money | Account number, QR code and payment requests                    |
| Beneficiaries | Save and manage recipients                                      |
| Payments      | Transfer receipts, payment requests and supported bill payments |
| E-Statement   | Search, generate and export statements                          |
| Exchange      | View rates, convert currencies and see FX charges               |
| KYC           | Upload documents, check status and respond to requests          |
| Settings      | PIN, password, biometrics, devices, limits and notifications    |
| Support       | Complaints, disputes, help centre and transaction tracing       |

### 6\. Agent portal

Agents need a separate login, wallet and permissions system.

### Agent dashboard

* Agent account number and outlet details.

* Available float and wallet balance.

* Cash-in and cash-out transactions.

* Daily and monthly transaction totals.

* Earned commissions.

* Pending settlements.

* Reconciliation and cash reports.

### Cash-in procedure

* Agent enters the customer's wallet number or verified phone number.

* System confirms the customer and displays the amount.

* Agent receives cash and confirms the cash receipt.

* The system processes the authorized cash-in.

* The customer wallet is credited and the agent's float is adjusted according to the settlement model.

* Both parties receive a reference and receipt.

### Cash-out procedure

* Customer requests a cash-out or provides an authorized withdrawal reference.

* Agent verifies the transaction, customer and required authentication.

* System reserves or debits the permitted amount.

* Agent dispenses cash.

* The transaction is finalized and commission recorded.

Agent operations must prevent duplicate cash-in, unauthorized cash-out, negative float and agent self-approval of exceptional transactions.

### 7\. Admin and super admin portal

The administration system should have role-based access rather than one shared administrator account.

Customer management

Search accounts, inspect KYC status, manage restrictions, review complaints and view authorized transaction records.

Wallet management

View wallet balances, account status, holds, pending transactions and ledger history. Manual financial adjustments require controlled, audited procedures.

Agent management

Register outlets, approve agents, configure float limits, set commissions, monitor performance and suspend agents when necessary.

Payment operations

Monitor deposits, withdrawals, transfers, provider callbacks, failed payments, reversals, refunds and settlements.

Compliance and fraud

KYC reviews, risk alerts, suspicious transaction investigations, account restrictions and compliance reports.

System configuration

Manage supported countries, payment providers, currencies, exchange rates, charges, limits, notifications, roles and API integrations.

### 8\. E-statements and transaction records

Every customer and agent should have a searchable financial history.

Each transaction record should contain:

* Unique transaction ID and reference.

* Sender and recipient account numbers.

* Transaction type and channel.

* Original amount and currency.

* Fee, commission and exchange rate.

* Amount received.

* Date and timestamp.

* Provider reference.

* Transaction status.

* Opening and closing balance or ledger-derived balance.

* Reversal/refund reference when applicable.

Provide PDF and CSV exports, custom date ranges, filters and downloadable receipts.

Statements must be generated from the financial ledger, not from editable display balances.

### 9\. Currencies, exchange rates and fees

### Currency management

Admin should be able to enable currencies, assign supported countries, define decimal precision and configure the permitted funding and withdrawal methods.

### Exchange rates

Each rate should have:

* Base currency.

* Quote currency.

* Provider/source.

* Buy and sell rates.

* Effective timestamp.

* Expiry or freshness rule.

* Configured spread.

* Audit history.

Before a conversion or international transfer, display the exchange rate, fees and final recipient amount. Where rates are locked for a transaction, record the rate and expiry used for that quote.

### Commission and charges

Support configurable charges for:

* Wallet-to-wallet transfers.

* Bank deposits and withdrawals.

* Mobile-money deposits and withdrawals.

* Card deposits.

* Agent cash-in and cash-out.

* International transfers.

* Currency conversion.

* Business and bulk payments.

Commission can be split between the platform, agent and authorized payment partner according to the configured commercial agreement.

### 10\. Wallet accounting and payment integrity

The financial core should use a double-entry ledger with immutable posted entries.

For example, for a KES 1,000 wallet-to-wallet transfer with a KES 20 sender fee:

| Ledger entry        | Debit     | Credit    |
| ------------------- | --------- | --------- |
| Sender wallet       | KES 1,020 | —         |
| Recipient wallet    | —         | KES 1,000 |
| Fee revenue account | —         | KES 20    |

The journal balances to KES 1,020 on each side. If the fee is charged separately, the entries should reflect that instead.

For bank, card, mobile-money and agent transactions, use a pending/clearing workflow. Never credit a customer solely because a request was submitted. Require the relevant provider's verified confirmation, and reconcile the provider's records with internal ledger entries.

The system should also include:

* Idempotency keys to prevent duplicate processing.

* Signed and authenticated provider callbacks.

* Transaction timeouts and retry rules.

* Safe reversals and refunds.

* Settlement reconciliation.

* Daily balance and safeguarding checks.

* Immutable audit logs.

### 11\. Recommended database tables

| Table                  | Purpose                                         |
| ---------------------- | ----------------------------------------------- |
| users                  | Customer, agent and administrator identities    |
| user_profiles          | Legal names, contact and residence information  |
| wallets                | Unique public wallet account numbers and status |
| wallet_currencies      | Currency-specific wallet accounts               |
| ledger_accounts        | Internal financial accounts                     |
| ledger_transactions    | Financial journal headers                       |
| ledger_entries         | Balanced debit and credit records               |
| transactions           | User-facing transaction details and status      |
| bank_accounts          | Verified, linked bank-account references        |
| mobile_money_accounts  | Linked provider and phone references            |
| payment_providers      | Provider configurations and capabilities        |
| provider_transactions  | External payment references and responses       |
| agents                 | Agent profiles, outlets and permissions         |
| agent_float            | Agent funds and available transaction float     |
| commissions            | Commission rules and earned amounts             |
| fees                   | Charges and pricing rules                       |
| currencies             | Supported currency definitions                  |
| exchange_rates         | Rate history and effective periods              |
| kyc_records            | Verification state and provider results         |
| identity_documents     | Secure references to identity documents         |
| statements             | Statement-generation records                    |
| settlements            | Provider and agent settlement records           |
| reconciliation_records | Matched and unmatched transactions              |
| disputes               | Complaints, investigations and resolutions      |
| audit_logs             | Administrative and security activity            |

### 12\. Suggested technology stack

* Mobile application: Flutter for Android and iOS.

* Customer and agent web portals: React or Next.js.

* Admin portal: React or Next.js with strict role-based permissions.

* Backend: Java/Spring Boot, C#/.NET or TypeScript/NestJS.

* Database: PostgreSQL.

* Cache and rate limiting: Redis.

* Asynchronous processing: RabbitMQ or Kafka as appropriate.

* File storage: Encrypted object storage for KYC documents.

* Deployment: Secure cloud infrastructure with backups, monitoring and disaster recovery.

Start with a modular backend rather than unnecessary microservices. Keep the ledger, payment orchestration and reconciliation boundaries explicit so that the application can scale safely.

### 13\. Regulatory and launch requirements

Because this application will store value and move money, its business and technical design must account for the applicable financial regulations. The Central Bank of Kenya publishes payment-system rules and information about authorized payment service providers.

Before enabling live deposits, withdrawals or customer-held balances, establish the appropriate licensing structure or partner with appropriately authorized financial institutions and payment providers. Customer funds must be safeguarded as required by the applicable framework. Do not assume that building the software alone authorizes the operation of a wallet service.

### 14\. Development phases

* Phase 1 — Foundation: Registration, international phone numbers, KYC, unique wallet account numbers, security and the ledger.

* Phase 2 — Internal wallet: Wallet-to-wallet transfers, deposits, withdrawals, transaction history, receipts and e-statements.

* Phase 3 — Payment integrations: Bank transfers, mobile money, card funding and provider reconciliation.

* Phase 4 — Agent network: Agent registration, cash-in, cash-out, float management and commission accounting.

* Phase 5 — International features: Multiple currencies, exchange rates, cross-border transfer corridors and country-specific compliance.

* Phase 6 — Production readiness: Security testing, load testing, reconciliation tests, disaster recovery, operational monitoring and regulatory/partner approval.

Final product goal: One secure platform where every customer has a unique wallet account number and can receive, save, transfer, deposit and withdraw money through supported wallets, banks, mobile-money providers and authorized agents—with full statements, transparent charges, multi-currency support and complete financial auditability.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/d0088aa9-a417-4ffc-959a-2be9fc9fb044).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
