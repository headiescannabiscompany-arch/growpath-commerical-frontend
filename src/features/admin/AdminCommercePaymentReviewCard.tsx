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

function exactConfirmation(item: CommercePaymentReviewCase, amountCents: number) {
  return `REFUND ${item.sourceType}:${item.recordId} ${amountCents} ${item.currency} AFTER ${item.refundedAmountCents}`;
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
  const [supportSelectedId, setSupportSelectedId] = useState("");
  const [supportDecision, setSupportDecision] = useState<"resolve" | "decline">(
    "resolve"
  );
  const [supportReason, setSupportReason] = useState("");
  const [supportConfirmation, setSupportConfirmation] = useState("");
  const [supportOperationId, setSupportOperationId] = useState("");
  const [resolvingSupport, setResolvingSupport] = useState(false);

  const selected = pageData?.cases.find((item) => item.recordId === selectedId) || null;
  const amountCents = Number(amountText);
  const expectedConfirmation =
    selected && Number.isSafeInteger(amountCents) && amountCents > 0
      ? exactConfirmation(selected, amountCents)
      : "";
  const canExecute = Boolean(
    selected?.canExecuteRefund &&
    Number.isSafeInteger(amountCents) &&
    amountCents > 0 &&
    amountCents <= selected.remainingRefundableAmountCents &&
    detailedReason(reason) &&
    confirmation === expectedConfirmation &&
    !executing
  );
  const supportSelected =
    pageData?.cases.find((item) => item.recordId === supportSelectedId) || null;
  const expectedSupportConfirmation =
    supportSelected?.paymentIssueResolutionConfirmations?.[supportDecision] || "";
  const canResolveSupport = Boolean(
    supportSelected?.canResolvePaymentIssue &&
    detailedReason(supportReason) &&
    supportConfirmation === expectedSupportConfirmation &&
    !resolvingSupport
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
    setSelectedId(item.recordId);
    setAmountText(String(item.remainingRefundableAmountCents));
    setReason(item.reason || "");
    setConfirmation("");
    setOperationId("");
    setFeedback("");
  }

  function selectSupportCase(
    item: CommercePaymentReviewCase,
    decision: "resolve" | "decline"
  ) {
    setSupportSelectedId(item.recordId);
    setSupportDecision(decision);
    setSupportReason("");
    setSupportConfirmation("");
    setSupportOperationId("");
    setFeedback("");
  }

  async function executeRefund() {
    if (!selected || !canExecute || executing) return;
    const stableOperationId = operationId || newOperationId(selected.recordId);
    setOperationId(stableOperationId);
    setExecuting(true);
    setFeedback("");
    try {
      const result = await executeDestinationRefund({
        sourceType: selected.sourceType,
        recordId: selected.recordId,
        operationId: stableOperationId,
        amountCents,
        expectedRefundedAmountCents: selected.refundedAmountCents,
        confirmation,
        reason: reason.trim(),
        providerReason: "requested_by_customer"
      });
      setFeedback(
        result.reconciliationStatus === "webhook_pending"
          ? "Stripe accepted the refund request. Signed webhook reconciliation is pending; seller reversal is not marked complete yet."
          : "Refund request retained for payment reconciliation."
      );
      await load(pageData?.pagination.page || 1);
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
      setFeedback(result.message);
      setSupportSelectedId("");
      await load(pageData?.pagination.page || 1);
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
              disabled={loading || executing}
              onPress={() => void load(pageData?.pagination.page || 1)}
              style={[styles.secondary, (loading || executing) && styles.disabled]}
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
                    disabled={executing || resolvingSupport}
                    onPress={() => selectSupportCase(item, "resolve")}
                    style={[
                      styles.secondary,
                      (executing || resolvingSupport) && styles.disabled
                    ]}
                  >
                    <Text style={styles.secondaryText}>Resolve support report</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Decline payment issue for ${item.sourceType} record ${item.recordId}`}
                    disabled={executing || resolvingSupport}
                    onPress={() => selectSupportCase(item, "decline")}
                    style={[
                      styles.secondary,
                      (executing || resolvingSupport) && styles.disabled
                    ]}
                  >
                    <Text style={styles.secondaryText}>Decline support report</Text>
                  </Pressable>
                </View>
              ) : null}
              {!item.canExecuteRefund ? (
                <Text style={styles.warning}>
                  {item.connectRecoveryStatus === "policy_pending"
                    ? "A refund operation is already awaiting signed webhook reconciliation."
                    : "Connected-charge evidence is not sufficient for automatic refund execution. Manual provider review is required."}
                </Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Prepare refund for ${item.sourceType} record ${item.recordId}`}
                disabled={!item.canExecuteRefund || executing}
                onPress={() => selectCase(item)}
                style={[
                  styles.secondary,
                  (!item.canExecuteRefund || executing) && styles.disabled
                ]}
              >
                <Text style={styles.secondaryText}>Prepare reviewed refund</Text>
              </Pressable>
            </View>
          ))}

          {selected ? (
            <View style={styles.editor}>
              <Text style={styles.caseTitle}>Refund {selected.sourceType} record</Text>
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
              <TextInput
                accessibilityLabel="Commerce refund reason"
                multiline
                onChangeText={(value) => {
                  setReason(value);
                  setOperationId("");
                }}
                placeholder="Detailed internal reason (at least 3 words and 16 characters)"
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
                accessibilityLabel={`Execute reviewed refund for ${selected.sourceType} record ${selected.recordId}`}
                accessibilityState={{ disabled: !canExecute }}
                disabled={!canExecute}
                onPress={() => void executeRefund()}
                style={[styles.danger, !canExecute && styles.disabled]}
              >
                <Text style={styles.dangerText}>
                  {executing
                    ? "Submitting one refund operation..."
                    : "Execute reviewed refund"}
                </Text>
              </Pressable>
              {operationId ? (
                <Text style={styles.meta}>
                  This form will reuse the same operation on retry until an input changes.
                </Text>
              ) : null}
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
                disabled={loading || pageData.pagination.page <= 1}
                onPress={() => void load(pageData.pagination.page - 1)}
                style={[
                  styles.secondary,
                  (loading || pageData.pagination.page <= 1) && styles.disabled
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
                  loading || pageData.pagination.page >= pageData.pagination.pages
                }
                onPress={() => void load(pageData.pagination.page + 1)}
                style={[
                  styles.secondary,
                  (loading || pageData.pagination.page >= pageData.pagination.pages) &&
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
