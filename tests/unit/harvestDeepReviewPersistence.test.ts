import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  forgetHarvestDeepReview,
  loadHarvestDeepReview,
  prepareHarvestDeepReview,
  rememberHarvestDeepReviewDispatch,
  rememberHarvestDeepReviewOperation
} from "@/features/personal/tools/harvestDeepReviewPersistence";

let mockStorage: Record<string, string> = {};

const digest = (character: string) => character.repeat(64);

describe("Harvest Deep review durable request metadata", () => {
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
    await AsyncStorage.clear();
  });

  it("persists the stable key before dispatch without raw account, workspace, or notes", async () => {
    const prepared = await prepareHarvestDeepReview({
      accountId: "private-user-17",
      workspaceKey: "facility:private-facility-42",
      scopeKey: "harvest-analysis:private notes about the grow",
      manifestDigest: digest("a"),
      selectedEvidenceDigest: digest("b"),
      analyzedEvidenceDigest: digest("c"),
      selectedEvidenceCount: 25,
      analyzedEvidenceCount: 24,
      batchCount: 2,
      creditsQuoted: 2,
      quoteExpiresAt: "2026-08-23T18:00:00.000Z"
    });

    expect(prepared).toEqual(
      expect.objectContaining({
        clientOperationKey: expect.any(String),
        operationId: null,
        requestDigest: null,
        dispatchAttemptCount: 0,
        lastDispatchAt: null
      })
    );
    const serialized = JSON.stringify(mockStorage);
    expect(serialized).not.toContain("private-user-17");
    expect(serialized).not.toContain("private-facility-42");
    expect(serialized).not.toContain("private notes about the grow");
    expect(serialized).toContain(prepared.clientOperationKey);
  });

  it("bounds same-key dispatches, then binds the backend operation identity", async () => {
    const prepared = await prepareHarvestDeepReview({
      accountId: "account-1",
      workspaceKey: "personal:self",
      scopeKey: "scope-1",
      manifestDigest: digest("a"),
      selectedEvidenceDigest: digest("b"),
      analyzedEvidenceDigest: digest("c"),
      selectedEvidenceCount: 13,
      analyzedEvidenceCount: 13,
      batchCount: 2,
      creditsQuoted: 2,
      quoteExpiresAt: "2026-08-23T18:00:00.000Z"
    });
    const firstDispatch = await rememberHarvestDeepReviewDispatch(prepared);
    const sameKeyRetry = await rememberHarvestDeepReviewDispatch(firstDispatch);

    expect(sameKeyRetry.clientOperationKey).toBe(prepared.clientOperationKey);
    expect(sameKeyRetry.dispatchAttemptCount).toBe(2);
    await expect(rememberHarvestDeepReviewDispatch(sameKeyRetry)).rejects.toThrow(
      /bounded Deep review dispatch metadata/i
    );

    const bound = await rememberHarvestDeepReviewOperation(sameKeyRetry, {
      operationId: "operation-deep-1",
      requestDigest: digest("d"),
      clientOperationKey: sameKeyRetry.clientOperationKey
    });
    await expect(
      loadHarvestDeepReview({
        accountId: "account-1",
        workspaceKey: "personal:self",
        scopeKey: "scope-1"
      })
    ).resolves.toMatchObject({
      operationId: "operation-deep-1",
      requestDigest: digest("d"),
      dispatchAttemptCount: 2
    });

    await forgetHarvestDeepReview(bound);
    await expect(
      loadHarvestDeepReview({
        accountId: "account-1",
        workspaceKey: "personal:self",
        scopeKey: "scope-1"
      })
    ).resolves.toBeNull();
  });

  it("does not silently expire an unresolved stable request before authoritative recovery", async () => {
    await prepareHarvestDeepReview({
      accountId: "account-1",
      workspaceKey: "personal:self",
      scopeKey: "scope-unresolved",
      manifestDigest: digest("a"),
      selectedEvidenceDigest: digest("b"),
      analyzedEvidenceDigest: digest("c"),
      selectedEvidenceCount: 13,
      analyzedEvidenceCount: 13,
      batchCount: 2,
      creditsQuoted: 2,
      quoteExpiresAt: "2026-08-23T18:00:00.000Z"
    });
    const storageKey = Object.keys(mockStorage)[0];
    const entries = JSON.parse(mockStorage[storageKey]);
    entries[0].updatedAt = "2020-01-01T00:00:00.000Z";
    mockStorage[storageKey] = JSON.stringify(entries);

    await expect(
      loadHarvestDeepReview({
        accountId: "account-1",
        workspaceKey: "personal:self",
        scopeKey: "scope-unresolved"
      })
    ).resolves.toEqual(
      expect.objectContaining({
        clientOperationKey: expect.any(String),
        updatedAt: "2020-01-01T00:00:00.000Z"
      })
    );
  });
});
