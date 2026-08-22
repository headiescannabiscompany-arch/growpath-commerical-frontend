import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { ApiError } from "@/api/apiRequest";
import {
  getBusinessAskAttestation,
  getBusinessAskCitationEvidence,
  getBusinessDeskProviderOperation,
  type BusinessAskAttestation,
  type BusinessAskResult
} from "@/api/businessDeskProvider";
import {
  archiveBusinessDeskRecord,
  businessDeskWorkspaceKey,
  getBusinessDeskRecord,
  listBusinessDeskRecordPage,
  updateBusinessDeskRecord,
  type BusinessDeskRecord,
  type BusinessDeskWorkspace
} from "@/api/businessDesk";
import { useOptionalAuth } from "@/auth/AuthContext";
import AppCard from "@/components/layout/AppCard";
import { businessAskCitationEvidenceMatches } from "@/features/businessDesk/businessAskEvidence";
import BusinessAskResultContent from "@/features/businessDesk/BusinessAskResultContent";
import { LabeledInput } from "@/features/businessDesk/RecordFormControls";
import { businessDeskProviderErrorMessage } from "@/features/businessDesk/ProviderOperationStatus";
import { businessDeskProviderPersistenceScopeKey } from "@/features/businessDesk/providerOperationPersistence";
import {
  resolveBusinessDeskRetryIdentity,
  type BusinessDeskRetryIdentity
} from "@/features/businessDesk/operationRetry";
import {
  businessDeskRecordId,
  newBusinessDeskOperationKey
} from "@/features/businessDesk/recordWorkflow";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type AssistantDraftStatus = "draft" | "reviewed" | "rejected";

type ParsedAssistantDraft = {
  prompt: string;
  content: string;
  providerOperationId: string;
  citationIds: string[];
  reviewStatus: AssistantDraftStatus;
  reviewedAt: string | null;
};

type DraftListState = {
  scopeKey: string;
  records: BusinessDeskRecord[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  nextCursor: string | null;
  error: string;
};

type VerifiedDraft = {
  record: BusinessDeskRecord;
  draft: ParsedAssistantDraft;
  operationId: string;
  result: BusinessAskResult;
  attestation: BusinessAskAttestation;
  verifiedProjectionCount: number;
};

type DraftDetailState = {
  scopeKey: string;
  recordId: string;
  loading: boolean;
  value: VerifiedDraft | null;
  error: string;
};

const EMPTY_DETAIL: Omit<DraftDetailState, "scopeKey"> = {
  recordId: "",
  loading: false,
  value: null,
  error: ""
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: string[]) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  );
}

function validIsoTimestamp(value: unknown) {
  return (
    typeof value === "string" && value.length <= 100 && Number.isFinite(Date.parse(value))
  );
}

export function parseBusinessAskAssistantDraft(
  record: BusinessDeskRecord
): ParsedAssistantDraft | null {
  const recordId = businessDeskRecordId(record);
  const assistantDraft = isObject(record.payload) ? record.payload.assistantDraft : null;
  if (
    !/^[a-f0-9]{24}$/i.test(recordId) ||
    record.kind !== "assistant_draft" ||
    !Number.isSafeInteger(record.version) ||
    record.version < 1 ||
    !isObject(assistantDraft) ||
    !hasExactKeys(assistantDraft, [
      "tool",
      "prompt",
      "content",
      "provenance",
      "providerOperationId",
      "citationIds",
      "reviewStatus",
      "reviewedAt"
    ]) ||
    assistantDraft.tool !== "business_ask" ||
    typeof assistantDraft.prompt !== "string" ||
    !assistantDraft.prompt.trim() ||
    assistantDraft.prompt !== assistantDraft.prompt.trim() ||
    assistantDraft.prompt.length > 2_000 ||
    record.title !== `Business Ask: ${assistantDraft.prompt.slice(0, 120)}` ||
    assistantDraft.provenance !== "ai_draft" ||
    typeof assistantDraft.content !== "string" ||
    !assistantDraft.content.trim() ||
    assistantDraft.content.length > 100_000 ||
    typeof assistantDraft.providerOperationId !== "string" ||
    !/^[a-f0-9]{24}$/i.test(assistantDraft.providerOperationId) ||
    !Array.isArray(assistantDraft.citationIds) ||
    assistantDraft.citationIds.length > 100 ||
    assistantDraft.citationIds.some(
      (id) => typeof id !== "string" || !/^S\d{3}$/.test(id)
    ) ||
    new Set(assistantDraft.citationIds).size !== assistantDraft.citationIds.length ||
    !["draft", "reviewed", "rejected"].includes(String(assistantDraft.reviewStatus)) ||
    record.status !== assistantDraft.reviewStatus ||
    (assistantDraft.reviewStatus === "reviewed"
      ? !validIsoTimestamp(assistantDraft.reviewedAt)
      : assistantDraft.reviewedAt !== null)
  ) {
    return null;
  }
  return {
    prompt: assistantDraft.prompt,
    content: assistantDraft.content,
    providerOperationId: assistantDraft.providerOperationId,
    citationIds: [...assistantDraft.citationIds],
    reviewStatus: assistantDraft.reviewStatus as AssistantDraftStatus,
    reviewedAt: assistantDraft.reviewedAt as string | null
  };
}

function sameOrderedStrings(left: string[], right: string[]) {
  return (
    left.length === right.length && left.every((value, index) => value === right[index])
  );
}

function mutationErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 409) {
    return "This assistant draft changed after it was opened. Refresh the exact draft before retrying; your requested action was not assumed complete.";
  }
  if (error instanceof ApiError && (error.status === 403 || error.status === 404)) {
    return "This assistant draft is no longer available in the active account, workspace, or Facility role. No prior content remains displayed.";
  }
  return businessDeskProviderErrorMessage(
    error instanceof Error
      ? error
      : new Error("The assistant draft action could not be confirmed.")
  );
}

function mergeRecords(current: BusinessDeskRecord[], incoming: BusinessDeskRecord[]) {
  const byId = new Map<string, BusinessDeskRecord>();
  for (const record of [...current, ...incoming]) {
    const id = businessDeskRecordId(record);
    if (id) byId.set(id, record);
  }
  return [...byId.values()];
}

export default function BusinessAskDraftHistory({
  workspace,
  workspaceLabel,
  basePath,
  refreshToken = ""
}: {
  workspace: BusinessDeskWorkspace;
  workspaceLabel: "Commercial" | "Facility";
  basePath: string;
  refreshToken?: string;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const auth = useOptionalAuth();
  const routeWorkspaceKey = businessDeskWorkspaceKey(workspace);
  const accountId = String(auth?.user?.id || auth?.user?._id || "");
  const facilityRole =
    workspace.workspaceType === "facility"
      ? String(auth?.ctx?.facilityRole || "UNKNOWN").toUpperCase()
      : "";
  const accountSubject = facilityRole
    ? `${accountId}:facility-role:${facilityRole}`
    : accountId;
  const scoped = businessDeskProviderPersistenceScopeKey(
    accountSubject,
    routeWorkspaceKey
  );
  const scopeKey = scoped || `unscoped:${routeWorkspaceKey}`;
  const facilityId = workspace.workspaceType === "facility" ? workspace.facilityId : "";
  const stableWorkspace = useMemo<BusinessDeskWorkspace>(
    () =>
      workspace.workspaceType === "facility"
        ? { workspaceType: "facility", facilityId }
        : { workspaceType: "commercial" },
    [facilityId, workspace.workspaceType]
  );
  const activeScope = useRef(scopeKey);
  activeScope.current = scopeKey;
  const listController = useRef<AbortController | null>(null);
  const detailController = useRef<AbortController | null>(null);
  const mutationController = useRef<AbortController | null>(null);
  const listEpoch = useRef(0);
  const detailEpoch = useRef(0);
  const mutationEpoch = useRef(0);
  const retryIdentities = useRef(new Map<string, BusinessDeskRetryIdentity>());
  const [listState, setListState] = useState<DraftListState>({
    scopeKey,
    records: [],
    loading: true,
    loadingMore: false,
    hasMore: false,
    nextCursor: null,
    error: ""
  });
  const [detailState, setDetailState] = useState<DraftDetailState>({
    scopeKey,
    ...EMPTY_DETAIL
  });
  const [archiveReason, setArchiveReason] = useState("");
  const [mutationState, setMutationState] = useState({
    scopeKey,
    busy: "" as "" | "reviewed" | "rejected" | "archive",
    error: "",
    notice: ""
  });

  const activeList =
    listState.scopeKey === scopeKey
      ? listState
      : {
          scopeKey,
          records: [],
          loading: true,
          loadingMore: false,
          hasMore: false,
          nextCursor: null,
          error: ""
        };
  const activeDetail =
    detailState.scopeKey === scopeKey ? detailState : { scopeKey, ...EMPTY_DETAIL };
  const activeMutation =
    mutationState.scopeKey === scopeKey
      ? mutationState
      : { scopeKey, busy: "" as const, error: "", notice: "" };

  const clearDetail = useCallback(
    (nextScope = scopeKey) => {
      detailEpoch.current += 1;
      detailController.current?.abort();
      mutationEpoch.current += 1;
      mutationController.current?.abort();
      retryIdentities.current.clear();
      setDetailState({ scopeKey: nextScope, ...EMPTY_DETAIL });
      setArchiveReason("");
      setMutationState({
        scopeKey: nextScope,
        busy: "",
        error: "",
        notice: ""
      });
    },
    [scopeKey]
  );

  const loadPage = useCallback(
    async (cursor: string | null, append: boolean) => {
      const requestScope = scopeKey;
      const epoch = listEpoch.current + 1;
      listEpoch.current = epoch;
      listController.current?.abort();
      const controller = new AbortController();
      listController.current = controller;
      setListState((current) => ({
        ...(current.scopeKey === requestScope
          ? current
          : {
              scopeKey: requestScope,
              records: [],
              hasMore: false,
              nextCursor: null
            }),
        scopeKey: requestScope,
        loading: !append,
        loadingMore: append,
        error: "",
        ...(!append ? { records: [], hasMore: false, nextCursor: null } : {})
      }));
      if (!append) clearDetail(requestScope);
      try {
        const page = await listBusinessDeskRecordPage(
          stableWorkspace,
          {
            kind: "assistant_draft",
            includeArchived: true,
            limit: 10,
            ...(cursor ? { cursor } : {})
          },
          { signal: controller.signal }
        );
        if (
          controller.signal.aborted ||
          activeScope.current !== requestScope ||
          listEpoch.current !== epoch
        ) {
          return;
        }
        setListState((current) => ({
          scopeKey: requestScope,
          records: append
            ? mergeRecords(
                current.scopeKey === requestScope ? current.records : [],
                page.records
              )
            : page.records,
          loading: false,
          loadingMore: false,
          hasMore: page.page.hasMore,
          nextCursor: page.page.nextCursor,
          error: ""
        }));
      } catch (error) {
        if (
          !controller.signal.aborted &&
          activeScope.current === requestScope &&
          listEpoch.current === epoch
        ) {
          const revoked =
            error instanceof ApiError && (error.status === 403 || error.status === 404);
          setListState((current) => ({
            ...(current.scopeKey === requestScope
              ? current
              : {
                  scopeKey: requestScope,
                  records: [],
                  hasMore: false,
                  nextCursor: null
                }),
            scopeKey: requestScope,
            records:
              !revoked && append && current.scopeKey === requestScope
                ? current.records
                : [],
            loading: false,
            loadingMore: false,
            error: mutationErrorMessage(error)
          }));
          if (revoked) {
            clearDetail(requestScope);
          }
        }
      }
    },
    [clearDetail, scopeKey, stableWorkspace]
  );

  const verifyRecord = useCallback(
    async (record: BusinessDeskRecord, signal: AbortSignal): Promise<VerifiedDraft> => {
      const recordId = businessDeskRecordId(record);
      const draft = parseBusinessAskAssistantDraft(record);
      if (!draft) {
        throw new Error(
          "This saved item did not match the protected Business Ask draft contract. Its content was not displayed."
        );
      }
      const packet = await getBusinessDeskProviderOperation<BusinessAskResult>(
        stableWorkspace,
        draft.providerOperationId,
        "business_ask",
        { signal }
      );
      const result = packet.operation.result;
      if (
        packet.operation.state !== "succeeded" ||
        result?.type !== "business_ask" ||
        result.assistantDraftRecordId !== recordId ||
        result.assistantDraftVersion > record.version ||
        result.answer !== draft.content ||
        !sameOrderedStrings(
          draft.citationIds,
          result.citations.map((citation) => citation.id)
        )
      ) {
        throw new Error(
          "This saved draft did not match its exact completed Business Ask operation. Its content was not displayed."
        );
      }
      const attestation = await getBusinessAskAttestation(
        stableWorkspace,
        draft.providerOperationId,
        { signal }
      );
      const evidencePackets = await Promise.all(
        result.citations.map((citation) =>
          getBusinessAskCitationEvidence(
            stableWorkspace,
            draft.providerOperationId,
            citation.id,
            { signal }
          )
        )
      );
      if (
        evidencePackets.some(
          (evidence, index) =>
            !businessAskCitationEvidenceMatches(
              draft.providerOperationId,
              result,
              result.citations[index],
              attestation,
              evidence
            )
        )
      ) {
        throw new Error(
          "One or more cited provider projections did not match the server audit evidence. The saved draft was withheld."
        );
      }
      return {
        record,
        draft,
        operationId: draft.providerOperationId,
        result,
        attestation,
        verifiedProjectionCount: evidencePackets.length
      };
    },
    [stableWorkspace]
  );

  const openDraft = useCallback(
    async (recordId: string, suppliedRecord?: BusinessDeskRecord) => {
      const requestScope = scopeKey;
      const epoch = detailEpoch.current + 1;
      detailEpoch.current = epoch;
      detailController.current?.abort();
      const controller = new AbortController();
      detailController.current = controller;
      setDetailState({
        scopeKey: requestScope,
        recordId,
        loading: true,
        value: null,
        error: ""
      });
      setArchiveReason("");
      setMutationState({
        scopeKey: requestScope,
        busy: "",
        error: "",
        notice: ""
      });
      try {
        const record =
          suppliedRecord ||
          (await getBusinessDeskRecord(stableWorkspace, recordId, {
            signal: controller.signal
          }));
        if (businessDeskRecordId(record) !== recordId) {
          throw new Error("The exact saved assistant draft response was invalid.");
        }
        const value = await verifyRecord(record, controller.signal);
        if (
          !controller.signal.aborted &&
          activeScope.current === requestScope &&
          detailEpoch.current === epoch
        ) {
          setDetailState({
            scopeKey: requestScope,
            recordId,
            loading: false,
            value,
            error: ""
          });
          return true;
        }
        return false;
      } catch (error) {
        if (
          !controller.signal.aborted &&
          activeScope.current === requestScope &&
          detailEpoch.current === epoch
        ) {
          const revoked =
            error instanceof ApiError && (error.status === 403 || error.status === 404);
          setDetailState(
            revoked
              ? { scopeKey: requestScope, ...EMPTY_DETAIL }
              : {
                  scopeKey: requestScope,
                  recordId,
                  loading: false,
                  value: null,
                  error: mutationErrorMessage(error)
                }
          );
          if (revoked) {
            setListState({
              scopeKey: requestScope,
              records: [],
              loading: false,
              loadingMore: false,
              hasMore: false,
              nextCursor: null,
              error: mutationErrorMessage(error)
            });
          }
        }
        return false;
      }
    },
    [scopeKey, stableWorkspace, verifyRecord]
  );

  useEffect(() => {
    void loadPage(null, false);
    return () => {
      listController.current?.abort();
      detailController.current?.abort();
      mutationController.current?.abort();
    };
  }, [loadPage, refreshToken, scopeKey]);

  const replaceRecord = useCallback(
    (record: BusinessDeskRecord) => {
      const id = businessDeskRecordId(record);
      setListState((current) => ({
        ...current,
        records:
          current.scopeKey === scopeKey
            ? current.records.map((candidate) =>
                businessDeskRecordId(candidate) === id ? record : candidate
              )
            : []
      }));
    },
    [scopeKey]
  );

  const mutateDraft = useCallback(
    async (action: "reviewed" | "rejected" | "archive") => {
      const verified = activeDetail.value;
      if (!verified) return;
      const requestScope = scopeKey;
      const recordId = businessDeskRecordId(verified.record);
      const reason = archiveReason.trim();
      if (action === "archive" && !reason) {
        setMutationState({
          scopeKey: requestScope,
          busy: "",
          error: "Enter a reason before archiving this assistant draft.",
          notice: ""
        });
        return;
      }
      const epoch = mutationEpoch.current + 1;
      mutationEpoch.current = epoch;
      mutationController.current?.abort();
      const controller = new AbortController();
      mutationController.current = controller;
      setMutationState({
        scopeKey: requestScope,
        busy: action,
        error: "",
        notice: ""
      });
      const operation = {
        scopeKey: requestScope,
        recordId,
        expectedVersion: verified.record.version,
        action,
        ...(action === "archive" ? { reason } : {})
      };
      const slot = `${action}:${recordId}`;
      const retryIdentity = resolveBusinessDeskRetryIdentity(
        retryIdentities.current.get(slot),
        operation,
        () => newBusinessDeskOperationKey(`assistant-draft-${action}`)
      );
      retryIdentities.current.set(slot, retryIdentity);
      try {
        const record =
          action === "archive"
            ? await archiveBusinessDeskRecord(
                stableWorkspace,
                recordId,
                {
                  expectedVersion: verified.record.version,
                  reason,
                  idempotencyKey: retryIdentity.key
                },
                { signal: controller.signal }
              )
            : await updateBusinessDeskRecord(
                stableWorkspace,
                recordId,
                {
                  expectedVersion: verified.record.version,
                  status: action,
                  idempotencyKey: retryIdentity.key
                },
                { signal: controller.signal }
              );
        if (
          controller.signal.aborted ||
          activeScope.current !== requestScope ||
          mutationEpoch.current !== epoch
        ) {
          return;
        }
        retryIdentities.current.delete(slot);
        replaceRecord(record);
        const reopened = await openDraft(recordId, record);
        if (reopened && activeScope.current === requestScope) {
          setMutationState({
            scopeKey: requestScope,
            busy: "",
            error: "",
            notice:
              action === "archive"
                ? "The assistant draft was archived with its audit history retained."
                : `The exact assistant draft revision is now ${action}. No proposed action was performed.`
          });
          if (action === "archive") setArchiveReason("");
        }
      } catch (error) {
        if (
          !controller.signal.aborted &&
          activeScope.current === requestScope &&
          mutationEpoch.current === epoch
        ) {
          const revoked =
            error instanceof ApiError && (error.status === 403 || error.status === 404);
          if (revoked) {
            setDetailState({ scopeKey: requestScope, ...EMPTY_DETAIL });
            setListState({
              scopeKey: requestScope,
              records: [],
              loading: false,
              loadingMore: false,
              hasMore: false,
              nextCursor: null,
              error: mutationErrorMessage(error)
            });
          }
          setMutationState({
            scopeKey: requestScope,
            busy: "",
            error: mutationErrorMessage(error),
            notice: ""
          });
        }
      }
    },
    [
      activeDetail.value,
      archiveReason,
      openDraft,
      replaceRecord,
      scopeKey,
      stableWorkspace
    ]
  );

  const selected = activeDetail.value;
  const busy = Boolean(activeMutation.busy);

  return (
    <AppCard
      title="Saved assistant drafts"
      titleLevel={2}
      subtitle={`Review the exact cited Business Ask drafts saved in this ${workspaceLabel} workspace. Opening a draft re-verifies its operation, attestation, and every cited provider projection.`}
    >
      {workspace.workspaceType === "facility" ? (
        <Text style={styles.boundaryText}>
          Facility questions and saved assistant drafts are shared workspace content
          visible to authorized Owners and Managers. Owner-only current and projected cash
          is excluded from every Facility Business Ask provider request and result.
        </Text>
      ) : null}
      <View style={styles.actionRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh saved Business Ask drafts"
          accessibilityState={{ busy: activeList.loading, disabled: activeList.loading }}
          disabled={activeList.loading}
          onPress={() => void loadPage(null, false)}
          style={[styles.secondaryButton, activeList.loading && styles.disabled]}
        >
          <Text style={styles.secondaryButtonText}>Refresh draft history</Text>
        </Pressable>
      </View>
      {activeList.loading ? (
        <View accessibilityLiveRegion="polite" style={styles.loadingRow}>
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.meta}>Loading saved assistant drafts…</Text>
        </View>
      ) : null}
      {activeList.error ? (
        <Text accessibilityLiveRegion="assertive" style={styles.errorText}>
          {activeList.error}
        </Text>
      ) : null}
      {!activeList.loading && !activeList.records.length ? (
        <Text style={styles.meta}>
          No saved Business Ask drafts are available in this exact workspace and role.
        </Text>
      ) : null}
      <View accessibilityRole="list" style={styles.list}>
        {activeList.records.map((record) => {
          const id = businessDeskRecordId(record);
          const parseable = Boolean(parseBusinessAskAssistantDraft(record));
          return (
            <View key={id || `invalid-${record.version}`} style={styles.listItem}>
              <View style={styles.listCopy}>
                <Text style={styles.listTitle}>
                  {parseable ? record.title : "Unavailable assistant draft"}
                </Text>
                <Text style={styles.meta}>
                  {parseable ? record.status : "invalid"} · revision {record.version}
                  {record.archivedAt ? " · archived" : ""}
                  {record.updatedAt
                    ? ` · updated ${new Date(record.updatedAt).toLocaleString()}`
                    : ""}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open ${parseable ? record.title : "unavailable assistant draft"}, revision ${record.version}`}
                disabled={!id || activeDetail.loading || busy}
                onPress={() => void openDraft(id)}
                style={[
                  styles.secondaryButton,
                  (!id || activeDetail.loading || busy) && styles.disabled
                ]}
              >
                <Text style={styles.secondaryButtonText}>Open exact draft</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      {activeList.hasMore && activeList.nextCursor ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Load more saved Business Ask drafts"
          accessibilityState={{
            busy: activeList.loadingMore,
            disabled: activeList.loadingMore
          }}
          disabled={activeList.loadingMore}
          onPress={() => void loadPage(activeList.nextCursor, true)}
          style={[styles.secondaryButton, activeList.loadingMore && styles.disabled]}
        >
          <Text style={styles.secondaryButtonText}>
            {activeList.loadingMore ? "Loading older drafts…" : "Load older drafts"}
          </Text>
        </Pressable>
      ) : null}

      {activeDetail.loading ? (
        <View accessibilityLiveRegion="polite" style={styles.loadingRow}>
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.meta}>
            Verifying the saved draft and every cited provider projection…
          </Text>
        </View>
      ) : null}
      {activeDetail.error ? (
        <View style={styles.noticeBox}>
          <Text accessibilityLiveRegion="assertive" style={styles.errorText}>
            {activeDetail.error}
          </Text>
          {activeDetail.recordId ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry exact saved assistant draft"
              onPress={() => void openDraft(activeDetail.recordId)}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Retry exact draft</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {selected ? (
        <View style={styles.detailBox}>
          <Text accessibilityRole="header" aria-level={3} style={styles.detailTitle}>
            Verified assistant draft · revision {selected.record.version}
          </Text>
          <Text style={styles.meta}>
            {selected.record.status}
            {selected.record.archivedAt ? " · archived" : ""} · operation evidence
            verified · {selected.verifiedProjectionCount} cited provider projection
            {selected.verifiedProjectionCount === 1 ? "" : "s"} verified
          </Text>
          <Text style={styles.promptText}>Question: {selected.draft.prompt}</Text>
          <BusinessAskResultContent
            result={selected.result}
            basePath={basePath}
            operationId={selected.operationId}
          />
          <Text selectable style={styles.digestText}>
            Result SHA-256: {selected.attestation.resultDigestSha256}
          </Text>
          <Text style={styles.boundaryText}>
            This is an AI assistant draft. Review or rejection changes only its audited
            lifecycle state. It does not contact anyone, create work, alter inventory,
            approve spending, or initiate payment. The saved bounded question is shown;
            the full provider input and source snapshots are not.
          </Text>
          {!selected.record.archivedAt ? (
            <>
              <View style={styles.actionRow}>
                {selected.record.status !== "reviewed" ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Mark exact assistant draft reviewed"
                    accessibilityState={{ busy, disabled: busy }}
                    disabled={busy}
                    onPress={() => void mutateDraft("reviewed")}
                    style={[styles.primaryButton, busy && styles.disabled]}
                  >
                    <Text style={styles.primaryButtonText}>Mark reviewed</Text>
                  </Pressable>
                ) : null}
                {selected.record.status !== "rejected" ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Reject exact assistant draft"
                    accessibilityState={{ busy, disabled: busy }}
                    disabled={busy}
                    onPress={() => void mutateDraft("rejected")}
                    style={[styles.secondaryButton, busy && styles.disabled]}
                  >
                    <Text style={styles.secondaryButtonText}>Reject draft</Text>
                  </Pressable>
                ) : null}
              </View>
              <LabeledInput
                label="Archive reason"
                accessibilityLabel="Saved assistant draft archive reason"
                value={archiveReason}
                onChangeText={setArchiveReason}
                maxLength={500}
                editable={!busy}
                placeholder="Why this assistant draft is no longer active"
                hint="Archiving retains the draft, exact operation linkage, revisions, and audit history."
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Archive exact assistant draft"
                accessibilityState={{ busy, disabled: busy || !archiveReason.trim() }}
                disabled={busy || !archiveReason.trim()}
                onPress={() => void mutateDraft("archive")}
                style={[
                  styles.dangerButton,
                  (busy || !archiveReason.trim()) && styles.disabled
                ]}
              >
                <Text style={styles.dangerButtonText}>Archive with reason</Text>
              </Pressable>
            </>
          ) : null}
          {activeMutation.notice ? (
            <Text accessibilityLiveRegion="polite" style={styles.successText}>
              {activeMutation.notice}
            </Text>
          ) : null}
          {activeMutation.error ? (
            <View style={styles.noticeBox}>
              <Text accessibilityLiveRegion="assertive" style={styles.errorText}>
                {activeMutation.error}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Refresh exact assistant draft after conflict"
                onPress={() => void openDraft(businessDeskRecordId(selected.record))}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Refresh exact draft</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
    </AppCard>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
    boundaryText: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
    dangerButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: palette.surface,
      borderColor: palette.danger,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 13,
      paddingVertical: 9
    },
    dangerButtonText: { color: palette.danger, fontSize: 13, fontWeight: "900" },
    detailBox: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 11,
      padding: 14
    },
    detailTitle: { color: palette.text, fontSize: 16, fontWeight: "900" },
    digestText: {
      color: palette.textMuted,
      fontFamily: "monospace",
      fontSize: 10,
      lineHeight: 16
    },
    disabled: { opacity: 0.55 },
    errorText: { color: palette.danger, fontSize: 13, fontWeight: "800", lineHeight: 19 },
    list: { gap: 9 },
    listCopy: { flex: 1, gap: 4, minWidth: 190 },
    listItem: {
      alignItems: "center",
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.borderSoft,
      borderRadius: radius.card,
      borderWidth: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      padding: 11
    },
    listTitle: { color: palette.text, fontSize: 14, fontWeight: "900" },
    loadingRow: { alignItems: "center", flexDirection: "row", gap: 9 },
    meta: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
    noticeBox: { gap: 8 },
    primaryButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 13,
      paddingVertical: 9
    },
    primaryButtonText: { color: palette.accentText, fontSize: 13, fontWeight: "900" },
    promptText: { color: palette.text, fontSize: 13, fontWeight: "800", lineHeight: 20 },
    secondaryButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 13,
      paddingVertical: 9
    },
    secondaryButtonText: { color: palette.text, fontSize: 13, fontWeight: "900" },
    successText: {
      color: palette.success,
      fontSize: 13,
      fontWeight: "800",
      lineHeight: 19
    }
  });
}
