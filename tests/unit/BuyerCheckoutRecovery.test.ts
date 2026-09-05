import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  clearPendingBuyerCheckout,
  pollAuthoritativeCheckoutStatus,
  readPendingBuyerCheckout,
  rememberPendingBuyerCheckout
} from "@/utils/buyerCheckoutRecovery";

describe("buyer Checkout recovery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const storage = new Map<string, string>();
    jest.mocked(AsyncStorage.getItem).mockImplementation(async (key) => {
      return storage.get(key) ?? null;
    });
    jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
      storage.set(key, value);
    });
    jest.mocked(AsyncStorage.removeItem).mockImplementation(async (key) => {
      storage.delete(key);
    });
  });

  it("remembers and clears only the exact pending item", async () => {
    await rememberPendingBuyerCheckout("course", "course-1", "/courses");
    await expect(readPendingBuyerCheckout("course")).resolves.toMatchObject({
      kind: "course",
      itemId: "course-1",
      returnPath: "/courses"
    });
    await expect(clearPendingBuyerCheckout("course", "course-2")).resolves.toBe(false);
    await expect(readPendingBuyerCheckout("course")).resolves.toMatchObject({
      itemId: "course-1"
    });
    await expect(clearPendingBuyerCheckout("course", "course-1")).resolves.toBe(true);
    await expect(readPendingBuyerCheckout("course")).resolves.toBeNull();
  });

  it("polls until server authority confirms or terminates access", async () => {
    const read = jest
      .fn()
      .mockResolvedValueOnce({ status: "pending" })
      .mockResolvedValueOnce({ status: "pending" })
      .mockResolvedValueOnce({ status: "confirmed" });
    const wait = jest.fn().mockResolvedValue(undefined);

    await expect(
      pollAuthoritativeCheckoutStatus<{ status: "pending" | "confirmed" }>({
        classify: (snapshot) => snapshot.status,
        delaysMs: [0, 1, 2],
        read,
        wait
      })
    ).resolves.toMatchObject({
      attempts: 3,
      state: "confirmed",
      snapshot: { status: "confirmed" }
    });
    expect(wait).toHaveBeenCalledTimes(2);
  });
});
