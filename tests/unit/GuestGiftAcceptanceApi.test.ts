import { acceptGuestGift } from "@/api/guestGiftAcceptance";

const mockRequest = jest.fn();
jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: unknown[]) => mockRequest(...args)
}));

describe.each([
  ["complimentary", "/api/subscription/complimentary-grants/claim/accept"],
  ["prepaid", "/api/subscription/gifts/claim/accept"]
] as const)("%s guest acceptance API", (kind, path) => {
  it("sends the invitation only in the body of a deliberate public POST", async () => {
    mockRequest
      .mockResolvedValueOnce({ accepted: true })
      .mockResolvedValueOnce({ data: { accepted: true } });
    await expect(acceptGuestGift(kind, "invite-token")).resolves.toBeUndefined();
    await expect(acceptGuestGift(kind, "invite-token")).resolves.toBeUndefined();
    expect(mockRequest).toHaveBeenCalledWith(path, {
      method: "POST",
      auth: false,
      cache: "no-store",
      body: { token: "invite-token" }
    });
  });

  it.each([null, {}, { claimed: true }, { accepted: false }, { accepted: "true" }])(
    "requires a confirmed receipt (%j)",
    async (receipt) => {
      mockRequest.mockResolvedValueOnce(receipt);
      await expect(acceptGuestGift(kind, "invite-token")).rejects.toThrow(
        "could not be confirmed"
      );
    }
  );
});
