import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  BUSINESS_ASK_RECORD_KINDS,
  businessAskAttestationMatchesResult,
  getBusinessAskAttestation,
  startBusinessAsk,
  type BusinessAskAttestation,
  type BusinessAskRecordKind,
  type BusinessAskResult
} from "@/api/businessDeskProvider";
import { businessDeskWorkspaceKey, type BusinessDeskWorkspace } from "@/api/businessDesk";
import CalendarDateField from "@/components/forms/CalendarDateField";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { LabeledInput } from "@/features/businessDesk/RecordFormControls";
import BusinessAskDraftHistory from "@/features/businessDesk/BusinessAskDraftHistory";
import BusinessAskResultContent from "@/features/businessDesk/BusinessAskResultContent";
import ProviderOperationStatus, {
  businessDeskCapabilityCopy,
  businessDeskProviderErrorMessage
} from "@/features/businessDesk/ProviderOperationStatus";
import {
  useBusinessDeskProviderCapabilities,
  useBusinessDeskProviderOperation
} from "@/features/businessDesk/useBusinessDeskProviderOperation";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type BusinessAskToolProps = {
  workspace: BusinessDeskWorkspace;
  workspaceLabel: "Commercial" | "Facility";
  basePath: string;
};

const SOURCE_LABELS: Record<BusinessAskRecordKind, string> = {
  price_margin_scenario: "Price and margin scenarios",
  quote: "Quotes",
  lead: "Leads",
  job: "Jobs",
  expense: "Expenses",
  vendor_comparison: "Purchase requests and vendor comparisons",
  cash_flow_snapshot: "Cash-flow snapshots"
};

function utcDateValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate()
  )}`;
}

export function defaultBusinessAskUtcDateRange(through = new Date()) {
  const from = new Date(through.getTime());
  from.setUTCDate(from.getUTCDate() - 89);
  return { from: utcDateValue(from), to: utcDateValue(through) };
}

function dateAsUtc(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const milliseconds = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const date = new Date(milliseconds);
  if (
    date.getUTCFullYear() !== Number(match[1]) ||
    date.getUTCMonth() !== Number(match[2]) - 1 ||
    date.getUTCDate() !== Number(match[3])
  ) {
    return null;
  }
  return milliseconds;
}

export default function BusinessAskTool({
  workspace,
  workspaceLabel,
  basePath
}: BusinessAskToolProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const workspaceKey = businessDeskWorkspaceKey(workspace);
  const activeWorkspaceKey = useRef(workspaceKey);
  const facilityId = workspace.workspaceType === "facility" ? workspace.facilityId : "";
  const stableWorkspace = useMemo<BusinessDeskWorkspace>(
    () =>
      workspace.workspaceType === "facility"
        ? { workspaceType: "facility", facilityId }
        : { workspaceType: "commercial" },
    [facilityId, workspace.workspaceType]
  );
  const capabilities = useBusinessDeskProviderCapabilities(workspace);
  const providerOperation = useBusinessDeskProviderOperation<BusinessAskResult>({
    workspace,
    kind: "business_ask",
    slot: "business_ask",
    keyPrefix: "business-ask"
  });
  const initialDates = useMemo(defaultBusinessAskUtcDateRange, [workspaceKey]);
  const [question, setQuestion] = useState("");
  const [fromDate, setFromDate] = useState(initialDates.from);
  const [throughDate, setThroughDate] = useState(initialDates.to);
  const [recordKinds, setRecordKinds] = useState<BusinessAskRecordKind[]>([
    ...BUSINESS_ASK_RECORD_KINDS
  ]);
  const [includeInventory, setIncludeInventory] = useState(true);
  const [submittedRequest, setSubmittedRequest] = useState({
    signature: "",
    operationId: ""
  });
  const [formError, setFormError] = useState("");
  const [attestationReloadToken, setAttestationReloadToken] = useState(0);
  const [attestationState, setAttestationState] = useState<{
    key: string;
    loading: boolean;
    value: BusinessAskAttestation | null;
    error: string;
  }>({ key: "", loading: false, value: null, error: "" });
  const availableRecordKinds = useMemo<readonly BusinessAskRecordKind[]>(
    () => capabilities.capabilities?.askRecordKinds || BUSINESS_ASK_RECORD_KINDS,
    [capabilities.capabilities?.askRecordKinds]
  );

  useEffect(() => {
    const dates = defaultBusinessAskUtcDateRange();
    setQuestion("");
    setFromDate(dates.from);
    setThroughDate(dates.to);
    setRecordKinds([...BUSINESS_ASK_RECORD_KINDS]);
    setIncludeInventory(true);
    setSubmittedRequest({ signature: "", operationId: "" });
    setFormError("");
  }, [workspaceKey]);

  useEffect(() => {
    const supported = new Set(availableRecordKinds);
    setRecordKinds((current) => current.filter((kind) => supported.has(kind)));
  }, [availableRecordKinds]);
  const capability = capabilities.capabilities?.businessAsk || null;
  const result =
    providerOperation.operation?.state === "succeeded" &&
    providerOperation.operation.result?.type === "business_ask"
      ? providerOperation.operation.result
      : null;
  const attestationKey = result
    ? `${workspaceKey}:${providerOperation.operation?.id || ""}`
    : "";
  const activeAttestationKey = useRef(attestationKey);
  useLayoutEffect(() => {
    activeWorkspaceKey.current = workspaceKey;
    activeAttestationKey.current = attestationKey;
  }, [attestationKey, workspaceKey]);

  useEffect(() => {
    const operationId = providerOperation.operation?.id || "";
    if (!result || !operationId || !attestationKey) {
      setAttestationState({ key: "", loading: false, value: null, error: "" });
      return;
    }
    const controller = new AbortController();
    const requestKey = attestationKey;
    setAttestationState({
      key: requestKey,
      loading: true,
      value: null,
      error: ""
    });
    void getBusinessAskAttestation(stableWorkspace, operationId, {
      signal: controller.signal
    })
      .then((value) => {
        if (!businessAskAttestationMatchesResult(value, result)) {
          throw new Error(
            "The server audit attestation does not match this answer and its cited sources. The evidence was not accepted."
          );
        }
        if (!controller.signal.aborted && activeAttestationKey.current === requestKey) {
          setAttestationState({
            key: requestKey,
            loading: false,
            value,
            error: ""
          });
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted && activeAttestationKey.current === requestKey) {
          setAttestationState({
            key: requestKey,
            loading: false,
            value: null,
            error: businessDeskProviderErrorMessage(
              error instanceof Error
                ? error
                : new Error("Business Ask audit evidence could not be loaded.")
            )
          });
        }
      });
    return () => controller.abort();
  }, [
    attestationKey,
    attestationReloadToken,
    providerOperation.operation?.id,
    result,
    stableWorkspace
  ]);
  const attestation = attestationState.key === attestationKey ? attestationState : null;

  const requestDraft = useMemo(
    () => ({
      workspaceKey,
      operation: "business_ask",
      question: question.trim(),
      dateRange: { from: fromDate, to: throughDate },
      recordKinds: [...recordKinds].sort(),
      includeInventory
    }),
    [fromDate, includeInventory, question, recordKinds, throughDate, workspaceKey]
  );
  const currentSignature = JSON.stringify(requestDraft);
  const resultMatchesCurrentDraft = Boolean(
    result &&
    submittedRequest.signature &&
    submittedRequest.signature === currentSignature &&
    submittedRequest.operationId === providerOperation.operation?.id
  );

  const toggleKind = (kind: BusinessAskRecordKind) => {
    setRecordKinds((current) =>
      current.includes(kind)
        ? current.filter((candidate) => candidate !== kind)
        : [...current, kind]
    );
  };

  const startAsk = async () => {
    const requestWorkspaceKey = workspaceKey;
    setFormError("");
    try {
      if (capabilities.loading) {
        throw new Error("Wait while GrowPathAI checks Business Ask availability.");
      }
      if (!capability?.enabled) {
        throw new Error(businessDeskCapabilityCopy(capability?.code));
      }
      if (!requestDraft.question) {
        throw new Error("Enter one business question.");
      }
      if (requestDraft.question.length > 2_000) {
        throw new Error("Keep the question to 2,000 characters or fewer.");
      }
      if (!recordKinds.length && !includeInventory) {
        throw new Error("Choose at least one authorized source type.");
      }
      const from = dateAsUtc(fromDate);
      const through = dateAsUtc(throughDate);
      if (from === null || through === null || through < from) {
        throw new Error("Choose a valid date range with the start on or before the end.");
      }
      const days = Math.floor((through - from) / 86_400_000) + 1;
      const maxDays = capabilities.capabilities?.maxAskDateRangeDays || 366;
      if (days > maxDays) {
        throw new Error(`Choose a date range of ${maxDays} days or fewer.`);
      }
      setSubmittedRequest({ signature: currentSignature, operationId: "" });
      const started = await providerOperation.start(
        currentSignature,
        (clientOperationKey, signal) =>
          startBusinessAsk(
            workspace,
            {
              clientOperationKey,
              question: requestDraft.question,
              dateRange: requestDraft.dateRange,
              recordKinds: requestDraft.recordKinds,
              includeInventory
            },
            { signal }
          )
      );
      if (started && activeWorkspaceKey.current === requestWorkspaceKey) {
        setSubmittedRequest({ signature: currentSignature, operationId: started.id });
      }
    } catch (error) {
      if (activeWorkspaceKey.current === requestWorkspaceKey) {
        setFormError(
          businessDeskProviderErrorMessage(
            error instanceof Error ? error : new Error("Business Ask could not start.")
          )
        );
      }
    }
  };

  return (
    <AppPage
      routeKey="business-desk-business-ask-ai"
      railOverride={null}
      longContent
      backFallbackHref={basePath}
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>{workspaceLabel} Business Desk</Text>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            Business Ask AI
          </Text>
          <Text style={styles.subtitle}>
            Ask one bounded question across authorized Business Desk records and optional
            read-only inventory projections. Answers remain cited assistant drafts and
            never perform actions. The date boundary selects sources by their last-updated
            time, not an expense, visit, due, or scheduled date inside a record.
          </Text>
        </View>
      }
    >
      <AppCard
        title="Question and source boundary"
        titleLevel={2}
        subtitle="The server selects and redacts records inside this exact workspace. Question text and receipt content are never stored in local retry metadata."
      >
        <LabeledInput
          label="Business question"
          accessibilityLabel="Business Ask question"
          multiline
          autoComplete="off"
          textContentType="none"
          maxLength={2_000}
          value={question}
          onChangeText={setQuestion}
          placeholder="Which open quotes and jobs need attention, and what information is missing?"
          hint={`${question.length}/2,000 characters. Asking may use ${
            capability?.creditCost || 0
          } workspace AI credit${capability?.creditCost === 1 ? "" : "s"}.`}
        />
        <View style={styles.dateGrid}>
          <View style={styles.dateField}>
            <CalendarDateField
              label="Source updated from (UTC)"
              accessibilityLabel="Business Ask source updated from UTC date"
              value={fromDate}
              onChange={setFromDate}
            />
          </View>
          <View style={styles.dateField}>
            <CalendarDateField
              label="Source updated through (UTC)"
              accessibilityLabel="Business Ask source updated through UTC date"
              value={throughDate}
              onChange={setThroughDate}
            />
          </View>
        </View>
        <Text style={styles.label}>Authorized source types</Text>
        <View accessibilityRole="list" style={styles.sourceGrid}>
          {availableRecordKinds.map((kind) => {
            const checked = recordKinds.includes(kind);
            return (
              <Pressable
                key={kind}
                accessibilityRole="checkbox"
                accessibilityLabel={`Include ${SOURCE_LABELS[kind]}`}
                accessibilityState={{ checked }}
                onPress={() => toggleKind(kind)}
                style={[styles.sourceChoice, checked && styles.sourceChoiceSelected]}
              >
                <Text
                  style={[
                    styles.sourceChoiceText,
                    checked && styles.sourceChoiceTextSelected
                  ]}
                >
                  {SOURCE_LABELS[kind]}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel="Include read-only inventory projections"
            accessibilityState={{ checked: includeInventory }}
            onPress={() => setIncludeInventory((current) => !current)}
            style={[styles.sourceChoice, includeInventory && styles.sourceChoiceSelected]}
          >
            <Text
              style={[
                styles.sourceChoiceText,
                includeInventory && styles.sourceChoiceTextSelected
              ]}
            >
              Read-only inventory warnings and projections
            </Text>
          </Pressable>
        </View>
        <Text style={styles.boundaryText}>
          At most {capabilities.capabilities?.maxAskRecords || 50} authorized records and
          a maximum {capabilities.capabilities?.maxAskDateRangeDays || 366}-day range are
          considered. Missing or partial data stays unknown, never zero. The server
          applies the active role boundary; Facility Business Ask answers never expose
          owner-only current or projected cash.
        </Text>
        {workspace.workspaceType === "facility" ? (
          <Text style={styles.warningText}>
            This question and its saved assistant draft become shared Facility workspace
            content visible to authorized Owners and Managers. Owner-only current and
            projected cash is never sent to Facility Business Ask.
          </Text>
        ) : null}
        {capabilities.error ? (
          <View style={styles.noticeBox}>
            <Text style={styles.errorText}>
              Business Ask availability could not be verified. No provider request will
              run.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry Business Ask availability check"
              onPress={() => void capabilities.reload()}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Retry availability check</Text>
            </Pressable>
          </View>
        ) : !capabilities.loading && !capability?.enabled ? (
          <Text accessibilityLiveRegion="polite" style={styles.boundaryText}>
            {businessDeskCapabilityCopy(capability?.code)}
          </Text>
        ) : null}
        {formError ? (
          <Text accessibilityLiveRegion="assertive" style={styles.errorText}>
            {formError}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ask Business Desk AI"
          accessibilityState={{
            busy: providerOperation.busy === "starting",
            disabled:
              capabilities.loading ||
              !capability?.enabled ||
              Boolean(providerOperation.busy) ||
              !question.trim() ||
              (!recordKinds.length && !includeInventory)
          }}
          disabled={
            capabilities.loading ||
            !capability?.enabled ||
            Boolean(providerOperation.busy) ||
            !question.trim() ||
            (!recordKinds.length && !includeInventory)
          }
          onPress={() => void startAsk()}
          style={[
            styles.primaryButton,
            (capabilities.loading ||
              !capability?.enabled ||
              Boolean(providerOperation.busy) ||
              !question.trim() ||
              (!recordKinds.length && !includeInventory)) &&
              styles.disabled
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {providerOperation.busy === "starting"
              ? "Starting Business Ask…"
              : "Ask with cited sources"}
          </Text>
        </Pressable>
        <ProviderOperationStatus
          operation={providerOperation.operation}
          busy={providerOperation.busy}
          error={providerOperation.error}
          notice={providerOperation.notice}
          onRefresh={() => void providerOperation.refresh().catch(() => undefined)}
          onCancel={() => void providerOperation.cancel().catch(() => undefined)}
          onRecoverRecent={() =>
            void providerOperation.recoverRecent().catch(() => undefined)
          }
          onStartNewAttempt={() =>
            void providerOperation.startNewAttempt().catch((error) => {
              if (activeWorkspaceKey.current === workspaceKey) {
                setFormError(
                  error instanceof Error
                    ? error.message
                    : "A new Business Ask attempt could not be prepared."
                );
              }
            })
          }
        />
      </AppCard>

      {result ? (
        <AppCard
          title={`Assistant draft · revision ${result.assistantDraftVersion}`}
          titleLevel={2}
          subtitle="This is source-bound decision support, not an approved action, message, purchase, inventory change, accounting entry, or payment."
        >
          {!resultMatchesCurrentDraft ? (
            <Text style={styles.warningText}>
              This is a recovered or historical answer, or the form has changed since it
              was requested. It is not marked as matching the current question and UTC
              source boundary. Submit the current form for a newly bound answer.
            </Text>
          ) : null}
          <View style={styles.attestationBox}>
            <Text accessibilityRole="header" aria-level={3} style={styles.sectionTitle}>
              Server audit attestation
            </Text>
            {attestation?.loading ? (
              <Text accessibilityLiveRegion="polite" style={styles.boundaryText}>
                Loading provider-input and authorized-source digests…
              </Text>
            ) : attestation?.value ? (
              <View style={styles.noticeBox}>
                <Text style={styles.boundaryText}>
                  {attestation.value.provider} · {attestation.value.model} · schema{" "}
                  {attestation.value.schemaVersion} · prompt{" "}
                  {attestation.value.promptVersion} · completed{" "}
                  {new Date(attestation.value.completedAt).toLocaleString()}
                </Text>
                <Text selectable style={styles.digestText}>
                  Provider input SHA-256: {attestation.value.providerInputDigestSha256}
                </Text>
                <Text selectable style={styles.digestText}>
                  Source manifest SHA-256: {attestation.value.sourceManifestDigestSha256}
                </Text>
                <Text selectable style={styles.digestText}>
                  Result SHA-256: {attestation.value.resultDigestSha256}
                </Text>
                <Text style={styles.boundaryText}>
                  {attestation.value.sources.length} redacted source reference
                  {attestation.value.sources.length === 1 ? "" : "s"} attested. Raw
                  question text and source contents are not stored in local retry
                  metadata.
                </Text>
              </View>
            ) : (
              <View style={styles.noticeBox}>
                <Text accessibilityLiveRegion="assertive" style={styles.errorText}>
                  {attestation?.error ||
                    "Server audit attestation is not available for this answer yet."}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Retry Business Ask audit attestation"
                  onPress={() => setAttestationReloadToken((current) => current + 1)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Retry audit evidence</Text>
                </Pressable>
              </View>
            )}
          </View>
          {attestation?.value ? (
            <>
              <BusinessAskResultContent
                result={result}
                basePath={basePath}
                operationId={providerOperation.operation?.id || ""}
              />
              <Text style={styles.draftBoundary}>
                Saved as an assistant draft revision for audit and later review.
                GrowPathAI did not contact anyone, change a record, create a task, alter
                inventory, or initiate a payment.
              </Text>
            </>
          ) : (
            <Text style={styles.warningText}>
              The assistant answer is withheld until its server audit attestation matches
              the result digest and every cited source reference.
            </Text>
          )}
        </AppCard>
      ) : null}
      <BusinessAskDraftHistory
        workspace={stableWorkspace}
        workspaceLabel={workspaceLabel}
        basePath={basePath}
        refreshToken={result?.assistantDraftRecordId || ""}
      />
    </AppPage>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    attestationBox: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 10,
      padding: 12
    },
    boundaryText: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
    dateField: { flexBasis: 230, flexGrow: 1, minWidth: 210 },
    dateGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    disabled: { opacity: 0.55 },
    digestText: {
      color: palette.textMuted,
      fontFamily: "monospace",
      fontSize: 10,
      lineHeight: 16
    },
    draftBoundary: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      fontSize: 13,
      fontWeight: "800",
      lineHeight: 20,
      padding: 12
    },
    errorText: { color: palette.danger, fontSize: 13, fontWeight: "800", lineHeight: 19 },
    header: { gap: 6 },
    kicker: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    label: { color: palette.text, fontSize: 13, fontWeight: "900" },
    noticeBox: { gap: 8 },
    primaryButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      justifyContent: "center",
      minHeight: 48,
      paddingHorizontal: 16,
      paddingVertical: 12
    },
    primaryButtonText: { color: palette.accentText, fontSize: 13, fontWeight: "900" },
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
    sectionTitle: { color: palette.text, fontSize: 15, fontWeight: "900" },
    sourceChoice: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 999,
      borderWidth: 1,
      minHeight: 42,
      justifyContent: "center",
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    sourceChoiceSelected: {
      backgroundColor: palette.accent,
      borderColor: palette.accent
    },
    sourceChoiceText: { color: palette.text, fontSize: 12, fontWeight: "800" },
    sourceChoiceTextSelected: { color: palette.accentText },
    sourceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
    subtitle: { color: palette.textMuted, fontSize: 15, lineHeight: 22, maxWidth: 820 },
    title: { color: palette.text, fontSize: 30, fontWeight: "900" },
    warningText: {
      color: palette.warning,
      fontSize: 12,
      fontWeight: "800",
      lineHeight: 18
    }
  });
}
