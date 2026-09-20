import { fetchApi } from './client';

export interface PersonSummary {
  person_id: string;
  name_en: string;
  name_gu: string;
  age: number;
  age_approx: boolean;
  dob_precision: string;
  gender: string;
  marital_status: string;
  occupation?: string;
  education?: string;
  disability: boolean;
  social_category: string;
  relation_to_head: string;
  aadhaar_last4?: string;
  has_pan: boolean;
  is_deceased: boolean;
}

export interface FamilyDetail {
  family_id: string;
  head_person_id: string;
  address_text: string;
  village_lgd: string;
  district_code: string;
  lat: number;
  lng: number;
  annual_income: number;
  income_source: string;
  status: string;
  members: PersonSummary[];
}

export interface FamilyListItem {
  family_id: string;
  head_person_id: string;
  address_text: string;
  village_lgd: string;
  district_code: string;
  lat: number;
  lng: number;
  annual_income: number;
  income_source: string;
  status: string;
}

export interface FamilyListResponse {
  items: FamilyListItem[];
  total: number;
  page: number;
  size: number;
}

export interface DocumentItem {
  doc_id: string;
  person_id: string;
  doc_type: string;
  status: string;
  source: string;
  expires_on?: string;
  name_match_score?: number;
}

export interface SchemeEligibility {
  scheme_id: string;
  name_en: string;
  name_gu: string;
  eligible: boolean;
  reasons: { text_en: string; text_gu: string }[];
  missing: { doc_type: string; text_en: string; text_gu: string }[];
  benefit_value: number;
  rank: number;
}

export async function getFamily(familyId: string): Promise<FamilyDetail> {
  return fetchApi<FamilyDetail>(`/families/${familyId}`);
}

export async function listFamilies(districtCode?: string, villageLgd?: string): Promise<FamilyListResponse> {
  const params = new URLSearchParams();
  if (districtCode) params.append('district_code', districtCode);
  if (villageLgd) params.append('village_lgd', villageLgd);
  return fetchApi<FamilyListResponse>(`/families?${params.toString()}`);
}

export async function getFamilyDocuments(familyId: string): Promise<DocumentItem[]> {
  return fetchApi<DocumentItem[]>(`/families/${familyId}/documents`);
}

export async function getFamilyEligibility(familyId: string): Promise<SchemeEligibility[]> {
  return fetchApi<SchemeEligibility[]>(`/families/${familyId}/eligibility`);
}

export async function getFamilyTree(familyId: string): Promise<{ family_id: string; nodes: any[]; edges: any[] }> {
  return fetchApi(`/families/${familyId}/tree`);
}

export async function updateFamilyAddress(familyId: string, data: any) {
  return fetchApi(`/families/${familyId}/address`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
}
