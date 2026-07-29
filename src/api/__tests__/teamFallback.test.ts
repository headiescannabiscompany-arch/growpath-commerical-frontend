import { ApiError } from "../apiRequest";
import { apiRequest } from "../apiRequest";
import { inviteTeamMember, listTeamMembers, removeTeamMember } from "../team";

jest.mock("../apiRequest", () => {
  const actual = jest.requireActual("../apiRequest");
  return {
    ...actual,
    apiRequest: jest.fn()
  };
});

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe("facility team API compatibility", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it("lists members from the canonical team endpoint", async () => {
    mockApiRequest.mockResolvedValueOnce({
      members: [{ userId: "user-1", email: "one@example.com", role: "OWNER" }]
    });

    await expect(listTeamMembers("facility-1")).resolves.toEqual([
      {
        id: "user-1",
        userId: "user-1",
        email: "one@example.com",
        role: "OWNER"
      }
    ]);

    expect(mockApiRequest).toHaveBeenCalledWith("/api/facility/facility-1/team", {
      method: "GET"
    });
  });

  it("falls back to the members endpoint when team is unavailable", async () => {
    mockApiRequest
      .mockRejectedValueOnce(new ApiError("HTTP_ERROR", 404))
      .mockResolvedValueOnce([
        { id: "member-1", userId: "user-1", email: "one@example.com", role: "STAFF" }
      ]);

    await expect(listTeamMembers("facility-1")).resolves.toEqual([
      {
        id: "member-1",
        userId: "user-1",
        email: "one@example.com",
        role: "STAFF"
      }
    ]);

    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/facilities/facility-1/members",
      {
        method: "GET"
      }
    );
  });

  it("falls back for invites when the canonical invite endpoint is unavailable", async () => {
    mockApiRequest
      .mockRejectedValueOnce(new ApiError("HTTP_ERROR", 404))
      .mockResolvedValueOnce({ invited: { email: "two@example.com", role: "STAFF" } });

    await expect(
      inviteTeamMember("facility-1", { email: "two@example.com", role: "STAFF" })
    ).resolves.toEqual({ email: "two@example.com", role: "STAFF" });

    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "/api/facilities/facility-1/invites",
      {
        method: "POST",
        body: { email: "two@example.com", role: "STAFF" }
      }
    );
  });

  it("removes the selected user through the canonical Facility Team endpoint", async () => {
    mockApiRequest.mockResolvedValueOnce({
      removed: { userId: "user-2", role: "STAFF" },
      ok: true
    });

    await expect(removeTeamMember("facility-1", "user-2")).resolves.toBe(true);

    expect(mockApiRequest).toHaveBeenCalledWith("/api/facility/facility-1/team/user-2", {
      method: "DELETE"
    });
  });
});
