import { apiRequest } from "./client";

export interface EligibilityResult {
  family_id: string;
  scheme_id: string;
  eligible: boolean;
  score?: number;
  passed_rules: any[];
  failed_rules: any[];
  explanation?: string;
}

export const eligibilityApi = {
  check: (familyId: string, schemeId: string) =>
    apiRequest<EligibilityResult>("/eligibility/check", {
      method: "POST",
      body: JSON.stringify({ family_id: familyId, scheme_id: schemeId })
    }),

  bulkCheck: (familyId: string) =>
    apiRequest<{ results: EligibilityResult[] }>(`/eligibility/bulk/${familyId}`),

  draftRules: (description: string) =>
    apiRequest<{ rules: any[]; explanation: string }>("/eligibility/draft-rules", {
      method: "POST",
      body: JSON.stringify({ description })
    })
};
