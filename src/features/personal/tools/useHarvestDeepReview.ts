import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  discardUnsavedDeepTrichomeReview,
  findDeepTrichomeReviewOperation,
  getDeepTrichomeReviewOperation,
  quoteDeepTrichomeReview,
  startDeepTrichomeReview,
  type HarvestDeepReviewOperation,
  type HarvestDeepReviewOperationPacket,
  type HarvestDeepReviewQuote,
  type HarvestTrichomeAnalysisInput,
  type TrichomeVisionResult
} from "@/api/harvestVision";
import { useOptionalAuth } from "@/auth/AuthContext";
import {
  forgetHarvestDeepReview,
  loadHarvestDeepReview,
  prepareHarvestDeepReview,
  rememberHarvestDeepReviewDispatch,
  rememberHarvestDeepReviewOperation,
  type PersistedHarvestDeepReview
} from "@/features/personal/tools/harvestDeepReviewPersistence";

const POLL_DELAYS_MS = [1500, 2500, 4000, 6000, 9000, 12000, 20000, 30000];
const MAX_AUTOMATIC_POLLS = 60;
// The backend performs bounded protected-object revalidation before it can
// persist the queue record. Never clear a same-ID recovery marker while that
// accepted start can still be settling server-side.
const LOST_START_CLEAR_GRACE_MS = 180_000;

type ResultContext = {
  manifestDigest: string;
  selectedEvidenceDigest: string;
  analyzedEvidenceDigest: string;
  selectedEvidenceCount: number;
  analyzedEvidenceCount: number;
  batchCount: number;
  creditsQuoted: number;
  operationId: string;
};

type Options = {
  enabled: boolean;
  scopeKey: string;
  workspaceKey: string;
  expectedImageCount: number;
  analysisInput: HarvestTrichomeAnalysisInput;
  onResult: (result: TrichomeVisionResult, context: ResultContext) => void;
  onDiscarded?: () => void;
};

function isAbort(error: any, signal?: AbortSignal) {
  return (
    signal?.aborted ||
    error?.name === "AbortError" ||
    String(error?.code || "").toUpperCase() === "ABORT_ERR"
  );
}

async function recoverPersistedOperation(
  persisted: PersistedHarvestDeepReview,
  workspace: {
    workspaceType: HarvestTrichomeAnalysisInput["workspaceType"];
    workspaceId?: string;
    facilityId?: string;
  },
  signal: AbortSignal
) {
  if (!persisted.operationId) {
    return findDeepTrichomeReviewOperation(persisted.clientOperationKey, workspace, {
      signal
    });
  }
  try {
    return await getDeepTrichomeReviewOperation(persisted.operationId, workspace, {
      signal
    });
  } catch (error: any) {
    const status = Number(error?.status || 0);
    const code = String(error?.code || "").toUpperCase();
    if (status !== 404 && !["NOT_FOUND", "OPERATION_NOT_FOUND"].includes(code)) {
      throw error;
    }
    return findDeepTrichomeReviewOperation(persisted.clientOperationKey, workspace, {
      signal
    });
  }
}

export function useHarvestDeepReview({
  enabled,
  scopeKey,
  workspaceKey,
  expectedImageCount,
  analysisInput,
  onResult,
  onDiscarded
}: Options) {
  const auth = useOptionalAuth();
  const accountId = String(auth?.user?.id || auth?.user?._id || "").trim();
  const workspace = useMemo(
    () => ({
      workspaceType: analysisInput.workspaceType,
      ...(analysisInput.workspaceId ? { workspaceId: analysisInput.workspaceId } : {}),
      ...(analysisInput.facilityId ? { facilityId: analysisInput.facilityId } : {})
    }),
    [analysisInput.facilityId, analysisInput.workspaceId, analysisInput.workspaceType]
  );
  const [quote, setQuote] = useState<HarvestDeepReviewQuote | null>(null);
  const [quoteScopeKey, setQuoteScopeKey] = useState("");
  const [acceptedQuoteToken, setAcceptedQuoteToken] = useState("");
  const [operation, setOperation] = useState<HarvestDeepReviewOperation | null>(null);
  const [busy, setBusy] = useState<
    "restoring" | "quoting" | "starting" | "polling" | "discarding" | null
  >(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [autoPoll, setAutoPoll] = useState(false);
  const [recoveryPending, setRecoveryPending] = useState(false);
  const mountedRef = useRef(true);
  const scopeKeyRef = useRef(scopeKey);
  const generationRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef(analysisInput);
  const onResultRef = useRef(onResult);
  const onDiscardedRef = useRef(onDiscarded);
  const persistedRef = useRef<PersistedHarvestDeepReview | null>(null);
  const pollCountRef = useRef(0);
  const refreshRef = useRef<(() => Promise<void>) | null>(null);
  scopeKeyRef.current = scopeKey;
  inputRef.current = analysisInput;
  onResultRef.current = onResult;
  onDiscardedRef.current = onDiscarded;

  const beginRequest = useCallback(() => {
    generationRef.current += 1;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    return { generation: generationRef.current, controller };
  }, []);

  const requestIsCurrent = useCallback(
    (requestScopeKey: string, generation: number) =>
      mountedRef.current &&
      scopeKeyRef.current === requestScopeKey &&
      generationRef.current === generation,
    []
  );

  const clearPersisted = useCallback(async () => {
    const persisted = persistedRef.current;
    persistedRef.current = null;
    setRecoveryPending(false);
    if (persisted) await forgetHarvestDeepReview(persisted).catch(() => undefined);
  }, []);

  const acceptPacket = useCallback(
    async (
      packet: HarvestDeepReviewOperationPacket,
      context: {
        manifestDigest: string;
        selectedEvidenceDigest: string;
        analyzedEvidenceDigest: string;
        selectedEvidenceCount: number;
        analyzedEvidenceCount: number;
        batchCount: number;
        creditsQuoted: number;
      },
      requestScopeKey: string,
      generation: number
    ) => {
      if (!requestIsCurrent(requestScopeKey, generation)) return;
      const persisted = persistedRef.current;
      if (
        !persisted ||
        packet.operation.clientOperationKey !== persisted.clientOperationKey ||
        (persisted.requestDigest &&
          packet.operation.requestDigest !== persisted.requestDigest) ||
        packet.operation.batchCount !== context.batchCount ||
        packet.operation.creditsQuoted !== context.creditsQuoted
      ) {
        throw new Error(
          "The recovered Deep review did not match its saved request, batch, and credit identity."
        );
      }
      setOperation(packet.operation);
      setRecoveryPending(true);
      if (["queued", "processing"].includes(packet.operation.status)) {
        setAutoPoll(true);
        setBusy(null);
        setError("");
        setNotice(
          `Deep review is ${packet.operation.status}. GrowPath has completed ${
            packet.operation.completedBatches || 0
          } of ${packet.operation.batchCount} provider batches. No partial batch result is shown before the signed aggregate is complete.`
        );
        return;
      }
      setAutoPoll(false);
      setBusy(null);
      if (packet.operation.status === "succeeded" && packet.result) {
        setError("");
        setNotice(
          `Deep review completed across ${packet.operation.batchCount} batches. GrowPath is validating the one signed aggregate result.`
        );
        onResultRef.current(packet.result, {
          manifestDigest: context.manifestDigest,
          selectedEvidenceDigest: context.selectedEvidenceDigest,
          analyzedEvidenceDigest: context.analyzedEvidenceDigest,
          selectedEvidenceCount: context.selectedEvidenceCount,
          analyzedEvidenceCount: context.analyzedEvidenceCount,
          batchCount: context.batchCount,
          creditsQuoted: context.creditsQuoted,
          operationId: packet.operation.id
        });
        await clearPersisted();
        return;
      }
      if (
        packet.operation.status === "failed" &&
        packet.operation.errorCode === "HARVEST_RESULT_DELETED"
      ) {
        setOperation(null);
        setQuote(null);
        setQuoteScopeKey("");
        setAcceptedQuoteToken("");
        setError("");
        setNotice(
          packet.operation.failureMessage ||
            "This completed paid Harvest review was later permanently deleted by its owner. No result or provider metadata can be restored, and this is not a refund or retry state."
        );
        await clearPersisted();
        return;
      }
      if (packet.operation.status === "refunded") {
        setNotice(
          `Deep review did not complete. The full ${context.creditsQuoted}-credit reservation was refunded; no partial result was used.`
        );
        setError(packet.operation.failureMessage || "The Deep review was refunded.");
        await clearPersisted();
        return;
      }
      const reconciliationHeld =
        packet.operation.status === "failed" &&
        packet.operation.creditState === "reserved";
      if (reconciliationHeld) {
        setNotice(
          "No partial Deep review was used, and GrowPath will not send this batch again. The accepted credits remain reserved while support reconciles the provider dispatch."
        );
        setError(
          packet.operation.failureMessage ||
            "The provider dispatch could not be finalized safely. Keep this operation for recovery and do not start a duplicate review."
        );
        return;
      }
      const failureWasNeverCharged = ["not_reserved", "not_charged"].includes(
        String(packet.operation.creditState || "")
      );
      const failureWasFullyRefunded =
        Number(packet.operation.creditsRefunded || 0) >= context.creditsQuoted;
      if (
        packet.operation.status === "failed" &&
        (failureWasNeverCharged || failureWasFullyRefunded)
      ) {
        setNotice(
          failureWasFullyRefunded
            ? `Deep review failed, and GrowPath confirmed the full ${context.creditsQuoted}-credit refund. No partial result was used.`
            : "Deep review failed before any credit was reserved or charged. No partial result was used."
        );
        setError(
          packet.operation.failureMessage ||
            packet.operation.errorCode ||
            "The Deep review did not complete."
        );
        await clearPersisted();
        return;
      }
      setNotice("");
      setError(
        packet.operation.failureMessage ||
          packet.operation.errorCode ||
          "Deep review failed without a confirmed settlement. Keep this operation for recovery and do not submit a duplicate review."
      );
    },
    [clearPersisted, requestIsCurrent]
  );

  const requestQuote = useCallback(async () => {
    if (!enabled || !scopeKey || !accountId || busy || operation || recoveryPending)
      return;
    const requestScopeKey = scopeKey;
    const { generation, controller } = beginRequest();
    setBusy("quoting");
    setError("");
    setNotice(
      "Checking the exact saved evidence and duplicate manifest. This quote does not send media to OpenAI or use a credit."
    );
    setQuote(null);
    setAcceptedQuoteToken("");
    try {
      const nextQuote = await quoteDeepTrichomeReview(inputRef.current, {
        signal: controller.signal
      });
      if (!requestIsCurrent(requestScopeKey, generation)) return;
      if (nextQuote.selectedEvidenceCount !== expectedImageCount) {
        throw new Error(
          "The server quote does not match the exact image set currently selected."
        );
      }
      setQuote(nextQuote);
      setQuoteScopeKey(requestScopeKey);
      setNotice(
        nextQuote.analysisMode === "deep"
          ? `Exact Deep review quote ready: ${nextQuote.analyzedEvidenceCount} unique images across ${nextQuote.batchCount} batches for ${nextQuote.creditsQuoted} credits.`
          : `The server found ${nextQuote.duplicateEvidenceCount} exact duplicate${nextQuote.duplicateEvidenceCount === 1 ? "" : "s"}; ${nextQuote.analyzedEvidenceCount} unique images qualify for the standard 1-credit review.`
      );
    } catch (caught: any) {
      if (
        isAbort(caught, controller.signal) ||
        !requestIsCurrent(requestScopeKey, generation)
      ) {
        return;
      }
      setError(caught?.message || "GrowPath could not prepare the Deep review quote.");
      setNotice("");
    } finally {
      if (requestIsCurrent(requestScopeKey, generation)) setBusy(null);
    }
  }, [
    accountId,
    beginRequest,
    busy,
    enabled,
    expectedImageCount,
    operation,
    recoveryPending,
    requestIsCurrent,
    scopeKey
  ]);

  const acceptQuote = useCallback(() => {
    if (!quote || quoteScopeKey !== scopeKey) return;
    if (quote.analysisMode !== "deep" || !quote.token || !quote.expiresAt) return;
    if (new Date(quote.expiresAt).getTime() <= Date.now()) {
      setAcceptedQuoteToken("");
      setError("This Deep review quote expired. Request a fresh exact quote.");
      return;
    }
    const token = quote.token;
    setAcceptedQuoteToken((current) => (current === token ? "" : token));
    setError("");
  }, [quote, quoteScopeKey, scopeKey]);

  const start = useCallback(async () => {
    if (
      !enabled ||
      !scopeKey ||
      !accountId ||
      busy ||
      operation ||
      recoveryPending ||
      !quote ||
      quote.analysisMode !== "deep" ||
      !quote.token ||
      !quote.expiresAt ||
      quoteScopeKey !== scopeKey ||
      acceptedQuoteToken !== quote.token
    ) {
      return false;
    }
    if (new Date(quote.expiresAt).getTime() <= Date.now()) {
      setAcceptedQuoteToken("");
      setError("This Deep review quote expired. Request a fresh exact quote.");
      return false;
    }
    const requestScopeKey = scopeKey;
    const { generation, controller } = beginRequest();
    setBusy("starting");
    setError("");
    setNotice(
      `Saving one stable request ID, then submitting the accepted ${quote.creditsQuoted}-credit Deep review once. GrowPath will recover it after a reload without duplicate dispatch or charge.`
    );
    let prepared: PersistedHarvestDeepReview | null = null;
    let submitted = false;
    try {
      prepared = await prepareHarvestDeepReview({
        accountId,
        workspaceKey,
        scopeKey: requestScopeKey,
        manifestDigest: quote.manifestDigest,
        selectedEvidenceDigest: quote.selectedEvidenceDigest,
        analyzedEvidenceDigest: quote.analyzedEvidenceDigest,
        selectedEvidenceCount: quote.selectedEvidenceCount,
        analyzedEvidenceCount: quote.analyzedEvidenceCount,
        batchCount: quote.batchCount,
        creditsQuoted: quote.creditsQuoted,
        quoteExpiresAt: quote.expiresAt
      });
      persistedRef.current = prepared;
      setRecoveryPending(true);
      if (!requestIsCurrent(requestScopeKey, generation)) return false;
      prepared = await rememberHarvestDeepReviewDispatch(prepared);
      persistedRef.current = prepared;
      if (!requestIsCurrent(requestScopeKey, generation)) return false;
      submitted = true;
      const packet = await startDeepTrichomeReview(
        {
          ...inputRef.current,
          analysisMode: "deep",
          deepReviewQuoteToken: quote.token,
          creditsQuoted: quote.creditsQuoted,
          clientOperationKey: prepared.clientOperationKey
        },
        { signal: controller.signal }
      );
      if (!requestIsCurrent(requestScopeKey, generation)) return false;
      if (
        packet.operation.creditsQuoted !== quote.creditsQuoted ||
        packet.operation.batchCount !== quote.batchCount ||
        packet.operation.clientOperationKey !== prepared.clientOperationKey
      ) {
        throw new Error(
          "The started Deep review does not match the accepted batch and credit quote."
        );
      }
      persistedRef.current = await rememberHarvestDeepReviewOperation(prepared, {
        operationId: packet.operation.id,
        requestDigest: packet.operation.requestDigest,
        clientOperationKey: packet.operation.clientOperationKey
      });
      if (!requestIsCurrent(requestScopeKey, generation)) return false;
      pollCountRef.current = 0;
      await acceptPacket(
        packet,
        {
          manifestDigest: quote.manifestDigest,
          selectedEvidenceDigest: quote.selectedEvidenceDigest,
          analyzedEvidenceDigest: quote.analyzedEvidenceDigest,
          selectedEvidenceCount: quote.selectedEvidenceCount,
          analyzedEvidenceCount: quote.analyzedEvidenceCount,
          batchCount: quote.batchCount,
          creditsQuoted: quote.creditsQuoted
        },
        requestScopeKey,
        generation
      );
      return true;
    } catch (caught: any) {
      if (
        isAbort(caught, controller.signal) ||
        !requestIsCurrent(requestScopeKey, generation)
      ) {
        return false;
      }
      setBusy(null);
      setAutoPoll(false);
      const unambiguousClientRejection =
        Number(caught?.status) >= 400 && Number(caught?.status) < 500;
      if (prepared && (!submitted || unambiguousClientRejection)) {
        await clearPersisted();
      } else if (prepared && submitted) {
        setRecoveryPending(true);
      }
      setError(
        !submitted
          ? caught?.message ||
              "GrowPath could not safely save a stable Deep review request ID, so no review was submitted."
          : unambiguousClientRejection
            ? caught?.message || "GrowPath rejected the Deep review before it started."
            : "The start response was interrupted after the stable request ID was saved. GrowPath will recover by that ID; do not submit another review."
      );
      setNotice(
        !submitted || unambiguousClientRejection
          ? "No operation was accepted. Request a fresh exact quote before trying again."
          : "Use Check Deep Review Progress to recover the existing request."
      );
      return false;
    }
  }, [
    acceptPacket,
    acceptedQuoteToken,
    accountId,
    beginRequest,
    busy,
    enabled,
    operation,
    quote,
    quoteScopeKey,
    recoveryPending,
    requestIsCurrent,
    scopeKey,
    workspaceKey,
    clearPersisted
  ]);

  const refresh = useCallback(async () => {
    const activeOperation = operation;
    const persisted = persistedRef.current;
    if (!persisted || busy) return;
    const requestScopeKey = scopeKey;
    const { generation, controller } = beginRequest();
    setBusy("polling");
    setError("");
    try {
      const packet = activeOperation
        ? await recoverPersistedOperation(
            { ...persisted, operationId: activeOperation.id },
            workspace,
            controller.signal
          )
        : await recoverPersistedOperation(persisted, workspace, controller.signal);
      if (!requestIsCurrent(requestScopeKey, generation)) return;
      if (!packet) {
        const activeQuote = quoteScopeKey === requestScopeKey ? quote : null;
        const quoteStillAccepted = Boolean(
          activeQuote?.analysisMode === "deep" &&
          activeQuote.token &&
          acceptedQuoteToken === activeQuote.token &&
          activeQuote.expiresAt === persisted.quoteExpiresAt &&
          new Date(activeQuote.expiresAt).getTime() > Date.now() &&
          activeQuote.manifestDigest === persisted.manifestDigest &&
          activeQuote.selectedEvidenceDigest === persisted.selectedEvidenceDigest &&
          activeQuote.analyzedEvidenceDigest === persisted.analyzedEvidenceDigest &&
          activeQuote.batchCount === persisted.batchCount &&
          activeQuote.creditsQuoted === persisted.creditsQuoted
        );
        if (
          quoteStillAccepted &&
          activeQuote?.token &&
          persisted.dispatchAttemptCount < 2
        ) {
          setNotice(
            "No operation exists for the saved request ID. GrowPath is retrying the same accepted request once with that same ID; this cannot create a second operation or charge."
          );
          const retryIdentity = await rememberHarvestDeepReviewDispatch(persisted);
          persistedRef.current = retryIdentity;
          if (!requestIsCurrent(requestScopeKey, generation)) return;
          const replay = await startDeepTrichomeReview(
            {
              ...inputRef.current,
              analysisMode: "deep",
              deepReviewQuoteToken: activeQuote.token,
              creditsQuoted: persisted.creditsQuoted,
              clientOperationKey: retryIdentity.clientOperationKey
            },
            { signal: controller.signal }
          );
          if (!requestIsCurrent(requestScopeKey, generation)) return;
          if (
            replay.operation.clientOperationKey !== retryIdentity.clientOperationKey ||
            replay.operation.batchCount !== persisted.batchCount ||
            replay.operation.creditsQuoted !== persisted.creditsQuoted
          ) {
            throw new Error(
              "The same-ID Deep review replay did not match the accepted request, batch, and credit identity."
            );
          }
          persistedRef.current = await rememberHarvestDeepReviewOperation(retryIdentity, {
            operationId: replay.operation.id,
            requestDigest: replay.operation.requestDigest,
            clientOperationKey: replay.operation.clientOperationKey
          });
          if (!requestIsCurrent(requestScopeKey, generation)) return;
          await acceptPacket(
            replay,
            {
              manifestDigest: persisted.manifestDigest,
              selectedEvidenceDigest: persisted.selectedEvidenceDigest,
              analyzedEvidenceDigest: persisted.analyzedEvidenceDigest,
              selectedEvidenceCount: persisted.selectedEvidenceCount,
              analyzedEvidenceCount: persisted.analyzedEvidenceCount,
              batchCount: persisted.batchCount,
              creditsQuoted: persisted.creditsQuoted
            },
            requestScopeKey,
            generation
          );
          return;
        }

        const quoteExpired = new Date(persisted.quoteExpiresAt).getTime() <= Date.now();
        const dispatchGraceElapsed = Boolean(
          persisted.lastDispatchAt &&
          new Date(persisted.lastDispatchAt).getTime() + LOST_START_CLEAR_GRACE_MS <=
            Date.now()
        );
        if (quoteExpired && dispatchGraceElapsed) {
          await clearPersisted();
          if (!requestIsCurrent(requestScopeKey, generation)) return;
          setOperation(null);
          setQuote(null);
          setQuoteScopeKey("");
          setAcceptedQuoteToken("");
          setBusy(null);
          setAutoPoll(false);
          setError("");
          setNotice(
            "GrowPath authoritatively found no operation for the saved request ID after its quote expired and the recovery grace period elapsed. The stale request was cleared; prepare a fresh exact quote."
          );
          return;
        }

        setBusy(null);
        setAutoPoll(false);
        setRecoveryPending(true);
        setNotice(
          quoteStillAccepted
            ? "GrowPath found no operation for the saved request ID. The one bounded same-ID retry has already been used; check this request again rather than creating a second review."
            : "GrowPath found no operation for the saved request ID. No new request was sent. After the quote expires and the recovery grace period elapses, check once more to clear it safely."
        );
        return;
      }
      if (!persisted.operationId) {
        persistedRef.current = await rememberHarvestDeepReviewOperation(persisted, {
          operationId: packet.operation.id,
          requestDigest: packet.operation.requestDigest,
          clientOperationKey: packet.operation.clientOperationKey
        });
        if (!requestIsCurrent(requestScopeKey, generation)) return;
      }
      pollCountRef.current += 1;
      await acceptPacket(
        packet,
        {
          manifestDigest: persisted.manifestDigest,
          selectedEvidenceDigest: persisted.selectedEvidenceDigest,
          analyzedEvidenceDigest: persisted.analyzedEvidenceDigest,
          selectedEvidenceCount: persisted.selectedEvidenceCount,
          analyzedEvidenceCount: persisted.analyzedEvidenceCount,
          batchCount: persisted.batchCount,
          creditsQuoted: persisted.creditsQuoted
        },
        requestScopeKey,
        generation
      );
    } catch (caught: any) {
      if (
        isAbort(caught, controller.signal) ||
        !requestIsCurrent(requestScopeKey, generation)
      ) {
        return;
      }
      setBusy(null);
      setAutoPoll(false);
      setError(
        caught?.message ||
          "GrowPath could not check the durable Deep review. Retry status without starting another review."
      );
    }
  }, [
    acceptPacket,
    beginRequest,
    busy,
    operation,
    acceptedQuoteToken,
    quote,
    quoteScopeKey,
    requestIsCurrent,
    scopeKey,
    workspace,
    clearPersisted
  ]);
  refreshRef.current = refresh;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      generationRef.current += 1;
      controllerRef.current?.abort();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const requestScopeKey = scopeKey;
    generationRef.current += 1;
    controllerRef.current?.abort();
    controllerRef.current = null;
    persistedRef.current = null;
    pollCountRef.current = 0;
    setQuote(null);
    setQuoteScopeKey("");
    setAcceptedQuoteToken("");
    setOperation(null);
    setAutoPoll(false);
    setRecoveryPending(false);
    setNotice("");
    setError("");
    if (!enabled || !accountId || !scopeKey || !workspaceKey) {
      setBusy(null);
      return;
    }
    const { generation, controller } = beginRequest();
    setBusy("restoring");
    void (async () => {
      try {
        const persisted = await loadHarvestDeepReview({
          accountId,
          workspaceKey,
          scopeKey: requestScopeKey
        });
        if (!requestIsCurrent(requestScopeKey, generation)) return;
        if (!persisted) {
          setBusy(null);
          return;
        }
        persistedRef.current = persisted;
        setRecoveryPending(true);
        const packet = await recoverPersistedOperation(
          persisted,
          workspace,
          controller.signal
        );
        if (!requestIsCurrent(requestScopeKey, generation)) return;
        if (!packet) {
          setBusy(null);
          setNotice(
            "A stable Deep review request was saved before an interrupted start response. No second review was submitted; use Check Deep Review Progress to recover it by request ID."
          );
          return;
        }
        if (!persisted.operationId) {
          persistedRef.current = await rememberHarvestDeepReviewOperation(persisted, {
            operationId: packet.operation.id,
            requestDigest: packet.operation.requestDigest,
            clientOperationKey: packet.operation.clientOperationKey
          });
          if (!requestIsCurrent(requestScopeKey, generation)) return;
        }
        await acceptPacket(
          packet,
          {
            manifestDigest: persisted.manifestDigest,
            selectedEvidenceDigest: persisted.selectedEvidenceDigest,
            analyzedEvidenceDigest: persisted.analyzedEvidenceDigest,
            selectedEvidenceCount: persisted.selectedEvidenceCount,
            analyzedEvidenceCount: persisted.analyzedEvidenceCount,
            batchCount: persisted.batchCount,
            creditsQuoted: persisted.creditsQuoted
          },
          requestScopeKey,
          generation
        );
      } catch (caught: any) {
        if (
          isAbort(caught, controller.signal) ||
          !requestIsCurrent(requestScopeKey, generation)
        ) {
          return;
        }
        setBusy(null);
        setAutoPoll(false);
        setError(
          caught?.message ||
            "A saved Deep review could not be restored. Check its status before starting another review."
        );
      }
    })();
  }, [
    acceptPacket,
    accountId,
    beginRequest,
    enabled,
    requestIsCurrent,
    scopeKey,
    workspace,
    workspaceKey
  ]);

  useEffect(() => {
    if (
      !autoPoll ||
      !operation ||
      !["queued", "processing"].includes(operation.status) ||
      busy
    ) {
      return;
    }
    if (pollCountRef.current >= MAX_AUTOMATIC_POLLS) {
      setAutoPoll(false);
      setNotice(
        "Deep review is still running. Automatic checks paused; use Check Deep Review Progress later. The durable server operation continues."
      );
      return;
    }
    const delay =
      POLL_DELAYS_MS[Math.min(pollCountRef.current, POLL_DELAYS_MS.length - 1)];
    const timer = setTimeout(() => void refreshRef.current?.(), delay);
    return () => clearTimeout(timer);
  }, [autoPoll, busy, operation]);

  const activeQuote = quoteScopeKey === scopeKey ? quote : null;
  const quoteAccepted = Boolean(
    activeQuote &&
    activeQuote.analysisMode === "deep" &&
    Boolean(activeQuote.token) &&
    acceptedQuoteToken === activeQuote.token &&
    new Date(String(activeQuote.expiresAt || "")).getTime() > Date.now()
  );
  const operationActive = Boolean(
    recoveryPending || (operation && ["queued", "processing"].includes(operation.status))
  );
  const terminalResetAllowed = Boolean(
    operation &&
    (["succeeded", "refunded"].includes(operation.status) ||
      (operation.status === "failed" &&
        (["not_reserved", "not_charged"].includes(String(operation.creditState || "")) ||
          Number(operation.creditsRefunded || 0) >= operation.creditsQuoted)))
  );
  const resetTerminal = useCallback(() => {
    if (operation && !terminalResetAllowed) return;
    setOperation(null);
    setQuote(null);
    setQuoteScopeKey("");
    setAcceptedQuoteToken("");
    setNotice("");
    setError("");
    setRecoveryPending(false);
  }, [operation, terminalResetAllowed]);

  const discardSucceeded = useCallback(async () => {
    const completedOperation = operation;
    if (!completedOperation || completedOperation.status !== "succeeded" || busy) {
      return false;
    }
    const requestScopeKey = scopeKey;
    const { generation, controller } = beginRequest();
    setBusy("discarding");
    setError("");
    setNotice(
      "Permanently discarding only the unsaved signed Deep result. The source video and retained frames stay private and unchanged."
    );
    try {
      await discardUnsavedDeepTrichomeReview(completedOperation.id, workspace, {
        signal: controller.signal
      });
      if (!requestIsCurrent(requestScopeKey, generation)) return false;
      await clearPersisted();
      if (!requestIsCurrent(requestScopeKey, generation)) return false;
      setOperation(null);
      setQuote(null);
      setQuoteScopeKey("");
      setAcceptedQuoteToken("");
      setAutoPoll(false);
      setRecoveryPending(false);
      setError("");
      setNotice(
        "The unsaved signed Deep result was permanently discarded. Its previously charged AI credits were not refunded. The private source video and retained frames were kept."
      );
      onDiscardedRef.current?.();
      return true;
    } catch (caught: any) {
      if (
        isAbort(caught, controller.signal) ||
        !requestIsCurrent(requestScopeKey, generation)
      ) {
        return false;
      }
      setError(
        caught?.message ||
          "GrowPath could not confirm the unsaved Deep-result discard. The result remains available; try again or use Saved Runs if it was already saved."
      );
      setNotice("");
      return false;
    } finally {
      if (requestIsCurrent(requestScopeKey, generation)) setBusy(null);
    }
  }, [
    beginRequest,
    busy,
    clearPersisted,
    operation,
    requestIsCurrent,
    scopeKey,
    workspace
  ]);

  return {
    quote: activeQuote,
    quoteAccepted,
    operation,
    busy,
    operationActive,
    terminalResetAllowed,
    recoveryPending,
    notice,
    error,
    requestQuote,
    acceptQuote,
    start,
    refresh,
    resetTerminal,
    discardSucceeded
  };
}
