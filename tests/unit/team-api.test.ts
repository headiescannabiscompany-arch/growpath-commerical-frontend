const mockApiRequest = jest.fn();

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

describe("facility team API normalization", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("extracts an assignable user id from nested membership records", async () => {
    mockApiRequest.mockResolvedValue({
      members: [
        {
          _id: "membership-1",
          role: "STAFF",
          user: {
            _id: "user-1",
            email: "staff@example.com",
            displayName: "Staff Member"
          }
        }
      ]
    });
    const { listTeamMembers } = require("@/api/team");

    await expect(listTeamMembers("facility-1")).resolves.toEqual([
      expect.objectContaining({
        id: "membership-1",
        userId: "user-1",
        email: "staff@example.com",
        name: "Staff Member"
      })
    ]);
  });
});
