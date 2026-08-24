import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  forgetPendingHarvestResultDeletion,
  loadPendingHarvestResultDeletion,
  rememberPendingHarvestResultDeletion
} from "@/features/personal/tools/harvestResultDeletionPersistence";

let mockStorage: Record<string, string> = {};

describe("Harvest result deletion retry receipt", () => {
  beforeEach(async () => {
    mockStorage = {};
    (AsyncStorage.getItem as jest.Mock).mockImplementation(
      async (key: string) => mockStorage[key] ?? null
    );
    (AsyncStorage.setItem as jest.Mock).mockImplementation(
      async (key: string, value: string) => {
        mockStorage[key] = String(value);
      }
    );
    (AsyncStorage.clear as jest.Mock).mockImplementation(async () => {
      mockStorage = {};
    });
    await AsyncStorage.clear();
  });

  it("persists only the opaque run id and digested account/workspace identity", async () => {
    const pending = await rememberPendingHarvestResultDeletion({
      accountId: "private-account@example.com",
      workspaceKey: "facility:private-facility-name",
      toolRunId: "harvest-run-private-1",
      deleteSourceVideo: false
    });

    expect(pending).toEqual(
      expect.objectContaining({
        toolRunId: "harvest-run-private-1",
        deleteSourceVideo: false,
        accountDigest: expect.stringMatching(/^[a-f0-9]{64}$/),
        workspaceDigest: expect.stringMatching(/^[a-f0-9]{64}$/)
      })
    );
    const serialized = JSON.stringify(mockStorage);
    expect(serialized).not.toContain("private-account@example.com");
    expect(serialized).not.toContain("private-facility-name");
    expect(serialized).toContain("harvest-run-private-1");

    await expect(
      loadPendingHarvestResultDeletion({
        accountId: "private-account@example.com",
        workspaceKey: "facility:private-facility-name"
      })
    ).resolves.toMatchObject({
      toolRunId: "harvest-run-private-1",
      deleteSourceVideo: false
    });
  });

  it("refuses a different source-video choice and forgets only the exact receipt", async () => {
    const pending = await rememberPendingHarvestResultDeletion({
      accountId: "account-1",
      workspaceKey: "personal:self",
      toolRunId: "harvest-run-1",
      deleteSourceVideo: false
    });

    await expect(
      rememberPendingHarvestResultDeletion({
        accountId: "account-1",
        workspaceKey: "personal:self",
        toolRunId: "harvest-run-1",
        deleteSourceVideo: true
      })
    ).rejects.toThrow(/different source-video choice/i);

    await forgetPendingHarvestResultDeletion(pending);
    await expect(
      loadPendingHarvestResultDeletion({
        accountId: "account-1",
        workspaceKey: "personal:self"
      })
    ).resolves.toBeNull();
  });
});
