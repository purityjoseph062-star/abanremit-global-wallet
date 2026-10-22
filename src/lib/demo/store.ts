// DEMO PERSISTENCE ONLY. localStorage is used solely to keep fictional demo
// state across refreshes. Never store secrets, credentials or identity documents.
import { useSyncExternalStore } from "react";
import type { Beneficiary, Transaction, User, Wallet } from "../domain/types";
import { SEED_BENEFICIARIES, SEED_TRANSACTIONS, SEED_USERS, SEED_WALLETS } from "./seed";

export interface DemoState {
  personaId: string | null;
  users: User[];
  wallets: Wallet[];
  transactions: Transaction[];
  beneficiaries: Beneficiary[];
  idempotency: Record<string, string>; // key -> transaction id
}

const KEY = "abanremit_demo_state_v1";

export function seedState(): DemoState {
  return structuredClone({
    personaId: null, users: SEED_USERS, wallets: SEED_WALLETS,
    transactions: SEED_TRANSACTIONS, beneficiaries: SEED_BENEFICIARIES, idempotency: {},
  });
}

let state: DemoState = load();
const listeners = new Set<() => void>();

function load(): DemoState {
  if (typeof window === "undefined") return seedState();
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DemoState) : seedState();
  } catch { return seedState(); }
}

export function getState() { return state; }
export function setState(fn: (s: DemoState) => DemoState) {
  state = fn(state);
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((l) => l());
}
export function resetDemo() {
  const persona = state.personaId;
  setState(() => ({ ...seedState(), personaId: persona }));
}
export function subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); }

const serverSnap = seedState();
export function useDemo<T>(sel: (s: DemoState) => T): T {
  return useSyncExternalStore(subscribe, () => sel(state), () => sel(serverSnap));
}
export function currentUser(s: DemoState = state) {
  return s.users.find((u) => u.id === s.personaId) ?? null;
}
