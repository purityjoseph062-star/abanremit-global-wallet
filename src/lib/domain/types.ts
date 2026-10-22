// Typed domain contracts shared by the Demo and Laravel adapters.
// Amounts are integer minor units (e.g. cents) to avoid floating-point money.

export type CurrencyCode = "KES" | "UGX" | "TZS" | "USD" | "GBP" | "EUR";

export type Role =
  | "customer"
  | "business_customer"
  | "agent"
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
export type TxStatus = "pending" | "processing" | "completed" | "failed" | "reversed" | "cancelled";

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
  fxRate?: number;
  destAmount?: number;
  destCurrency?: CurrencyCode;
  counterparty: string;
  createdAt: string;
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
  provider?: string;
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
  simulate?: "success" | "pending" | "failure";
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
