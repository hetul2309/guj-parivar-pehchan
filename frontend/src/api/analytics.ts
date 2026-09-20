import { apiRequest } from "./client";

export interface AnalyticsSummary {
  total_families: number;
  total_beneficiaries: number;
  total_applications: number;
  pending_applications: number;
  approved_applications: number;
  disbursed_applications: number;
  approval_rate_pct: number;
  district_code: string;
}

export interface AnalyticsQueryResult {
  sql: string;
  columns: string[];
  rows: any[][];
  chart_hint: "bar" | "line" | "table" | "map";
  row_count: number;
}

export const analyticsApi = {
  ask: (question: string) =>
    apiRequest<AnalyticsQueryResult>("/analytics/ask", {
      method: "POST",
      body: JSON.stringify({ question })
    }),

  getSummary: (districtCode?: string) =>
    apiRequest<AnalyticsSummary>(`/analytics/summary${districtCode ? `?district_code=${districtCode}` : ""}`)
};
