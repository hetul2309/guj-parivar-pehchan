import { apiRequest } from "./client";

export interface Facility {
  facility_id: string;
  name: string;
  type: string;
  village_lgd: string;
  district_code?: string;
  lat?: number;
  lng?: number;
  capacity_daily?: number;
  is_active: boolean;
}

export interface AccessGapVillage {
  village_lgd: string;
  access_gap_score: number;
  nearest_facility_name?: string;
  nearest_facility_km?: number;
  lat?: number;
  lng?: number;
}

export interface CampCluster {
  centroid_lat: number;
  centroid_lng: number;
  villages: string[];
  estimated_beneficiaries?: number;
}

export const geoApi = {
  listFacilities: (type?: string, district?: string) => {
    const q = new URLSearchParams();
    if (type) q.set("type", type);
    if (district) q.set("district_code", district);
    return apiRequest<any>(`/geo/facilities?${q.toString()}`);
  },

  createFacility: (data: Partial<Facility>) =>
    apiRequest<Facility>("/geo/facilities", { method: "POST", body: JSON.stringify(data) }),

  getAccessGaps: (districtCode?: string) =>
    apiRequest<any>(
      `/geo/access-gaps${districtCode ? `?district_code=${districtCode}` : ""}`
    ),

  getCampClusters: (k = 5) =>
    apiRequest<any>(`/geo/camp-clusters?k=${k}`)
};

