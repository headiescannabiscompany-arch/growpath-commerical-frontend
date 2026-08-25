import React from "react";
import { Pressable, Text, View } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import { useHarvestDeepReview } from "@/features/personal/tools/useHarvestDeepReview";

const mockQuote = jest.fn();
const mockStart = jest.fn();
const mockFind = jest.fn();
const mockGet = jest.fn();
const mockRetry = jest.fn();
const mockDiscard = jest.fn();
const mockLoad = jest.fn();
const mockPrepare = jest.fn();
const mockRememberDispatch = jest.fn();
const mockRememberOperation = jest.fn();
const mockForget = jest.fn();
const mockOnResult = jest.fn();
const mockOnDiscarded = jest.fn();

jest.mock("@/auth/AuthContext", () => ({
  useOptionalAuth: () => ({ user: { id: "account-1" } })
}));

jest.mock("@/api/harvestVision", () => ({
  quoteDeepTrichomeReview: (...args: any[]) => mockQuote(...args),
  startDeepTrichomeReview: (...args: any[]) => mockStart(...args),
  findDeepTrichomeReviewOperation: (...args: any[]) => mockFind(...args),
  getDeepTrichomeReviewOperation: (...args: any[]) => mockGet(...args),
  retryPristineDeepTrichomeReviewOperation: (...args: any[]) => mockRetry(...args),
  discardUnsavedDeepTrichomeReview: (...args: any[]) => mockDiscard(...args)
}));

jest.mock("@/features/personal/tools/harvestDeepReviewPersistence", () => ({
  loadHarvestDeepReview: (...args: any[]) => mockLoad(...args),
  prepareHarvestDeepReview: (...args: any[]) => mockPrepare(...args),
  rememberHarvestDeepReviewDispatch: (...args: any[]) => mockRememberDispatch(...args),
  rememberHarvestDeepReviewOperation: (...args: any[]) => mockRememberOperation(...args),
  forgetHarvestDeepReview: (...args: any[]) => mockForget(...args)
}));

const digest = (character: string) => character.repeat(64);
const expiresAt = "2099-08-23T18:00:00.000Z";
const quote = {
  version: "harvest-analysis-quote-v1" as const,
  tokenVersion: "harvest-deep-quote-v1" as const,
  token: "signed-deep-token",
  keyId: "harvest-receipt-key-1",
  analysisMode: "deep" as const,
  selectedEvidenceCount: 13,
  analyzedEvidenceCount: 13,
  duplicateEvidenceCount: 0,
  sourceVideoSelected: false,
  evidenceCount: 13,
  batchCount: 2,
  creditsQuoted: 2,
  manifestDigest: digest("a"),
  selectedEvidenceDigest: digest("b"),
  analyzedEvidenceDigest: digest("c"),
  expiresAt
};
const savedDeepResult = {
  analysisMode: "deep" as const,
  analysisId: "saved-analysis-1",
  manifestDigest: quote.manifestDigest,
  selectedEvidenceDigest: quote.selectedEvidenceDigest,
  analyzedEvidenceDigest: quote.analyzedEvidenceDigest,
  selectedEvidenceAssetIds: Array.from(
    { length: 13 },
    (_, index) => `evidence-${index + 1}`
  ),
  evidenceUsed: Array.from({ length: 13 }, (_, index) => `evidence-${index + 1}`),
  batchCount: 2,
  creditsQuoted: 2,
  analysisReceipt: {
    normalizedHarvestResultDigest: digest("8")
  }
};
const prepared = {
  accountDigest: digest("d"),
  workspaceDigest: digest("e"),
  scopeDigest: digest("f"),
  clientOperationKey: "harvest-deep-stable-key-1",
  operationId: null,
  requestDigest: null,
  manifestDigest: quote.manifestDigest,
  selectedEvidenceDigest: quote.selectedEvidenceDigest,
  analyzedEvidenceDigest: quote.analyzedEvidenceDigest,
  selectedEvidenceCount: 13,
  analyzedEvidenceCount: 13,
  batchCount: 2,
  creditsQuoted: 2,
  quoteExpiresAt: expiresAt,
  dispatchAttemptCount: 0,
  lastDispatchAt: null,
  updatedAt: "2026-08-23T12:00:00.000Z"
};

function operation(status: "queued" | "processing" | "succeeded" = "queued") {
  return {
    operation: {
      id: "operation-deep-1",
      status,
      analysisMode: "deep" as const,
      clientOperationKey: prepared.clientOperationKey,
      requestDigest: digest("9"),
      batchCount: 2,
      completedBatches: status === "succeeded" ? 2 : status === "processing" ? 1 : 0,
      creditsQuoted: 2
    }
  };
}

let latestHook: ReturnType<typeof useHarvestDeepReview> | null = null;

function Probe({ scopeKey = "scope-1" }: { scopeKey?: string }) {
  const review = useHarvestDeepReview({
    enabled: true,
    scopeKey,
    workspaceKey: "personal:self",
    expectedImageCount: 13,
    analysisInput: {
      growId: "grow-1",
      evidenceAssetIds: Array.from({ length: 13 }, (_, index) => `evidence-${index + 1}`),
      workspaceType: "personal",
      sampleLocation: "mixed_bud_sites"
    },
    onResult: mockOnResult,
    onDiscarded: mockOnDiscarded
  });
  latestHook = review;
  return (
    <View>
      <Pressable accessibilityLabel="quote" onPress={review.requestQuote} />
      <Pressable accessibilityLabel="accept" onPress={review.acceptQuote} />
      <Pressable accessibilityLabel="start" onPress={review.start} />
      <Pressable accessibilityLabel="recover" onPress={review.refresh} />
      <Pressable
        accessibilityLabel="retry same"
        onPress={() => review.recoverAndRetryFailedById("operation-deep-1")}
      />
      <Pressable
        accessibilityLabel="recover saved"
        onPress={() =>
          review.recoverSucceededById("operation-deep-saved-1", savedDeepResult as any)
        }
      />
      <Pressable accessibilityLabel="reset" onPress={review.resetTerminal} />
      <Pressable accessibilityLabel="discard" onPress={review.discardSucceeded} />
      <Text>{review.busy || "idle"}</Text>
      <Text>{review.quote?.analysisMode || "no-quote"}</Text>
      <Text>{review.quoteAccepted ? "accepted" : "not-accepted"}</Text>
      <Text>{review.operation?.id || "no-operation"}</Text>
      <Text>{review.recoveryPending ? "recovery-pending" : "no-recovery"}</Text>
      <Text>{review.notice || "no-notice"}</Text>
      <Text>{review.error || "no-error"}</Text>
    </View>
  );
}

describe("Harvest Deep review durable frontend operation", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    latestHook = null;
    mockLoad.mockResolvedValue(null);
    mockQuote.mockResolvedValue(quote);
    mockPrepare.mockResolvedValue(prepared);
    mockRememberDispatch.mockImplementation(async (entry) => ({
      ...entry,
      dispatchAttemptCount: entry.dispatchAttemptCount + 1,
      lastDispatchAt: "2026-08-23T12:01:00.000Z"
    }));
    mockRememberOperation.mockImplementation(async (entry, identity) => ({
      ...entry,
      operationId: identity.operationId,
      requestDigest: identity.requestDigest
    }));
    mockForget.mockResolvedValue(undefined);
    mockFind.mockResolvedValue(null);
    mockGet.mockResolvedValue(operation("processing"));
    mockRetry.mockResolvedValue({
      operation: {
        ...operation("queued").operation,
        creditState: "not_reserved"
      },
      retried: true
    });
    mockDiscard.mockResolvedValue({
      success: true,
      discarded: true,
      permanent: true,
      evidenceDeleted: false,
      sourceVideoDeleted: false,
      operation: {
        id: "operation-deep-1",
        status: "failed",
        state: "failed",
        analysisMode: "deep",
        errorCode: "HARVEST_RESULT_DELETED",
        failureMessage: "The unsaved completed Deep result was discarded.",
        discardedAt: "2026-08-24T10:05:00.000Z",
        result: null
      }
    });
  });

  async function quoteAndAccept(screen: ReturnType<typeof render>) {
    await waitFor(() => expect(screen.getByText("idle")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("quote"));
    await waitFor(() => expect(screen.getByText("deep")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("accept"));
    await waitFor(() => expect(screen.getByText("accepted")).toBeTruthy());
  }

  it("persists one stable key before the first provider-operation dispatch", async () => {
    mockStart.mockResolvedValue(operation("queued"));
    const screen = render(<Probe />);
    await quoteAndAccept(screen);

    fireEvent.press(screen.getByLabelText("start"));
    await waitFor(() => expect(screen.getByText("operation-deep-1")).toBeTruthy());

    expect(mockPrepare).toHaveBeenCalledWith(
      expect.objectContaining({
        scopeKey: "scope-1",
        quoteExpiresAt: expiresAt,
        selectedEvidenceCount: 13,
        creditsQuoted: 2
      })
    );
    expect(mockRememberDispatch.mock.invocationCallOrder[0]).toBeLessThan(
      mockStart.mock.invocationCallOrder[0]
    );
    expect(mockStart).toHaveBeenCalledWith(
      expect.objectContaining({
        clientOperationKey: prepared.clientOperationKey,
        deepReviewQuoteToken: quote.token,
        creditsQuoted: 2
      }),
      expect.objectContaining({ signal: expect.anything() })
    );
  });

  it("retries a never-received start once with the same key after an authoritative miss", async () => {
    mockStart
      .mockRejectedValueOnce(new Error("connection interrupted"))
      .mockResolvedValueOnce(operation("queued"));
    mockFind.mockResolvedValueOnce(null);
    const screen = render(<Probe />);
    await quoteAndAccept(screen);

    fireEvent.press(screen.getByLabelText("start"));
    await waitFor(() => expect(screen.getByText("recovery-pending")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("recover"));
    await waitFor(() => expect(screen.getByText("operation-deep-1")).toBeTruthy());

    expect(mockFind).toHaveBeenCalledTimes(1);
    expect(mockStart).toHaveBeenCalledTimes(2);
    expect(mockStart.mock.calls[0][0].clientOperationKey).toBe(
      prepared.clientOperationKey
    );
    expect(mockStart.mock.calls[1][0].clientOperationKey).toBe(
      prepared.clientOperationKey
    );
  });

  it("adopts a lost-202 operation by key without resubmitting it", async () => {
    mockStart.mockRejectedValueOnce(new Error("response lost"));
    mockFind.mockResolvedValueOnce(operation("processing"));
    const screen = render(<Probe />);
    await quoteAndAccept(screen);

    fireEvent.press(screen.getByLabelText("start"));
    await waitFor(() => expect(screen.getByText("recovery-pending")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("recover"));
    await waitFor(() => expect(screen.getByText("operation-deep-1")).toBeTruthy());

    expect(mockFind).toHaveBeenCalledTimes(1);
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it("falls back to exact by-key recovery when a saved operation id is no longer addressable", async () => {
    const persistedOperation = {
      ...prepared,
      operationId: "operation-deep-old-route",
      requestDigest: digest("9"),
      dispatchAttemptCount: 1,
      lastDispatchAt: "2026-08-23T12:01:00.000Z"
    };
    mockLoad.mockResolvedValueOnce(persistedOperation);
    mockGet.mockRejectedValueOnce({ status: 404, code: "OPERATION_NOT_FOUND" });
    mockFind.mockResolvedValueOnce(operation("processing"));

    const screen = render(<Probe />);
    await waitFor(() => expect(screen.getByText("operation-deep-1")).toBeTruthy());

    expect(mockGet).toHaveBeenCalledWith(
      "operation-deep-old-route",
      { workspaceType: "personal" },
      expect.objectContaining({ signal: expect.anything() })
    );
    expect(mockFind).toHaveBeenCalledWith(
      prepared.clientOperationKey,
      { workspaceType: "personal" },
      expect.objectContaining({ signal: expect.anything() })
    );
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("retains and retries the same accepted operation after a pristine uncharged failure", async () => {
    mockStart.mockResolvedValue({
      operation: {
        ...operation("queued").operation,
        status: "failed",
        creditState: "not_reserved",
        errorCode: "PROVIDER_UNAVAILABLE",
        failureMessage: "Provider unavailable before reservation."
      }
    });
    const screen = render(<Probe />);
    await quoteAndAccept(screen);

    fireEvent.press(screen.getByLabelText("start"));
    await waitFor(() =>
      expect(screen.getByText("Provider unavailable before reservation.")).toBeTruthy()
    );
    expect(latestHook?.terminalResetAllowed).toBe(false);
    expect(latestHook?.retryablePristineFailure).toBe(true);
    expect(mockForget).not.toHaveBeenCalled();

    mockGet.mockResolvedValueOnce({
      operation: {
        ...operation("queued").operation,
        status: "failed",
        creditState: "not_reserved",
        errorCode: "PROVIDER_UNAVAILABLE",
        failureMessage: "Provider unavailable before reservation."
      }
    });
    fireEvent.press(screen.getByLabelText("retry same"));
    await waitFor(() => expect(latestHook?.operation?.status).toBe("queued"));

    expect(mockRetry).toHaveBeenCalledWith(
      "operation-deep-1",
      { workspaceType: "personal" },
      expect.objectContaining({ signal: expect.anything() })
    );
    expect(mockPrepare).toHaveBeenCalledTimes(1);
    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/same accepted Deep review is queued safely/i)).toBeTruthy();
  });

  it("keeps a failed dispatched reservation recoverable for support reconciliation", async () => {
    mockStart.mockResolvedValue({
      operation: {
        ...operation("queued").operation,
        status: "failed",
        creditState: "reserved",
        errorCode: "HARVEST_DEEP_DISPATCH_RECONCILIATION_REQUIRED",
        failureMessage: "The accepted credits remain reserved for support reconciliation."
      }
    });
    const screen = render(<Probe />);
    await quoteAndAccept(screen);

    fireEvent.press(screen.getByLabelText("start"));
    await waitFor(() =>
      expect(
        screen.getByText(
          "The accepted credits remain reserved for support reconciliation."
        )
      ).toBeTruthy()
    );
    expect(
      screen.getByText(
        "No partial Deep review was used, and GrowPath will not send this batch again. The accepted credits remain reserved while support reconciles the provider dispatch."
      )
    ).toBeTruthy();
    expect(latestHook?.terminalResetAllowed).toBe(false);
    expect(latestHook?.recoveryPending).toBe(true);
    expect(mockForget).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText("reset"));
    expect(screen.getByText("operation-deep-1")).toBeTruthy();
  });

  it("clears an owner-deleted completed-result tombstone without promising retry or refund", async () => {
    mockStart.mockResolvedValue({
      operation: {
        ...operation("queued").operation,
        status: "failed",
        creditState: "charged",
        errorCode: "HARVEST_RESULT_DELETED",
        failureMessage:
          "This completed Harvest result was permanently deleted by its owner."
      }
    });
    const screen = render(<Probe />);
    await quoteAndAccept(screen);

    fireEvent.press(screen.getByLabelText("start"));
    await waitFor(() => expect(screen.getByText("no-operation")).toBeTruthy());
    expect(
      screen.getByText(
        "This completed Harvest result was permanently deleted by its owner."
      )
    ).toBeTruthy();
    expect(screen.getByText("no-error")).toBeTruthy();
    expect(screen.getByText("no-recovery")).toBeTruthy();
    expect(latestHook?.terminalResetAllowed).toBe(false);
    expect(mockForget).toHaveBeenCalled();
  });

  it("discards only a succeeded unsaved Deep result and keeps its media and charge", async () => {
    mockStart.mockResolvedValue({
      ...operation("succeeded"),
      result: { photoUsable: true }
    });
    const screen = render(<Probe />);
    await quoteAndAccept(screen);

    fireEvent.press(screen.getByLabelText("start"));
    await waitFor(() => expect(screen.getByText("operation-deep-1")).toBeTruthy());
    expect(mockOnResult).toHaveBeenCalledWith(
      { photoUsable: true },
      expect.objectContaining({ operationId: "operation-deep-1", creditsQuoted: 2 })
    );
    expect(screen.getByText("no-recovery")).toBeTruthy();
    expect(mockForget).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText("discard"));
    await waitFor(() => expect(screen.getByText("no-operation")).toBeTruthy());

    expect(mockDiscard).toHaveBeenCalledWith(
      "operation-deep-1",
      { workspaceType: "personal" },
      expect.objectContaining({ signal: expect.anything() })
    );
    expect(mockOnDiscarded).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/charged AI credits were not refunded/i)).toBeTruthy();
    expect(screen.getByText(/source video and retained frames were kept/i)).toBeTruthy();
  });

  it("restores a completed result and its operation id after a reload", async () => {
    const persistedOperation = {
      ...prepared,
      operationId: "operation-deep-1",
      requestDigest: digest("9"),
      dispatchAttemptCount: 1,
      lastDispatchAt: "2026-08-23T12:01:00.000Z"
    };
    mockLoad.mockResolvedValueOnce(persistedOperation);
    mockGet.mockResolvedValueOnce({
      ...operation("succeeded"),
      result: { photoUsable: true }
    });

    const screen = render(<Probe />);

    await waitFor(() => expect(screen.getByText("operation-deep-1")).toBeTruthy());
    expect(mockOnResult).toHaveBeenCalledWith(
      { photoUsable: true },
      expect.objectContaining({ operationId: "operation-deep-1", creditsQuoted: 2 })
    );
    expect(screen.getByText("no-recovery")).toBeTruthy();
    expect(mockForget).not.toHaveBeenCalled();
    expect(mockStart).not.toHaveBeenCalled();
  });

  it("recovers the exact saved-run operation when local mapping is missing", async () => {
    mockGet.mockResolvedValueOnce({
      operation: {
        ...operation("succeeded").operation,
        id: "operation-deep-saved-1"
      },
      result: savedDeepResult
    });
    const screen = render(<Probe />);
    await waitFor(() => expect(screen.getByText("idle")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("recover saved"));

    await waitFor(() => expect(screen.getByText("operation-deep-saved-1")).toBeTruthy());
    expect(mockGet).toHaveBeenCalledWith(
      "operation-deep-saved-1",
      { workspaceType: "personal" },
      expect.objectContaining({ signal: expect.anything() })
    );
    expect(mockOnResult).toHaveBeenCalledWith(
      savedDeepResult,
      expect.objectContaining({
        operationId: "operation-deep-saved-1",
        selectedEvidenceCount: 13,
        creditsQuoted: 2
      })
    );
    expect(mockStart).not.toHaveBeenCalled();
    expect(mockPrepare).not.toHaveBeenCalled();
  });

  it("durably clears a completed operation when the owner prepares a new review", async () => {
    let durableOperation: typeof prepared | null = null;
    mockLoad.mockImplementation(async () => durableOperation);
    mockPrepare.mockImplementationOnce(async () => {
      durableOperation = prepared;
      return prepared;
    });
    mockRememberDispatch.mockImplementationOnce(async (entry) => {
      durableOperation = {
        ...entry,
        dispatchAttemptCount: entry.dispatchAttemptCount + 1,
        lastDispatchAt: "2026-08-23T12:01:00.000Z"
      };
      return durableOperation;
    });
    mockRememberOperation.mockImplementationOnce(async (entry, identity) => {
      durableOperation = {
        ...entry,
        operationId: identity.operationId,
        requestDigest: identity.requestDigest
      };
      return durableOperation;
    });
    mockForget.mockImplementationOnce(async () => {
      durableOperation = null;
    });
    mockStart.mockResolvedValue({
      ...operation("succeeded"),
      result: { photoUsable: true }
    });
    const screen = render(<Probe />);
    await quoteAndAccept(screen);

    fireEvent.press(screen.getByLabelText("start"));
    await waitFor(() => expect(screen.getByText("operation-deep-1")).toBeTruthy());
    fireEvent.press(screen.getByLabelText("reset"));
    await waitFor(() => expect(screen.getByText("no-operation")).toBeTruthy());
    expect(mockForget).toHaveBeenCalledTimes(1);

    screen.unmount();
    const reloaded = render(<Probe />);
    await waitFor(() => expect(reloaded.getByText("idle")).toBeTruthy());
    expect(reloaded.getByText("no-operation")).toBeTruthy();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("invalidates the quote immediately when its evidence or provider context scope changes", async () => {
    const screen = render(<Probe />);
    await quoteAndAccept(screen);

    screen.rerender(<Probe scopeKey="scope-after-notes-change" />);
    await waitFor(() => expect(screen.getByText("no-quote")).toBeTruthy());
    expect(screen.getByText("not-accepted")).toBeTruthy();
    expect(latestHook?.recoveryPending).toBe(false);
  });

  it("treats an apiRequest ABORTED rejection after scope cancellation as cancellation", async () => {
    let rejectQuote: ((reason: any) => void) | undefined;
    const delayedQuote = new Promise((_resolve, reject) => {
      rejectQuote = reject;
    });
    mockQuote.mockReturnValueOnce(delayedQuote);
    const screen = render(<Probe />);
    await waitFor(() => expect(screen.getByText("idle")).toBeTruthy());

    fireEvent.press(screen.getByLabelText("quote"));
    await waitFor(() => expect(screen.getByText("quoting")).toBeTruthy());
    const signal = mockQuote.mock.calls[0][1].signal;
    screen.rerender(<Probe scopeKey="scope-after-abort" />);
    await waitFor(() => expect(signal.aborted).toBe(true));
    rejectQuote?.(Object.assign(new Error("request aborted"), { code: "ABORTED" }));
    await delayedQuote.catch(() => undefined);

    await waitFor(() => expect(screen.getByText("idle")).toBeTruthy());
    expect(screen.getByText("no-error")).toBeTruthy();
    expect(screen.queryByText("request aborted")).toBeNull();
  });
});
