import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  clearGiftClaimToken,
  GIFT_CLAIM_TOKEN_STORAGE_KEY,
  readGiftClaimToken,
  writeGiftClaimToken
} from "@/utils/giftClaimTokenStore";

describe("gift claim token storage", () => {
  const originalWindow = (globalThis as any).window;

  beforeEach(async () => {
    (globalThis as any).window = undefined;
    await clearGiftClaimToken();
    await AsyncStorage.clear();
  });

  afterAll(() => {
    (globalThis as any).window = originalWindow;
  });

  it("uses AsyncStorage as the native fallback", async () => {
    await expect(writeGiftClaimToken("native-gift-token")).resolves.toBe(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      GIFT_CLAIM_TOKEN_STORAGE_KEY,
      "native-gift-token"
    );
    await expect(readGiftClaimToken()).resolves.toBe("native-gift-token");

    await clearGiftClaimToken();
    await expect(readGiftClaimToken()).resolves.toBe("");
  });

  it("uses sessionStorage in a browser and clears it", async () => {
    const values = new Map<string, string>();
    const sessionStorage = {
      getItem: jest.fn((key: string) => values.get(key) ?? null),
      removeItem: jest.fn((key: string) => values.delete(key)),
      setItem: jest.fn((key: string, value: string) => values.set(key, value))
    };
    (globalThis as any).window = { sessionStorage };

    await writeGiftClaimToken("browser-gift-token");
    expect(sessionStorage.setItem).toHaveBeenCalledWith(
      GIFT_CLAIM_TOKEN_STORAGE_KEY,
      "browser-gift-token"
    );
    await expect(readGiftClaimToken()).resolves.toBe("browser-gift-token");

    await clearGiftClaimToken();
    expect(sessionStorage.removeItem).toHaveBeenCalledWith(GIFT_CLAIM_TOKEN_STORAGE_KEY);
    await expect(readGiftClaimToken()).resolves.toBe("");
  });
});
