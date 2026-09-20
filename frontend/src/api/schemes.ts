import { apiRequest } from "./client";

export interface Scheme {
  scheme_id: string;
  name_en: string;
  name_gu: string;
  dept: string;
  benefit_type: string;
  amount_max?: number;
  is_active: boolean;
  rules: any[];
  desc_en?: string;
  desc_gu?: string;
  created_at?: string;
}

export type SchemeCreate = Omit<Scheme, 'scheme_id' | 'created_at'>;

export const schemesApi = {
  list: (isActive?: boolean) =>
    apiRequest<any>(
      `/schemes${isActive !== undefined ? `?is_active=${isActive}` : ""}`
    ),


  get: (schemeId: string) =>
    apiRequest<Scheme>(`/schemes/${schemeId}`),

  create: (data: SchemeCreate) =>
    apiRequest<Scheme>("/schemes", { method: "POST", body: JSON.stringify(data) }),

  update: (schemeId: string, data: Partial<SchemeCreate>) =>
    apiRequest<Scheme>(`/schemes/${schemeId}`, { method: "PUT", body: JSON.stringify(data) }),

  delete: (schemeId: string) =>
    apiRequest(`/schemes/${schemeId}`, { method: "DELETE" })
};
