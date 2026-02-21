import { apiRequest } from "./apiRequest";

export type FacilityMember = {
  id: string;
  userId: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MANAGER" | "STAFF" | "VIEWER";
  joinedAt: string;
};

export type FacilityInvite = {
  id: string;
  email: string;
  role: FacilityMember["role"];
  status: "pending" | "accepted" | "revoked";
  createdAt: string;
};

export function getFacilityMembers(facilityId: string) {
  return apiRequest<FacilityMember[]>(`/api/facilities/${facilityId}/members`);
}

export function inviteFacilityMember(
  facilityId: string,
  data: {
    email: string;
    role: FacilityMember["role"];
  }
) {
  return apiRequest(`/api/facilities/${facilityId}/invites`, {
    method: "POST",
    body: data
  });
}

export function updateMemberRole(
  facilityId: string,
  memberId: string,
  role: FacilityMember["role"]
) {
  return apiRequest(`/api/facilities/${facilityId}/members/${memberId}`, {
    method: "PATCH",
    body: { role }
  });
}

export function removeMember(facilityId: string, memberId: string) {
  return apiRequest(`/api/facilities/${facilityId}/members/${memberId}`, {
    method: "DELETE"
  });
}
