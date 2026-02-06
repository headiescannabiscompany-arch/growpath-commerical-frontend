import { api } from "./client";
import { endpoints } from "./endpoints";

export type FacilityRole = "OWNER" | "MANAGER" | "STAFF" | "VIEWER";

export type TeamMember = {
  userId: string;
  role: FacilityRole;
  email?: string;
  name?: string;
};

export async function listTeamMembers(facilityId: string): Promise<TeamMember[]> {
  const res = await api.get(endpoints.teamMembers(facilityId));
  // Contract: { members: [...] }
  return res?.members ?? [];
}

export async function inviteTeamMember(
  facilityId: string,
  data: { email: string; role: FacilityRole }
) {
  const res = await api.post(endpoints.teamInvite(facilityId), data);
  return res?.invited ?? res;
}

export async function updateTeamMemberRole(
  facilityId: string,
  userId: string,
  data: { role: FacilityRole }
) {
  const res = await api.patch(endpoints.teamMember(facilityId, userId), data);
  return res?.updated ?? res;
}

export async function removeTeamMember(facilityId: string, userId: string) {
  const res = await api.delete(endpoints.teamMember(facilityId, userId));
  return res?.deleted ?? res?.ok ?? res;
}
