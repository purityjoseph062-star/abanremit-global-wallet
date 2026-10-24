// DEMO PERSISTENCE ONLY. localStorage is used solely to keep fictional demo
// state across refreshes. Never store secrets, credentials or identity documents.
import { useSyncExternalStore } from "react";
import type {
  AgentProfile,
  AppNotification,
  Beneficiary,
  CommissionEntry,
  FloatAccount,
  FloatMovement,
  Reconciliation,
  ReplenishmentRequest,
  Settlement,
  SupportTicket,
  Transaction,
  User,
  Wallet,
} from "../domain/types";
import {
  SEED_AGENT_PROFILES,
  SEED_BENEFICIARIES,
  SEED_COMMISSIONS,
  SEED_FLOAT_ACCOUNTS,
  SEED_FLOAT_MOVEMENTS,
  SEED_RECONCILIATIONS,
  SEED_REPLENISHMENTS,
  SEED_SETTLEMENTS,
  SEED_SUPPORT_TICKETS,
  SEED_TRANSACTIONS,
  SEED_USERS,
  SEED_WALLETS,
} from "./seed";

export interface DemoState {
  personaId: string | null;
  users: User[];
  wallets: Wallet[];
  transactions: Transaction[];
  beneficiaries: Beneficiary[];
  idempotency: Record<string, string>;
  notifications: AppNotification[];
  hideBalances?: boolean;
  agentProfiles: AgentProfile[];
  floatAccounts: FloatAccount[];
  floatMovements: FloatMovement[];
  replenishmentRequests: ReplenishmentRequest[];
  commissions: CommissionEntry[];
  settlements: Settlement[];
  reconciliations: Reconciliation[];
  supportTickets: SupportTicket[];
}

const KEY = "abanremit_demo_state_v1";

export function seedState(): DemoState {
  return structuredClone({
    personaId: null,
    users: SEED_USERS,
    wallets: SEED_WALLETS,
    transactions: SEED_TRANSACTIONS,
    beneficiaries: SEED_BENEFICIARIES,
    idempotency: {},
    notifications: [
      {
        id: "n1",
        title: "New sign-in (demo)",
        body: "Chrome on Android, Nairobi",
        at: new Date().toISOString(),
        read: false,
        category: "security",
        severity: "info",
      },
      {
        id: "n2",
        title: "Deposit awaiting funding",
        body: "DEMO-DEP-3M8PZ",
        at: new Date().toISOString(),
        read: false,
        txId: "t2",
        category: "transaction",
        severity: "warning",
      },
    ],
    agentProfiles: SEED_AGENT_PROFILES,
    floatAccounts: SEED_FLOAT_ACCOUNTS,
    floatMovements: SEED_FLOAT_MOVEMENTS,
    replenishmentRequests: SEED_REPLENISHMENTS,
    commissions: SEED_COMMISSIONS,
    settlements: SEED_SETTLEMENTS,
    reconciliations: SEED_RECONCILIATIONS,
    supportTickets: SEED_SUPPORT_TICKETS,
  });
}

let state: DemoState = load();
const listeners = new Set<() => void>();

function load(): DemoState {
  if (typeof window === "undefined") return seedState();
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...seedState(), ...(JSON.parse(raw) as DemoState) } : seedState();
  } catch {
    return seedState();
  }
}

export function getState() {
  return state;
}
export function setState(fn: (s: DemoState) => DemoState) {
  state = fn(state);
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}
export function resetDemo() {
  const persona = state.personaId;
  setState(() => ({ ...seedState(), personaId: persona }));
}
export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const serverSnap = seedState();
export function useDemo<T>(sel: (s: DemoState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => sel(state),
    () => sel(serverSnap),
  );
}
export function currentUser(s: DemoState = state) {
  return s.users.find((u) => u.id === s.personaId) ?? null;
}
