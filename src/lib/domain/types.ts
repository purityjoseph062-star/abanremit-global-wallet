// Typed domain contracts shared by the Demo and Laravel adapters.
// Amounts are integer minor units (e.g. cents) to avoid floating-point money.

export type CurrencyCode = "KES" | "UGX" | "TZS" | "USD" | "GBP" | "EUR";

export type Role =
  | "customer"
  | "business_customer"
  | "agent"
  | "outlet_manager"
  | "support_officer"
  | "compliance_officer"
  | "payment_ops_officer"
  | "finance_officer"
  | "administrator"
  | "super_administrator";

export type KycStatus =
  | "draft"
  | "submitted"
  | "pending_review"
  | "additional_information_required"
  | "approved"
  | "rejected";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  role: Role;
  kycStatus: KycStatus;
}

export type WalletStatus = "active" | "suspended" | "pending_activation";
export type AccountType = "personal" | "business" | "agent";

export interface Wallet {
  id: string; // internal ID — never shown as the account number
  number: string; // permanent public wallet account number
  ownerId: string;
  currency: CurrencyCode;
  accountType: AccountType;
  status: WalletStatus;
  available: number;
  pending: number;
  held: number;
}

export type TxType = "transfer" | "deposit" | "withdrawal" | "exchange" | "cash_in" | "cash_out";
export type TxChannel = "wallet" | "bank" | "mobile_money" | "card" | "agent" | "fx";
export type TxStatus =
  "pending" | "processing" | "completed" | "failed" | "reversed" | "cancelled" | "expired";

export interface LedgerLine {
  account: string;
  debit: number;
  credit: number;
  currency: CurrencyCode;
}

export interface Transaction {
  id: string;
  reference: string;
  idempotencyKey: string;
  type: TxType;
  channel: TxChannel;
  status: TxStatus;
  walletId: string;
  ownerId: string;
  currency: CurrencyCode;
  amount: number;
  fee: number;
  fxRate?: number | undefined;
  destAmount?: number | undefined;
  destCurrency?: CurrencyCode | undefined;
  counterparty: string;
  createdAt: string;
  method?: string | undefined; // deposit/withdrawal method id
  destination?: string | undefined; // masked destination, never full details
  nextAction?: string | undefined;
  timeline: { status: TxStatus; at: string; note: string }[];
  ledger: LedgerLine[];
}

export type BeneficiaryType = "wallet" | "bank" | "mobile_money";

export interface Beneficiary {
  id: string;
  ownerId: string;
  name: string;
  type: BeneficiaryType;
  destination: string;
  provider?: string | undefined;
  currency: CurrencyCode;
  verified: boolean;
}

export interface Quote {
  id: string;
  sourceCurrency: CurrencyCode;
  destCurrency: CurrencyCode;
  amount: number;
  fee: number;
  rate: number;
  destAmount: number;
  totalDebit: number;
  expiresAt: string;
  illustrative: true;
}

export interface TransferRequest {
  walletId: string;
  beneficiaryId: string;
  amount: number;
  quoteId: string;
  pin: string;
  idempotencyKey: string;
  simulate?: "success" | "pending" | "failure" | undefined;
}

export interface CashInRequest {
  agentWalletId: string;
  customerWalletNumber: string;
  amount: number;
  idempotencyKey: string;
}

export interface ApiError {
  code: string;
  message: string;
  correlationId: string;
}

export type MovementMethod = "mobile_money" | "bank" | "card" | "agent";

export interface MovementQuote {
  kind: "deposit" | "withdrawal";
  walletId: string;
  method: MovementMethod;
  currency: CurrencyCode;
  amount: number;
  fee: number;
  /** deposit: amount credited (amount − fee). withdrawal: total debited (amount + fee). */
  net: number;
  min: number;
  max: number;
  eta: string;
}

export interface DepositRequest {
  walletId: string;
  method: MovementMethod;
  amount: number;
  payerPhone?: string | undefined;
  idempotencyKey: string;
}
export interface WithdrawalRequest {
  walletId: string;
  method: MovementMethod;
  amount: number;
  beneficiaryId?: string | undefined;
  pin: string;
  idempotencyKey: string;
}
export type SimulatedOutcome = "success" | "failure" | "expire" | "reverse";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  txId?: string | undefined;
  category?: string | undefined;
  severity?: "info" | "warning" | "error" | undefined;
}

// ─── Agent domain types ───────────────────────────────────────────────

export type AgentOperatingStatus = "active" | "pending_activation" | "suspended" | "restricted";

export interface AgentProfile {
  id: string;
  userId: string;
  agentCode: string;
  outletName: string;
  outletId: string;
  outletLocation: string;
  operatingStatus: AgentOperatingStatus;
  joinedAt: string;
  agentType: "operator" | "supervisor" | "outlet_manager";
}

export type FloatMovementType =
  | "initial_allocation"
  | "replenishment_approved"
  | "replenishment_requested"
  | "agent_withdrawal"
  | "cash_in_movement"
  | "cash_out_movement"
  | "commission_settlement"
  | "adjustment"
  | "reversal"
  | "correction";

export interface FloatAccount {
  id: string;
  agentId: string;
  currency: CurrencyCode;
  available: number;
  reserved: number;
  minimumRecommended: number;
  lastUpdated: string;
}

export interface FloatMovement {
  id: string;
  reference: string;
  accountId: string;
  currency: CurrencyCode;
  movementType: FloatMovementType;
  amount: number;
  previousBalance: number;
  resultingBalance: number;
  initiator: string;
  status: TxStatus;
  txId?: string | undefined;
  createdAt: string;
}

export type ReplenishmentStatus =
  | "draft"
  | "submitted"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "processing"
  | "completed"
  | "cancelled";

export interface ReplenishmentRequest {
  id: string;
  reference: string;
  agentId: string;
  accountId: string;
  currency: CurrencyCode;
  amount: number;
  reason: string;
  status: ReplenishmentStatus;
  createdAt: string;
  resolvedAt?: string | undefined;
  resolvedBy?: string | undefined;
}

export type CommissionStatus =
  "pending" | "earned" | "approved" | "settled" | "reversed" | "rejected";

export interface CommissionEntry {
  id: string;
  reference: string;
  txId: string;
  txReference: string;
  txType: TxType;
  agentId: string;
  currency: CurrencyCode;
  txAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: CommissionStatus;
  settlementRef?: string | undefined;
  createdAt: string;
}

export interface CommissionSummary {
  earnedToday: number;
  earnedThisMonth: number;
  pending: number;
  approved: number;
  settled: number;
  reversed: number;
  currency: CurrencyCode;
}

export type SettlementStatus =
  "draft" | "pending" | "processing" | "completed" | "failed" | "reversed";

export interface Settlement {
  id: string;
  reference: string;
  agentId: string;
  type: "commission_payout" | "float_topup" | "float_return";
  currency: CurrencyCode;
  amount: number;
  period: string;
  status: SettlementStatus;
  initiatedAt: string;
  completedAt?: string | undefined;
  relatedRefs: string[];
}

export type ReconciliationStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "balanced"
  | "variance_detected"
  | "under_review"
  | "approved"
  | "rejected";

export interface Reconciliation {
  id: string;
  reference: string;
  agentId: string;
  outletId: string;
  businessDate: string;
  currency: CurrencyCode;
  openingFloat: number;
  floatAdditions: number;
  floatReductions: number;
  cashInTotal: number;
  cashOutTotal: number;
  commissionTotal: number;
  reversals: number;
  expectedClosing: number;
  reportedClosing?: number | undefined;
  variance: number;
  status: ReconciliationStatus;
  explanation?: string | undefined;
  createdAt: string;
  submittedAt?: string | undefined;
}

export interface CustomerSummary {
  id: string;
  name: string;
  maskedPhone: string;
  kycStatus: KycStatus;
  accountStatus: WalletStatus;
  wallets: { currency: CurrencyCode; status: WalletStatus; available: number }[];
  recentTxCount: number;
  joinedAt: string;
}

export type SupportTicketStatus =
  "open" | "in_progress" | "waiting_customer" | "waiting_ops" | "resolved" | "closed";

export interface SupportTicket {
  id: string;
  reference: string;
  agentId: string;
  category: string;
  subject: string;
  description: string;
  txRef?: string | undefined;
  status: SupportTicketStatus;
  createdAt: string;
  messages: { id: string; author: string; body: string; at: string }[];
}

export type CashOutPayoutStatus =
  "awaiting_payout" | "payout_confirmed" | "payout_failed" | "payout_disputed";

export interface CashOutRequest {
  agentWalletId: string;
  customerWalletId: string;
  amount: number;
  idempotencyKey: string;
  simulate?: "success" | "failure" | undefined;
}

// ─── Customer wallet creation & exchange ──────────────────────────────

export interface CurrencyInfo {
  code: CurrencyCode;
  name: string;
  symbol: string;
  flag: string;
  precision: number;
  demoAvailable: boolean;
}

export interface WalletCreateRequest {
  currency: CurrencyCode;
  idempotencyKey: string;
}

export interface WalletEligibility {
  currency: CurrencyCode;
  canCreate: boolean;
  reason?: string | undefined;
  existingWalletId?: string | undefined;
}

export interface ExchangeQuote {
  id: string;
  sourceWalletId: string;
  destWalletId: string;
  sourceCurrency: CurrencyCode;
  destCurrency: CurrencyCode;
  amount: number;
  rate: number;
  fee: number;
  destAmount: number;
  totalDebit: number;
  expiresAt: string;
  illustrative: true;
}

export interface ExchangeRequest {
  sourceWalletId: string;
  destWalletId: string;
  amount: number;
  quoteId: string;
  idempotencyKey: string;
}

export interface PortfolioSummary {
  displayCurrency: CurrencyCode;
  totalValueMinor: number;
  ratesUsed: Record<string, number>;
  rateUpdatedAt: string;
  walletCount: number;
  activeWalletCount: number;
  pendingTxCount: number;
}

export interface StatementLine {
  date: string;
  reference: string;
  type: TxType;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  currency: CurrencyCode;
}

export interface Statement {
  walletId: string;
  walletNumber: string;
  currency: CurrencyCode;
  openingBalance: number;
  closingBalance: number;
  from: string;
  to: string;
  lines: StatementLine[];
}

export interface AccountLimits {
  dailyTransferLimit: number;
  dailyWithdrawalLimit: number;
  singleTransactionLimit: number;
  monthlyVolumeLimit: number;
  currency: CurrencyCode;
}

export interface SupportTicketMessage {
  id: string;
  author: string;
  body: string;
  at: string;
}

export interface CustomerSupportTicket {
  id: string;
  reference: string;
  category: string;
  subject: string;
  description: string;
  status: SupportTicketStatus;
  createdAt: string;
  messages: SupportTicketMessage[];
}
