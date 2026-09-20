import { apiRequest } from "./client";

export interface AccessLogEntry {
  id: number;
  actor_id: string;
  actor_role: string;
  dept: string;
  purpose: string;
  fields: string[];
  ts: string;
  hash: string;
}

export interface ConsentRevocation {
  dept: string;
  purpose: string;
  revoked_at: string;
}

export interface FamilyLedger {
  family_id: string;
  logs: AccessLogEntry[];
  revocations: ConsentRevocation[];
}

export interface ChainVerifyResult {
  valid: boolean;
  total_records: number;
  broken_at_id: number | null;
  message: string;
}

export const ledgerApi = {
  getFamilyLedger: (familyId: string) =>
    apiRequest<FamilyLedger>(`/ledger/families/${familyId}`),

  revokeConsent: (familyId: string, dept: string, purpose: string) =>
    apiRequest(`/ledger/families/${familyId}/revoke`, {
      method: "POST",
      body: JSON.stringify({ dept, purpose })
    }),

  restoreConsent: (familyId: string, dept: string, purpose: string) =>
    apiRequest(`/ledger/families/${familyId}/restore`, {
      method: "POST",
      body: JSON.stringify({ dept, purpose })
    }),

  verifyChain: () =>
    apiRequest<ChainVerifyResult>("/ledger/verify"),

  queryLogs: (actorId?: string, familyId?: string) =>
    apiRequest<AccessLogEntry[]>(`/ledger?${actorId ? `actor_id=${actorId}&` : ""}${familyId ? `family_id=${familyId}` : ""}`)
};
