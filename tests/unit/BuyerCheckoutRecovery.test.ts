import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  clearPendingBuyerCheckout,
  pollAuthoritativeCheckoutStatus,
  readPendingBuyerCheckout,
  rememberPendingBuyerCheckout,
  type AuthoritativeCheckoutState
} from "@/utils/buyerCheckoutRecovery";

describe("buyer checkout recovery", () => {
  beforeEach(() => {
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
    jest.mocked(AsyncStorage.clear).mockImplementation(async () => {
      storage.clear();
    });
  });

  it("persists only the selected buyer item and clears the matching checkout", async () => {
    await rememberPendingBuyerCheckout("course", "course-1", "/courses");

    await expect(readPendingBuyerCheckout("course")).resolves.toMatchObject({
      kind: "course",
      itemId: "course-1",
      returnPath: "/courses"
    });
    await expect(clearPendingBuyerCheckout("course", "course-2")).resolves.toBe(false);
    await expect(readPendingBuyerCheckout("course")).resolves.not.toBeNull();
    await expect(clearPendingBuyerCheckout("course", "course-1")).resolves.toBe(true);
    await expect(readPendingBuyerCheckout("course")).resolves.toBeNull();
  });

  it("bounds polling and stops only on authoritative confirmation or terminal state", async () => {
    const read = jest
      .fn()
      .mockResolvedValueOnce({ state: "pending" })
      .mockResolvedValueOnce({ state: "unknown" })
      .mockResolvedValueOnce({ state: "confirmed" });
    const wait = jest.fn().mockResolvedValue(undefined);

    const result = await pollAuthoritativeCheckoutStatus<{
      state: AuthoritativeCheckoutState;
    }>({
      classify: (snapshot) => snapshot.state,
      delaysMs: [0, 10, 20, 40],
      read,
      wait
    });

    expect(result).toMatchObject({ attempts: 3, state: "confirmed" });
    expect(read).toHaveBeenCalledTimes(3);
    expect(wait).toHaveBeenCalledTimes(2);
  });
});
