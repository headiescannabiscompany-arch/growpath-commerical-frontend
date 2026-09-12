import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import AppCard from "@/components/layout/AppCard";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

export type BuyerPaymentReviewStatus = {
  recordId: string | null;
  paymentStatus: string;
  amountCents: number;
  currency: string;
  refundedAmountCents: number;
  refundRequestStatus: string;
  refundLifecycleStatus?: string;
  refundStatus?: string;
  disputeReportStatus: string;
  providerDisputeStatus?: string;
  disputeStatus?: string;
  connectRecoveryStatus?: string;
};

export type BuyerPaymentReviewRequest = {
  recordId: string;
  expectedRefundedAmountCents: number;
  reason: string;
};

type Props = {
  status: BuyerPaymentReviewStatus | null;
  onRequestRefund: (request: BuyerPaymentReviewRequest) => Promise<any>;
  onReportPaymentIssue: (request: BuyerPaymentReviewRequest) => Promise<any>;
  onRefresh?: () => Promise<any>;
};

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

export default function BuyerPaymentReviewCard({
  status,
  onRequestRefund,
  onReportPaymentIssue,
  onRefresh
}: Props) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState<"refund" | "issue" | "">("");
  const [refundReason, setRefundReason] = useState("");
  const [issueReason, setIssueReason] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    setExpanded(false);
    setRefundReason("");
    setIssueReason("");
    setFeedback("");
  }, [status?.recordId]);

  if (
    !status?.recordId ||
    !["paid", "disputed", "refunded"].includes(status.paymentStatus)
  ) {
    return null;
  }
  const exactStatus = status;
  // Refunded records remain visible history, not authorization for new review writes.
  const canSubmitReview = ["paid", "disputed"].includes(status.paymentStatus);

  const refundLifecycle = String(
    status.refundLifecycleStatus || status.refundStatus || "none"
  );
  const providerDispute = String(
    status.providerDisputeStatus || status.disputeStatus || "none"
  );
  const refundRequest = String(status.refundRequestStatus || "none");
  const disputeReport = String(status.disputeReportStatus || "none");
  const remaining = Math.max(
    0,
    Number(status.amountCents || 0) - Number(status.refundedAmountCents || 0)
  );
  const canRequestRefund =
    canSubmitReview &&
    remaining > 0 &&
    refundLifecycle !== "full" &&
    !["requested", "refunded"].includes(refundRequest);
  const canReportIssue =
    canSubmitReview &&
    !["reported", "resolved", "declined", "closed"].includes(disputeReport) &&
    !["open", "lost"].includes(providerDispute);

  async function submit(kind: "refund" | "issue") {
    if (
      busy ||
      !exactStatus.recordId ||
      (kind === "refund" ? !canRequestRefund : !canReportIssue)
    )
      return;
    const reason = (kind === "refund" ? refundReason : issueReason).trim();
    if (reason.length < 8) return;
    setBusy(kind);
    setFeedback("");
    try {
      const action = kind === "refund" ? onRequestRefund : onReportPaymentIssue;
      const result = await action({
        recordId: exactStatus.recordId,
        expectedRefundedAmountCents: Number(exactStatus.refundedAmountCents || 0),
        reason
      });
      setFeedback(
        result?.message ||
          (kind === "refund"
            ? "Refund request recorded for payment review."
            : "Payment issue recorded for GrowPath support review. This does not open a bank or card dispute.")
      );
      if (kind === "refund") setRefundReason("");
      else setIssueReason("");
      if (onRefresh) await onRefresh();
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : kind === "refund"
            ? "Unable to request a refund."
            : "Unable to report the payment issue."
      );
    } finally {
      setBusy("");
    }
  }

  return (
    <AppCard
      title="Payment support"
      titleLevel={2}
      subtitle={`${money(status.amountCents, status.currency)} paid · ${money(status.refundedAmountCents, status.currency)} refunded`}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={expanded ? "Hide payment support" : "Open payment support"}
        onPress={() => setExpanded((current) => !current)}
        style={styles.toggle}
      >
        <Text style={styles.toggleText}>
          {expanded
            ? "Hide support"
            : canSubmitReview
              ? "Request support"
              : "View payment history"}
        </Text>
      </Pressable>
      {expanded ? (
        <View style={styles.form}>
          <Text style={styles.meta}>
            Refund request: {refundRequest} · provider refund: {refundLifecycle}
          </Text>
          <Text style={styles.meta}>
            Support report: {disputeReport} · provider dispute: {providerDispute}
          </Text>
          {!canSubmitReview ? (
            <Text style={styles.notice}>
              This payment is fully refunded. Its payment and refund history remain
              available here; no new payment review request can be submitted for this
              purchase.
            </Text>
          ) : null}
          {status.connectRecoveryStatus === "policy_pending" ? (
            <Text style={styles.warning}>
              A provider refund is awaiting signed webhook reconciliation.
            </Text>
          ) : null}
          <TextInput
            accessibilityLabel="Refund request reason"
            editable={canSubmitReview}
            multiline
            onChangeText={setRefundReason}
            placeholder="Why are you requesting a refund?"
            placeholderTextColor={palette.textMuted}
            style={[styles.input, styles.multiline]}
            value={refundReason}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Submit refund review request"
            accessibilityState={{
              disabled:
                Boolean(busy) || !canRequestRefund || refundReason.trim().length < 8
            }}
            disabled={
              Boolean(busy) || !canRequestRefund || refundReason.trim().length < 8
            }
            onPress={() => void submit("refund")}
            style={[
              styles.primary,
              (busy || !canRequestRefund || refundReason.trim().length < 8) &&
                styles.disabled
            ]}
          >
            <Text style={styles.primaryText}>
              {busy === "refund"
                ? "Sending request..."
                : refundRequest === "requested"
                  ? "Refund already requested"
                  : "Request refund review"}
            </Text>
          </Pressable>
          <Text style={styles.notice}>
            A GrowPath payment issue report is support intake only. It does not open a
            bank, card-network, or Stripe dispute.
          </Text>
          <TextInput
            accessibilityLabel="Payment issue reason"
            editable={canSubmitReview}
            multiline
            onChangeText={setIssueReason}
            placeholder="Describe the payment issue"
            placeholderTextColor={palette.textMuted}
            style={[styles.input, styles.multiline]}
            value={issueReason}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Submit payment issue report"
            accessibilityState={{
              disabled: Boolean(busy) || !canReportIssue || issueReason.trim().length < 8
            }}
            disabled={Boolean(busy) || !canReportIssue || issueReason.trim().length < 8}
            onPress={() => void submit("issue")}
            style={[
              styles.secondary,
              (busy || !canReportIssue || issueReason.trim().length < 8) &&
                styles.disabled
            ]}
          >
            <Text style={styles.secondaryText}>
              {busy === "issue"
                ? "Sending report..."
                : disputeReport === "reported"
                  ? "Payment issue already reported"
                  : disputeReport === "resolved"
                    ? "Payment issue resolved"
                    : disputeReport === "declined"
                      ? "Payment issue report declined"
                      : "Report payment issue"}
            </Text>
          </Pressable>
          {busy ? <ActivityIndicator color={palette.accent} /> : null}
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
    form: { gap: 10, marginTop: 12 },
    meta: { color: palette.textMuted, lineHeight: 19 },
    notice: { color: palette.textSoft, lineHeight: 19 },
    warning: { color: palette.warning, fontWeight: "700", lineHeight: 19 },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      padding: 10
    },
    multiline: { minHeight: 72, textAlignVertical: "top" },
    primary: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      padding: 11
    },
    primaryText: { color: palette.accentText, fontWeight: "800" },
    secondary: {
      alignItems: "center",
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 11
    },
    secondaryText: { color: palette.text, fontWeight: "800" },
    feedback: { color: palette.textSoft, fontWeight: "700" },
    disabled: { opacity: 0.5 }
  });
}
