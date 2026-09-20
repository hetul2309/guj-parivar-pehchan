import { apiRequest } from "./client";

export interface MigrationEvent {
  family_id: string;
  from_village_lgd?: string;
  to_village_lgd: string;
  event_type: string;
  status: string;
  created_at: string;
  payload?: any;
}

export interface PortabilityStatus {
  family_id: string;
  new_village: string;
  actions_taken: Array<{
    type: string;
    description: string;
    status: string;
  }>;
  message: string;
}

export const migrationApi = {
  listEvents: (familyId?: string) =>
    apiRequest<any>(
      `/migration/events${familyId ? `?family_id=${familyId}` : ""}`
    ),


  triggerMigration: (familyId: string, newVillageLgd: string) =>
    apiRequest<PortabilityStatus>("/migration/trigger", {
      method: "POST",
      body: JSON.stringify({ family_id: familyId, new_village_lgd: newVillageLgd })
    }),

  getPortabilityStatus: (familyId: string) =>
    apiRequest<PortabilityStatus>(`/migration/portability/${familyId}`)
};
