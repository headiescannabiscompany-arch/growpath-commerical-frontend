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
  const res = await apiRequest(endpoints.teamMembers(facilityId));
  // Contract: { members: [...] }
  const members = res?.members ?? [];
  return members.map((m: any) => ({
    ...m,
    id: String(m.id ?? m.userId ?? m._id ?? "")
  }));
}

export async function inviteTeamMember(
  facilityId: string,
  data: { email: string; role: FacilityRole }
) {
  const res = await apiRequest(endpoints.teamInvite(facilityId), {
    method: "POST",
    body: data
  });
  return res?.invited ?? res;
}

export async function updateTeamMemberRole(
  facilityId: string,
  userId: string,
  data: { role: FacilityRole }
) {
  const res = await apiRequest(endpoints.teamMember(facilityId, userId), {
    method: "PATCH",
    body: data
  });
  return res?.updated ?? res;
}

export async function removeTeamMember(facilityId: string, userId: string) {
  const res = await apiRequest(endpoints.teamMember(facilityId, userId), {
    method: "DELETE"
  });
  return res?.deleted ?? res?.ok ?? res;
}
