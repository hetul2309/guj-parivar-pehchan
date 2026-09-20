import { apiRequest } from "./client";

export type FacilityType =
  | "all"
  | "phc"
  | "school"
  | "anganwadi"
  | "ration_shop"
  | "bank";

export interface Facility {
  facility_id: string;
  name: string;
  type: string;
  village_lgd: string;
  district_code?: string;
  lat: number;
  lng: number;
  capacity_daily?: number;
}

export interface FacilityGeoJSONFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    facility_id: string;
    name: string;
    type: string;
    district_code: string;
    village_lgd: string;
  };
}

export interface FacilityGeoJSONResponse {
  type: "FeatureCollection";
  features: FacilityGeoJSONFeature[];
}

export interface AccessGapVillage {
  village_lgd: string;
  name_en: string;
  name_gu: string;
  district_code: string;
  lat: number;
  lng: number;
  nearest_facility: string;
  distance_km: number;
  eligible_beneficiaries: number;
  threshold_km: number;
  gap_score: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
}

export interface CampSuggestion {
  camp_id: string;
  name: string;
  lat: number;
  lng: number;
  families_count: number;
  status: string;
}

export interface SchemeCoverageVillage {
  village_lgd: string;
  name_en: string;
  name_gu: string;
  district_code: string;
  lat: number;
  lng: number;
  eligible: number;
  applied: number;
  disbursed: number;
  saturation_pct: number;
}

export const geoApi = {
  getFacilities: async (facilityType: FacilityType = "all", districtCode?: string): Promise<Facility[]> => {
    const q = new URLSearchParams();
    if (districtCode) q.set("district_code", districtCode);
    const url = `/geo/layers/${facilityType}${q.toString() ? `?${q.toString()}` : ""}`;
    const geoJson = await apiRequest<FacilityGeoJSONResponse>(url);
    return (geoJson.features || []).map((f) => ({
      facility_id: f.properties.facility_id,
      name: f.properties.name,
      type: f.properties.type,
      village_lgd: f.properties.village_lgd,
      district_code: f.properties.district_code,
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
    }));
  },

  getAccessGaps: (
    districtCode?: string,
    facilityType: FacilityType = "phc",
    thresholdKm: number = 5
  ): Promise<AccessGapVillage[]> => {
    const q = new URLSearchParams();
    if (districtCode) q.set("district_code", districtCode);
    q.set("facility_type", facilityType);
    q.set("threshold_km", String(thresholdKm));
    return apiRequest<AccessGapVillage[]>(`/geo/access-gap?${q.toString()}`);
  },

  getCamps: (districtCode?: string, schemeId?: string): Promise<CampSuggestion[]> => {
    const q = new URLSearchParams();
    if (districtCode) q.set("district_code", districtCode);
    if (schemeId) q.set("scheme_id", schemeId);
    return apiRequest<CampSuggestion[]>(`/geo/camps${q.toString() ? `?${q.toString()}` : ""}`);
  },

  getCoverage: (districtCode?: string, schemeId?: string): Promise<SchemeCoverageVillage[]> => {
    const q = new URLSearchParams();
    if (districtCode) q.set("district_code", districtCode);
    if (schemeId) q.set("scheme_id", schemeId);
    return apiRequest<SchemeCoverageVillage[]>(`/geo/coverage${q.toString() ? `?${q.toString()}` : ""}`);
  },
};
