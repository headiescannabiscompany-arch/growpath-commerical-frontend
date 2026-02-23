import { apiRequest } from "./apiRequest";
import { endpoints } from "./endpoints";

export type FacilityRole = "OWNER" | "ADMIN" | "MANAGER" | "STAFF" | "VIEWER";

export type TeamMember = {
  id: string;
  userId: string;
  role: FacilityRole;
  email?: string;
  name?: string;
};

export async function listTeamMembers(facilityId: string): Promise<TeamMember[]> {
  const listRes = await apiRequest(endpoints.teamMembers(facilityId));
  // Contract: { members: [...] }
  const members = listRes?.members ?? [];
  return members.map((m: any) => ({
    ...m,
    id: String(m.id ?? m.userId ?? m._id ?? "")
  }));
}

export async function inviteTeamMember(
  facilityId: string,
  data: { email: string; role: FacilityRole }
) {
  const inviteRes = await apiRequest(endpoints.teamInvite(facilityId), {
    method: "POST",
    body: data
  });
  return inviteRes?.invited ?? inviteRes;
}

export async function updateTeamMemberRole(
  facilityId: string,
  userId: string,
  data: { role: FacilityRole }
) {
  const updateRes = await apiRequest(endpoints.teamMember(facilityId, userId), {
    method: "PATCH",
    body: data
  });
  return updateRes?.updated ?? updateRes;
}

export async function removeTeamMember(facilityId: string, userId: string) {
  const removeRes = await apiRequest(endpoints.teamMember(facilityId, userId), {
    method: "DELETE"
  });
  return removeRes?.deleted ?? removeRes?.ok ?? removeRes;
}
