import type { ApiError } from "../domain/types";

export class ApiException extends Error {
  constructor(public error: ApiError) { super(error.message); }
}
export const rid = (p: string) => `${p}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
export const fail = (code: string, message: string): never => { throw new ApiException({ code, message, correlationId: rid("corr") }); };
export const delay = (ms = 450) => new Promise((r) => setTimeout(r, ms));
