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

function normalizeMembers(res: any): TeamMember[] {
  const rows = Array.isArray(res)
    ? res
    : (res?.members ?? res?.team ?? res?.items ?? res?.data?.members ?? res?.data ?? []);
  return Array.isArray(rows)
    ? rows.map((m: any) => {
        const user = m?.user && typeof m.user === "object" ? m.user : null;
        const rawUserId =
          (typeof m?.userId === "object" ? (m.userId?._id ?? m.userId?.id) : m?.userId) ??
          user?._id ??
          user?.id ??
          m?.accountId ??
          m?.memberUserId;
        const userId = String(rawUserId ?? "");
        return {
          ...m,
          id: String(m?.id ?? m?._id ?? userId),
          userId,
          email: m?.email ?? user?.email,
          name: m?.name ?? m?.displayName ?? user?.displayName ?? user?.name
        };
      })
    : [];
}

export async function listTeamMembers(facilityId: string): Promise<TeamMember[]> {
  try {
    const listRes = await apiRequest(endpoints.teamMembers(facilityId), {
      method: "GET"
    });
    return normalizeMembers(listRes);
  } catch (err: any) {
    if (err?.status !== 404) throw err;
    const fallback = await apiRequest(`/api/facilities/${facilityId}/members`, {
      method: "GET"
    });
    return normalizeMembers(fallback);
  }
}

export async function inviteTeamMember(
  facilityId: string,
  data: { email: string; role: FacilityRole }
) {
  let inviteRes;
  try {
    inviteRes = await apiRequest(endpoints.teamInvite(facilityId), {
      method: "POST",
      body: data
    });
  } catch (err: any) {
    if (err?.status !== 404) throw err;
    inviteRes = await apiRequest(`/api/facilities/${facilityId}/invites`, {
      method: "POST",
      body: data
    });
  }
  const invited = inviteRes?.invited ?? inviteRes;
  const emailDelivery = inviteRes?.emailDelivery ?? invited?.emailDelivery;
  return {
    ...(invited && typeof invited === "object" ? invited : {}),
    ...(emailDelivery ? { emailDelivery } : {})
  };
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
