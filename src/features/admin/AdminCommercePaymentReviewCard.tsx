import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  executeDestinationRefund,
  listCommercePaymentReviewCases,
  reverifyDestinationRefundRecovery,
  resolveCommercePaymentIssue,
  type CommercePaymentReviewCase,
  type CommercePaymentReviewPage
} from "@/api/adminCommercePaymentReview";
import AppCard from "@/components/layout/AppCard";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

const PAGE_SIZE = 5;

function money(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: String(currency || "usd").toUpperCase()
    }).format(Number(cents || 0) / 100);
  } catch {
    return `${String(currency || "usd").toUpperCase()} ${(Number(cents || 0) / 100).toFixed(2)}`;
  }
}

function newOperationId(recordId: string) {
  const random =
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `commerce-refund-${recordId}-${random}`.slice(0, 120);
}

function newSupportOperationId(recordId: string) {
  const random =
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `commerce-support-${recordId}-${random}`.slice(0, 120);
}

function exactConfirmation(
  item: CommercePaymentReviewCase,
  amountCents: number,
  expectedRefundedAmountCents = item.refundedAmountCents,
  currency = item.currency
) {
  return `REFUND ${item.sourceType}:${item.recordId} ${amountCents} ${currency} AFTER ${expectedRefundedAmountCents}`;
}

function detailedReason(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length >= 16 && normalized.split(" ").filter(Boolean).length >= 3;
}

export default function AdminCommercePaymentReviewCard() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [expanded, setExpanded] = useState(false);
  const [pageData, setPageData] = useState<CommercePaymentReviewPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [amountText, setAmountText] = useState("");
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [operationId, setOperationId] = useState("");
  const [executing, setExecuting] = useState(false);
  const [reverifySelectedId, setReverifySelectedId] = useState("");
  const [reverifyReason, setReverifyReason] = useState("");
  const [reverifyConfirmation, setReverifyConfirmation] = useState("");
  const [reverifying, setReverifying] = useState(false);
  const [supportSelectedId, setSupportSelectedId] = useState("");
  const [supportDecision, setSupportDecision] = useState<"resolve" | "decline">(
    "resolve"
  );
  const [supportReason, setSupportReason] = useState("");
  const [supportConfirmation, setSupportConfirmation] = useState("");
  const [supportOperationId, setSupportOperationId] = useState("");
  const [resolvingSupport, setResolvingSupport] = useState(false);

  const selected = pageData?.cases.find((item) => item.recordId === selectedId) || null;
  const selectedRetryOperation =
    selected?.canRetryRefundOperation && selected.retryOperation
      ? selected.retryOperation
      : null;
  const amountCents = Number(amountText);
  const expectedConfirmation =
    selected && Number.isSafeInteger(amountCents) && amountCents > 0
      ? exactConfirmation(
          selected,
          amountCents,
          selectedRetryOperation?.expectedRefundedAmountCents,
          selectedRetryOperation?.currency
        )
      : "";
  const amountIsValid = Boolean(
    selectedRetryOperation
      ? amountCents === selectedRetryOperation.amountCents
      : selected && amountCents <= selected.remainingRefundableAmountCents
  );
  const canExecute = Boolean(
    (selected?.canExecuteRefund || selectedRetryOperation) &&
    Number.isSafeInteger(amountCents) &&
    amountCents > 0 &&
    amountIsValid &&
    detailedReason(reason) &&
    confirmation === expectedConfirmation &&
    !executing &&
    !reverifying &&
    !resolvingSupport
  );
  const reverifySelected =
    pageData?.cases.find((item) => item.recordId === reverifySelectedId) || null;
  const expectedReverifyConfirmation =
    reverifySelected?.connectRecoveryReverifyConfirmation || "";
  const canReverify = Boolean(
    reverifySelected?.connectRecoveryReverifyOperationId &&
    expectedReverifyConfirmation &&
    detailedReason(reverifyReason) &&
    reverifyConfirmation === expectedReverifyConfirmation &&
    !reverifying &&
    !executing &&
    !resolvingSupport
  );
  const supportSelected =
    pageData?.cases.find((item) => item.recordId === supportSelectedId) || null;
  const expectedSupportConfirmation =
    supportSelected?.paymentIssueResolutionConfirmations?.[supportDecision] || "";
  const canResolveSupport = Boolean(
    supportSelected?.canResolvePaymentIssue &&
    detailedReason(supportReason) &&
    supportConfirmation === expectedSupportConfirmation &&
    !resolvingSupport &&
    !executing &&
    !reverifying
  );

  async function load(page = 1) {
    setLoading(true);
    setFeedback("");
    try {
      const result = await listCommercePaymentReviewCases({ page, limit: PAGE_SIZE });
      setPageData(result);
      if (!result.cases.some((item) => item.recordId === selectedId)) {
        setSelectedId("");
      }
      if (!result.cases.some((item) => item.recordId === supportSelectedId)) {
        setSupportSelectedId("");
      }
      if (!result.cases.some((item) => item.recordId === reverifySelectedId)) {
        setReverifySelectedId("");
      }
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : "Unable to load Commerce payment cases."
      );
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    setExpanded((current) => {
      const next = !current;
      if (next && !pageData && !loading) void load(1);
      return next;
    });
  }

  function selectCase(item: CommercePaymentReviewCase) {
    const retry = item.canRetryRefundOperation ? item.retryOperation : null;
    setReverifySelectedId("");
    setSupportSelectedId("");
    setSelectedId(item.recordId);
    setAmountText(String(retry?.amountCents ?? item.remainingRefundableAmountCents));
    setReason(retry ? "" : item.reason || "");
    setConfirmation("");
    setOperationId(retry?.operationId || "");
    setFeedback("");
  }

  function selectReverifyCase(item: CommercePaymentReviewCase) {
    setSelectedId("");
    setSupportSelectedId("");
    setReverifySelectedId(item.recordId);
    setReverifyReason("");
    setReverifyConfirmation("");
    setFeedback("");
  }

  function selectSupportCase(
    item: CommercePaymentReviewCase,
    decision: "resolve" | "decline"
  ) {
    setSelectedId("");
    setReverifySelectedId("");
    setSupportSelectedId(item.recordId);
    setSupportDecision(decision);
    setSupportReason("");
    setSupportConfirmation("");
    setSupportOperationId("");
    setFeedback("");
  }

  async function executeRefund() {
    if (!selected || !canExecute || executing) return;
    const retry = selectedRetryOperation;
    const stableOperationId =
      retry?.operationId || operationId || newOperationId(selected.recordId);
    setOperationId(stableOperationId);
    setExecuting(true);
    setFeedback("");
    try {
      const result = await executeDestinationRefund({
        sourceType: selected.sourceType,
        recordId: selected.recordId,
        operationId: stableOperationId,
        amountCents: retry?.amountCents ?? amountCents,
        expectedRefundedAmountCents:
          retry?.expectedRefundedAmountCents ?? selected.refundedAmountCents,
        confirmation,
        reason: reason.trim(),
        providerReason: retry?.providerReason || "requested_by_customer"
      });
      const successMessage =
        result.reconciliationStatus === "webhook_pending"
          ? "Stripe accepted the refund request. Signed webhook reconciliation is pending; seller reversal is not marked complete yet."
          : "Refund request retained for payment reconciliation.";
      await load(pageData?.pagination.page || 1);
      setFeedback(successMessage);
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Refund outcome is unconfirmed. Retry with the same operation after review."
      );
    } finally {
      setExecuting(false);
    }
  }

  async function reverifyRecovery() {
    if (
      !reverifySelected?.connectRecoveryReverifyOperationId ||
      !canReverify ||
      reverifying
    )
      return;
    setReverifying(true);
    setFeedback("");
    try {
      const result = await reverifyDestinationRefundRecovery({
        sourceType: reverifySelected.sourceType,
        recordId: reverifySelected.recordId,
        operationId: reverifySelected.connectRecoveryReverifyOperationId,
        confirmation: reverifyConfirmation,
        reason: reverifyReason.trim()
      });
      const successMessage =
        result.reconciliationStatus === "verified"
          ? "Stripe evidence verified and the exact refund recovery was reconciled."
          : "Stripe evidence was checked; the exact recovery remains held for review.";
      setReverifySelectedId("");
      setReverifyReason("");
      setReverifyConfirmation("");
      await load(pageData?.pagination.page || 1);
      setFeedback(successMessage);
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Connect recovery evidence could not be verified. No new refund was created."
      );
    } finally {
      setReverifying(false);
    }
  }

  async function resolveSupportReport() {
    if (!supportSelected || !canResolveSupport || resolvingSupport) return;
    const stableOperationId =
      supportOperationId || newSupportOperationId(supportSelected.recordId);
    setSupportOperationId(stableOperationId);
    setResolvingSupport(true);
    setFeedback("");
    try {
      const result = await resolveCommercePaymentIssue({
        sourceType: supportSelected.sourceType,
        recordId: supportSelected.recordId,
        operationId: stableOperationId,
        decision: supportDecision,
        expectedStatus: "reported",
        confirmation: supportConfirmation,
        reason: supportReason.trim()
      });
      setSupportSelectedId("");
      await load(pageData?.pagination.page || 1);
      setFeedback(result.message);
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Payment-support outcome is unconfirmed. Retry with the same operation."
      );
    } finally {
      setResolvingSupport(false);
    }
  }

  return (
    <AppCard
      title="Commerce payment review"
      titleLevel={2}
      subtitle="Review buyer refund requests and payment-support reports for courses, Marketplace offers, and Storefront orders."
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          expanded ? "Hide Commerce payment review" : "Open Commerce payment review"
        }
        accessibilityState={{ expanded }}
        onPress={toggle}
        style={styles.toggle}
      >
        <Text style={styles.toggleText}>
          {expanded ? "Hide payment review" : "Open payment review"}
        </Text>
      </Pressable>

      {expanded ? (
        <View style={styles.workspace}>
          <View style={styles.rowBetween}>
            <Text style={styles.meta}>
              {pageData
                ? `${pageData.pagination.total} open review cases`
                : "Loading cases"}
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={loading || executing || reverifying || resolvingSupport}
              onPress={() => void load(pageData?.pagination.page || 1)}
              style={[
                styles.secondary,
                (loading || executing || reverifying || resolvingSupport) &&
                  styles.disabled
              ]}
            >
              <Text style={styles.secondaryText}>Refresh</Text>
            </Pressable>
          </View>
          {loading ? <ActivityIndicator color={palette.accent} /> : null}
          {!loading && pageData && !pageData.cases.length ? (
            <Text style={styles.meta}>No open Commerce payment cases were returned.</Text>
          ) : null}
          {pageData?.cases.map((item) => (
            <View key={`${item.sourceType}:${item.recordId}`} style={styles.caseRow}>
              <Text style={styles.caseTitle}>
                {item.sourceType} · {item.caseStatus.replaceAll("_", " ")}
              </Text>
              <Text style={styles.meta}>
                Record {item.recordId} · item {item.itemId}
              </Text>
              <Text style={styles.meta}>
                Paid {money(item.amountCents, item.currency)} · refunded{" "}
                {money(item.refundedAmountCents, item.currency)} · remaining{" "}
                {money(item.remainingRefundableAmountCents, item.currency)}
              </Text>
              <Text style={styles.meta}>
                Buyer report: {item.disputeReportStatus} · provider dispute:{" "}
                {item.providerDisputeStatus}
              </Text>
              <Text style={styles.meta}>
                Buyer refund: {item.refundRequestStatus} · provider refund:{" "}
                {item.refundLifecycleStatus}
              </Text>
              {item.reason ? <Text style={styles.reason}>{item.reason}</Text> : null}
              {item.canResolvePaymentIssue ? (
                <View style={styles.actionRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Resolve payment issue for ${item.sourceType} record ${item.recordId}`}
                    disabled={executing || resolvingSupport || reverifying}
                    onPress={() => selectSupportCase(item, "resolve")}
                    style={[
                      styles.secondary,
                      (executing || resolvingSupport || reverifying) && styles.disabled
                    ]}
                  >
                    <Text style={styles.secondaryText}>Resolve support report</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Decline payment issue for ${item.sourceType} record ${item.recordId}`}
                    disabled={executing || resolvingSupport || reverifying}
                    onPress={() => selectSupportCase(item, "decline")}
                    style={[
                      styles.secondary,
                      (executing || resolvingSupport || reverifying) && styles.disabled
                    ]}
                  >
                    <Text style={styles.secondaryText}>Decline support report</Text>
                  </Pressable>
                </View>
              ) : null}
              {item.retryOperation ? (
                <Text style={styles.warning}>
                  Exact refund operation: {item.retryOperation.state.replaceAll("_", " ")}
                  {item.retryOperation.providerStatus
                    ? ` · provider ${item.retryOperation.providerStatus}`
                    : ""}
                </Text>
              ) : null}
              {!item.canExecuteRefund &&
              !item.canRetryRefundOperation &&
              !item.connectRecoveryReverifyConfirmation ? (
                <Text style={styles.warning}>
                  {item.connectRecoveryStatus === "policy_pending"
                    ? "A refund operation is already awaiting signed webhook reconciliation."
                    : "Connected-charge evidence is not sufficient for automatic refund execution. Manual provider review is required."}
                </Text>
              ) : null}
              {item.canExecuteRefund || item.canRetryRefundOperation ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${item.canRetryRefundOperation ? "Open exact refund recovery" : "Prepare refund"} for ${item.sourceType} record ${item.recordId}`}
                  disabled={executing || reverifying || resolvingSupport}
                  onPress={() => selectCase(item)}
                  style={[
                    styles.secondary,
                    (executing || reverifying || resolvingSupport) && styles.disabled
                  ]}
                >
                  <Text style={styles.secondaryText}>
                    {item.canRetryRefundOperation
                      ? "Resume exact refund operation"
                      : "Prepare reviewed refund"}
                  </Text>
                </Pressable>
              ) : null}
              {item.connectRecoveryReverifyConfirmation &&
              item.connectRecoveryReverifyOperationId ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Reverify Stripe recovery for ${item.sourceType} record ${item.recordId}`}
                  disabled={executing || reverifying || resolvingSupport}
                  onPress={() => selectReverifyCase(item)}
                  style={[
                    styles.secondary,
                    (executing || reverifying || resolvingSupport) && styles.disabled
                  ]}
                >
                  <Text style={styles.secondaryText}>Reverify Stripe recovery</Text>
                </Pressable>
              ) : null}
            </View>
          ))}

          {selected ? (
            <View style={styles.editor}>
              <Text style={styles.caseTitle}>
                {selectedRetryOperation ? "Resume" : "Refund"} {selected.sourceType}{" "}
                record
              </Text>
              {selectedRetryOperation ? (
                <Text style={styles.meta}>
                  Resume the server-bound operation for{" "}
                  {money(
                    selectedRetryOperation.amountCents,
                    selectedRetryOperation.currency
                  )}
                  . Amount, prior refunded total, provider reason, and operation ID cannot
                  be changed here.
                </Text>
              ) : (
                <TextInput
                  accessibilityLabel="Refund amount in cents"
                  keyboardType="number-pad"
                  onChangeText={(value) => {
                    setAmountText(value.replace(/[^0-9]/g, ""));
                    setConfirmation("");
                    setOperationId("");
                  }}
                  placeholder="Refund amount in cents"
                  placeholderTextColor={palette.textMuted}
                  style={styles.input}
                  value={amountText}
                />
              )}
              <TextInput
                accessibilityLabel="Commerce refund reason"
                multiline
                onChangeText={(value) => {
                  setReason(value);
                  if (!selectedRetryOperation) setOperationId("");
                }}
                placeholder={
                  selectedRetryOperation
                    ? "New detailed Admin audit reason for this retry"
                    : "Detailed internal reason (at least 3 words and 16 characters)"
                }
                placeholderTextColor={palette.textMuted}
                style={[styles.input, styles.multiline]}
                value={reason}
              />
              <Text style={styles.meta}>Type exactly: {expectedConfirmation}</Text>
              <TextInput
                accessibilityLabel="Exact Commerce refund confirmation"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setConfirmation}
                placeholder="Type the exact refund phrase"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
                value={confirmation}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${selectedRetryOperation ? "Resume exact refund operation" : "Execute reviewed refund"} for ${selected.sourceType} record ${selected.recordId}`}
                accessibilityState={{ disabled: !canExecute }}
                disabled={!canExecute}
                onPress={() => void executeRefund()}
                style={[styles.danger, !canExecute && styles.disabled]}
              >
                <Text style={styles.dangerText}>
                  {executing
                    ? "Submitting one exact refund operation..."
                    : selectedRetryOperation
                      ? "Resume exact refund operation"
                      : "Execute reviewed refund"}
                </Text>
              </Pressable>
              {operationId ? (
                <Text style={styles.meta}>
                  {selectedRetryOperation
                    ? "This form is locked to the persisted operation returned by the server."
                    : "This form will reuse the same operation on retry until an input changes."}
                </Text>
              ) : null}
            </View>
          ) : null}

          {reverifySelected?.connectRecoveryReverifyOperationId ? (
            <View style={styles.editor}>
              <Text style={styles.caseTitle}>
                Reverify {reverifySelected.sourceType} refund recovery
              </Text>
              <Text style={styles.meta}>
                Recheck Stripe for the exact server-bound recovery. This does not create a
                new refund and cannot substitute evidence from another operation.
              </Text>
              <TextInput
                accessibilityLabel="Connect recovery reverify reason"
                multiline
                onChangeText={setReverifyReason}
                placeholder="New detailed Admin audit reason for this verification"
                placeholderTextColor={palette.textMuted}
                style={[styles.input, styles.multiline]}
                value={reverifyReason}
              />
              <Text style={styles.meta}>
                Type exactly: {expectedReverifyConfirmation}
              </Text>
              <TextInput
                accessibilityLabel="Exact Connect recovery reverify confirmation"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setReverifyConfirmation}
                placeholder="Type the exact reverify phrase"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
                value={reverifyConfirmation}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Confirm Stripe recovery reverify for ${reverifySelected.sourceType} record ${reverifySelected.recordId}`}
                accessibilityState={{ disabled: !canReverify }}
                disabled={!canReverify}
                onPress={() => void reverifyRecovery()}
                style={[styles.primary, !canReverify && styles.disabled]}
              >
                <Text style={styles.primaryText}>
                  {reverifying
                    ? "Rechecking exact Stripe evidence..."
                    : "Reverify recovery"}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {supportSelected ? (
            <View style={styles.editor}>
              <Text style={styles.caseTitle}>
                {supportDecision === "resolve" ? "Resolve" : "Decline"}{" "}
                {supportSelected.sourceType} payment-support report
              </Text>
              <Text style={styles.meta}>
                This closes only GrowPath support intake. It does not change the provider
                dispute or issue a refund.
              </Text>
              <TextInput
                accessibilityLabel="Payment issue resolution reason"
                multiline
                onChangeText={(value) => {
                  setSupportReason(value);
                  setSupportOperationId("");
                }}
                placeholder="Detailed internal decision reason (at least 3 words and 16 characters)"
                placeholderTextColor={palette.textMuted}
                style={[styles.input, styles.multiline]}
                value={supportReason}
              />
              <Text style={styles.meta}>Type exactly: {expectedSupportConfirmation}</Text>
              <TextInput
                accessibilityLabel="Exact payment issue resolution confirmation"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setSupportConfirmation}
                placeholder="Type the exact payment-support phrase"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
                value={supportConfirmation}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${supportDecision === "resolve" ? "Confirm resolution" : "Confirm decline"} for ${supportSelected.sourceType} record ${supportSelected.recordId}`}
                accessibilityState={{ disabled: !canResolveSupport }}
                disabled={!canResolveSupport}
                onPress={() => void resolveSupportReport()}
                style={[styles.primary, !canResolveSupport && styles.disabled]}
              >
                <Text style={styles.primaryText}>
                  {resolvingSupport
                    ? "Saving one support decision..."
                    : supportDecision === "resolve"
                      ? "Confirm resolved"
                      : "Confirm declined"}
                </Text>
              </Pressable>
              {supportOperationId ? (
                <Text style={styles.meta}>
                  This form will reuse the same operation on retry until the reason
                  changes.
                </Text>
              ) : null}
            </View>
          ) : null}

          {pageData && pageData.pagination.pages > 1 ? (
            <View style={styles.pagination}>
              <Pressable
                accessibilityRole="button"
                disabled={
                  loading ||
                  executing ||
                  reverifying ||
                  resolvingSupport ||
                  pageData.pagination.page <= 1
                }
                onPress={() => void load(pageData.pagination.page - 1)}
                style={[
                  styles.secondary,
                  (loading ||
                    executing ||
                    reverifying ||
                    resolvingSupport ||
                    pageData.pagination.page <= 1) &&
                    styles.disabled
                ]}
              >
                <Text style={styles.secondaryText}>Previous</Text>
              </Pressable>
              <Text style={styles.meta}>
                Page {pageData.pagination.page} of {pageData.pagination.pages}
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={
                  loading ||
                  executing ||
                  reverifying ||
                  resolvingSupport ||
                  pageData.pagination.page >= pageData.pagination.pages
                }
                onPress={() => void load(pageData.pagination.page + 1)}
                style={[
                  styles.secondary,
                  (loading ||
                    executing ||
                    reverifying ||
                    resolvingSupport ||
                    pageData.pagination.page >= pageData.pagination.pages) &&
                    styles.disabled
                ]}
              >
                <Text style={styles.secondaryText}>Next</Text>
              </Pressable>
            </View>
          ) : null}
          {feedback ? (
            <Text accessibilityLiveRegion="polite" style={styles.feedback}>
              {feedback}
            </Text>
          ) : null}
        </View>
      ) : null}
    </AppCard>
  );
}

export function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    toggle: {
      alignSelf: "flex-start",
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    toggleText: { color: palette.link, fontWeight: "800" },
    workspace: { gap: 10, marginTop: 12 },
    rowBetween: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between"
    },
    caseRow: { borderColor: palette.border, borderTopWidth: 1, gap: 5, paddingTop: 10 },
    caseTitle: { color: palette.text, fontWeight: "800" },
    meta: { color: palette.textMuted, lineHeight: 19 },
    reason: { color: palette.textSoft, lineHeight: 19 },
    warning: { color: palette.warning, fontWeight: "700", lineHeight: 19 },
    actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    editor: {
      backgroundColor: palette.surfaceMuted,
      borderRadius: radius.card,
      gap: 10,
      padding: 12
    },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      padding: 10
    },
    multiline: { minHeight: 72, textAlignVertical: "top" },
    secondary: {
      alignItems: "center",
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    secondaryText: { color: palette.text, fontWeight: "800" },
    danger: {
      alignItems: "center",
      backgroundColor: palette.danger,
      borderRadius: radius.card,
      padding: 11
    },
    dangerText: { color: palette.dangerText || palette.accentText, fontWeight: "900" },
    primary: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      padding: 11
    },
    primaryText: { color: palette.accentText, fontWeight: "900" },
    pagination: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
      justifyContent: "space-between"
    },
    feedback: { color: palette.textSoft, fontWeight: "700" },
    disabled: { opacity: 0.5 }
  });
}
