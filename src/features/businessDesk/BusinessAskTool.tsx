import { Link } from "expo-router";
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  BUSINESS_ASK_RECORD_KINDS,
  getBusinessAskAttestation,
  startBusinessAsk,
  type BusinessAskAttestation,
  type BusinessAskCitation,
  type BusinessAskRecordKind,
  type BusinessAskResult
} from "@/api/businessDeskProvider";
import { businessDeskWorkspaceKey, type BusinessDeskWorkspace } from "@/api/businessDesk";
import CalendarDateField from "@/components/forms/CalendarDateField";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { LabeledInput } from "@/features/businessDesk/RecordFormControls";
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

function localDateValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function defaultDateRange() {
  const through = new Date();
  const from = new Date(through);
  from.setDate(from.getDate() - 89);
  return { from: localDateValue(from), to: localDateValue(through) };
}

function attestationMatchesResult(
  attestation: BusinessAskAttestation,
  result: BusinessAskResult
) {
  if (
    attestation.resultDigestSha256 !== result.resultDigestSha256 ||
    attestation.sources.length !== result.selectedRecordCount ||
    new Set(attestation.sources.map((source) => source.id)).size !==
      attestation.sources.length ||
    new Set(result.citations.map((citation) => citation.id)).size !==
      result.citations.length
  ) {
    return false;
  }
  const sources = new Map(attestation.sources.map((source) => [source.id, source]));
  return result.citations.every((citation) => {
    const source = sources.get(citation.id);
    return Boolean(
      source &&
      source.sourceType === citation.sourceType &&
      source.recordId === citation.recordId &&
      source.parentRecordId === citation.parentRecordId &&
      source.recordKind === citation.recordKind &&
      source.version === citation.version &&
      source.sourceDate === citation.sourceDate
    );
  });
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

function CitationLinks({
  ids,
  citations,
  basePath,
  operationId,
  styles
}: {
  ids: string[];
  citations: Map<string, BusinessAskCitation>;
  basePath: string;
  operationId: string;
  styles: ReturnType<typeof createStyles>;
}) {
  if (!ids.length) return null;
  return (
    <View style={styles.citationRow}>
      {ids.map((id) => {
        const citation = citations.get(id);
        if (!citation) return null;
        const revision = citation.version ? ` · revision ${citation.version}` : "";
        return (
          <Link
            key={id}
            href={
              `${basePath}/source?operationId=${encodeURIComponent(
                operationId
              )}&citationId=${encodeURIComponent(id)}` as any
            }
            asChild
          >
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Inspect cited source ${citation.title}${revision}`}
              style={styles.citationChip}
            >
              <Text style={styles.citationText}>
                {citation.title}
                {revision}
              </Text>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

function ResultSection({
  title,
  empty,
  entries,
  citations,
  basePath,
  operationId,
  styles
}: {
  title: string;
  empty: string;
  entries: Array<{ statement: string; citationIds: string[]; detail?: string }>;
  citations: Map<string, BusinessAskCitation>;
  basePath: string;
  operationId: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.resultSection}>
      <Text accessibilityRole="header" aria-level={3} style={styles.sectionTitle}>
        {title}
      </Text>
      {entries.length ? (
        entries.map((entry, index) => (
          <View key={`${title}-${index}`} style={styles.resultEntry}>
            <Text style={styles.resultText}>{entry.statement}</Text>
            {entry.detail ? (
              <Text style={styles.resultDetail}>{entry.detail}</Text>
            ) : null}
            <CitationLinks
              ids={entry.citationIds}
              citations={citations}
              basePath={basePath}
              operationId={operationId}
              styles={styles}
            />
          </View>
        ))
      ) : (
        <Text style={styles.emptyText}>{empty}</Text>
      )}
    </View>
  );
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
  const initialDates = useMemo(defaultDateRange, [workspaceKey]);
  const [question, setQuestion] = useState("");
  const [fromDate, setFromDate] = useState(initialDates.from);
  const [throughDate, setThroughDate] = useState(initialDates.to);
  const [recordKinds, setRecordKinds] = useState<BusinessAskRecordKind[]>([
    ...BUSINESS_ASK_RECORD_KINDS
  ]);
  const [includeInventory, setIncludeInventory] = useState(true);
  const [submittedSignature, setSubmittedSignature] = useState("");
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
    const dates = defaultDateRange();
    setQuestion("");
    setFromDate(dates.from);
    setThroughDate(dates.to);
    setRecordKinds([...BUSINESS_ASK_RECORD_KINDS]);
    setIncludeInventory(true);
    setSubmittedSignature("");
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
        if (!attestationMatchesResult(value, result)) {
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
    result && submittedSignature && submittedSignature === currentSignature
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
      setSubmittedSignature(currentSignature);
      await providerOperation.start(currentSignature, (clientOperationKey, signal) =>
        startBusinessAsk(
          workspace,
          {
            clientOperationKey,
            question: requestDraft.question,
            dateRange: requestDraft.dateRange,
            recordKinds,
            includeInventory
          },
          { signal }
        )
      );
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

  const citationMap = useMemo(
    () => new Map((result?.citations || []).map((citation) => [citation.id, citation])),
    [result]
  );

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
              label="Source updated from"
              accessibilityLabel="Business Ask source updated from date"
              value={fromDate}
              onChange={setFromDate}
            />
          </View>
          <View style={styles.dateField}>
            <CalendarDateField
              label="Source updated through"
              accessibilityLabel="Business Ask source updated through date"
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
              The form has changed since this answer was requested. The answer still
              belongs to its submitted date and source boundary; submit again for the new
              draft.
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
              <View style={styles.answerBox}>
                <Text
                  accessibilityRole="header"
                  aria-level={3}
                  style={styles.sectionTitle}
                >
                  Cited answer
                </Text>
                <Text style={styles.answerText}>{result.answer}</Text>
                <CitationLinks
                  ids={result.answerCitationIds}
                  citations={citationMap}
                  basePath={basePath}
                  operationId={providerOperation.operation?.id || ""}
                  styles={styles}
                />
                {result.incomplete ? (
                  <Text style={styles.warningText}>
                    The authorized records were insufficient for a sourced answer. This is
                    an explicit incomplete result, not a zero or a complete business
                    summary.
                  </Text>
                ) : null}
              </View>
              <Text style={styles.boundaryText}>
                Server-selected {result.selectedRecordCount} authorized record
                {result.selectedRecordCount === 1 ? "" : "s"} from {result.dateRange.from}{" "}
                through {result.dateRange.to}, using each source last-updated timestamp.
              </Text>
              {result.truncated ? (
                <Text style={styles.warningText}>
                  The authorized source limit was reached. This is a partial answer, not a
                  zero or complete workspace summary.
                </Text>
              ) : null}
              <ResultSection
                title="Facts"
                empty="No additional source-backed facts were returned."
                entries={result.facts}
                citations={citationMap}
                basePath={basePath}
                operationId={providerOperation.operation?.id || ""}
                styles={styles}
              />
              <ResultSection
                title="Calculations"
                empty="No source-backed calculations were returned."
                entries={result.calculations.map((entry) => ({
                  statement: entry.statement,
                  citationIds: entry.citationIds,
                  detail: `${entry.incomplete ? "Incomplete" : "Provider-unverified"} calculation · review required · ${entry.formula}${entry.inputs.length ? ` · inputs: ${entry.inputs.join(", ")}` : ""}`
                }))}
                citations={citationMap}
                basePath={basePath}
                operationId={providerOperation.operation?.id || ""}
                styles={styles}
              />
              <ResultSection
                title="Assumptions"
                empty="No assumptions were returned."
                entries={result.assumptions}
                citations={citationMap}
                basePath={basePath}
                operationId={providerOperation.operation?.id || ""}
                styles={styles}
              />
              <ResultSection
                title="Scenarios"
                empty="No scenarios were returned."
                entries={result.scenarios}
                citations={citationMap}
                basePath={basePath}
                operationId={providerOperation.operation?.id || ""}
                styles={styles}
              />
              <ResultSection
                title="Recommendations requiring review"
                empty="No source-backed recommendations were returned."
                entries={result.recommendations.map((entry) => ({
                  statement: entry.statement,
                  citationIds: entry.citationIds,
                  detail: "Review required · no action was performed"
                }))}
                citations={citationMap}
                basePath={basePath}
                operationId={providerOperation.operation?.id || ""}
                styles={styles}
              />
              <View style={styles.resultSection}>
                <Text
                  accessibilityRole="header"
                  aria-level={3}
                  style={styles.sectionTitle}
                >
                  Limitations
                </Text>
                {result.limitations.length ? (
                  result.limitations.map((entry, index) => (
                    <Text key={`limitation-${index}`} style={styles.resultText}>
                      {entry}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.emptyText}>
                    No additional limitations were returned.
                  </Text>
                )}
              </View>
              <View style={styles.resultSection}>
                <Text
                  accessibilityRole="header"
                  aria-level={3}
                  style={styles.sectionTitle}
                >
                  Missing information
                </Text>
                {result.missingInformation.length ? (
                  result.missingInformation.map((entry, index) => (
                    <Text key={`missing-${index}`} style={styles.resultText}>
                      {entry}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.emptyText}>
                    No additional missing information was returned.
                  </Text>
                )}
              </View>
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
    </AppPage>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    answerBox: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 10,
      padding: 14
    },
    answerText: { color: palette.text, fontSize: 15, lineHeight: 23 },
    attestationBox: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 10,
      padding: 12
    },
    boundaryText: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
    citationChip: {
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: 999,
      borderWidth: 1,
      minHeight: 38,
      justifyContent: "center",
      paddingHorizontal: 11,
      paddingVertical: 7
    },
    citationRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
    citationText: { color: palette.link, fontSize: 11, fontWeight: "900" },
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
    emptyText: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
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
    resultDetail: { color: palette.textMuted, fontSize: 11, lineHeight: 17 },
    resultEntry: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.borderSoft,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 8,
      padding: 11
    },
    resultSection: { gap: 9 },
    resultText: { color: palette.text, fontSize: 13, lineHeight: 20 },
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
