import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { SUPPORT_CONTACTS } from "@/config/supportContacts";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { cancelSubscription } from "../../../api/subscribe";
import {
  createCheckoutSession,
  getSubscription,
  isSentGift,
  listSentGifts,
  resendSentGift,
  type SentGift
} from "../../../api/subscription";
import { openExternalUrl } from "../../../utils/openExternalUrl";

function subscriptionStatus(plan: any) {
  return String(plan?.subscriptionStatus || plan?.status || "").toLowerCase();
}

function planLabel(plan: any) {
  return String(plan?.plan || "free").toLowerCase();
}

function hasPaidAccess(plan: any) {
  const status = subscriptionStatus(plan);
  const label = planLabel(plan);
  return (
    ["active", "trial", "trialing", "past_due", "unpaid"].includes(status) ||
    label !== "free"
  );
}

function isGiftEntitlement(plan: any) {
  return String(plan?.source || "").toLowerCase() === "gift";
}

function canCancelPaidSubscription(plan: any) {
  if (!hasPaidAccess(plan) || isGiftEntitlement(plan)) return false;
  if (plan?.cancelAtPeriodEnd === true) return false;
  if (String(plan?.billingOwner || "").toLowerCase() === "purchaser") return false;
  if (plan?.canManageBilling === false || plan?.canCancelSubscription === false) {
    return false;
  }
  return true;
}

const SENT_GIFT_STATE_LABELS: Record<SentGift["state"], string> = {
  checkout_pending: "Checkout pending",
  delivery_in_progress: "Preparing delivery",
  awaiting_claim: "Waiting to be claimed",
  delivery_retrying: "Delivery retry scheduled",
  delivery_unknown: "Delivery not confirmed",
  delivery_failed: "Delivery failed",
  claimed: "Claimed",
  refund_pending: "Refund pending",
  refunded: "Refunded",
  support_required: "Support review required",
  canceled: "Canceled"
};

// Stripe charge amounts use two decimal places except for this documented
// zero-decimal set. ISK, HUF, TWD, and UGX retain Stripe's two-decimal charge
// representation even where their display or payout rules differ.
const STRIPE_ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF"
]);

function sentGiftStateLabel(state: SentGift["state"]) {
  return SENT_GIFT_STATE_LABELS[state] || "Status unavailable";
}

function sentGiftStateDetail(gift: SentGift) {
  switch (gift.state) {
    case "checkout_pending":
      return "Checkout has not been confirmed.";
    case "delivery_in_progress":
      return "The gift email is being prepared.";
    case "awaiting_claim":
      return "The email was sent and the recipient has not claimed the gift yet.";
    case "delivery_retrying":
      return "Another delivery attempt is scheduled automatically.";
    case "delivery_unknown":
      return "The last email delivery could not be confirmed.";
    case "delivery_failed":
      return "The gift email could not be delivered.";
    case "claimed":
      return "The recipient claimed this prepaid gift.";
    case "refund_pending":
      return "A refund is being processed.";
    case "refunded":
      return "The gift payment was refunded to the purchaser.";
    case "support_required":
      return "GrowPath billing support needs to review this gift.";
    case "canceled":
      return "This gift was canceled before completion.";
    default:
      return "The latest gift status is unavailable.";
  }
}

function titleCase(value: string) {
  if (!value) return "Unavailable";
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

export function formatSentGiftAmount(
  amountCents: number | null,
  currency: string | null
) {
  const normalizedCurrency = String(currency || "")
    .trim()
    .toUpperCase();
  if (
    typeof amountCents !== "number" ||
    !Number.isSafeInteger(amountCents) ||
    amountCents <= 0 ||
    !/^[A-Z]{3}$/.test(normalizedCurrency)
  ) {
    return "Amount unavailable";
  }
  const minorUnitDigits = STRIPE_ZERO_DECIMAL_CURRENCIES.has(normalizedCurrency) ? 0 : 2;
  const amount = amountCents / 10 ** minorUnitDigits;
  try {
    return new Intl.NumberFormat(undefined, {
      currency: normalizedCurrency,
      style: "currency"
    }).format(amount);
  } catch {
    return `${amount.toFixed(minorUnitDigits)} ${normalizedCurrency}`;
  }
}

function mergeSentGifts(current: SentGift[], incoming: SentGift[]) {
  const merged = new Map(current.map((gift) => [gift.id, gift]));
  incoming.forEach((gift) => merged.set(gift.id, gift));
  return Array.from(merged.values());
}

function replaceSentGift(current: SentGift[], replacement: SentGift) {
  return current.map((gift) => (gift.id === replacement.id ? replacement : gift));
}

function formatSentGiftDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatSentGiftDateTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZoneName: "short",
    year: "numeric"
  });
}

function sentGiftTiming(gift: SentGift) {
  if (gift.state === "claimed") {
    const claimedAt = formatSentGiftDate(gift.claimedAt);
    return claimedAt ? `Claimed ${claimedAt}` : null;
  }
  if (gift.state === "refunded") {
    const refundedAt = formatSentGiftDate(gift.refundedAt);
    return refundedAt ? `Refunded ${refundedAt}` : null;
  }
  if (gift.state === "delivery_retrying") {
    const nextActionAt = formatSentGiftDateTime(gift.nextActionAt);
    if (nextActionAt) return `Next delivery attempt ${nextActionAt}`;
  }
  if (["awaiting_claim", "delivery_retrying", "delivery_unknown"].includes(gift.state)) {
    const expiresAt = formatSentGiftDate(gift.claimExpiresAt);
    return expiresAt ? `Claim link expires ${expiresAt}` : null;
  }
  const paidAt = formatSentGiftDate(gift.paidAt);
  return paidAt ? `Paid ${paidAt}` : null;
}

export function formatGiftEntitlementEnd(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "Pending confirmation";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Pending confirmation";
  return date.toLocaleString(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "long",
    timeZoneName: "short",
    year: "numeric"
  });
}

type BillingHomeProps = {
  purchaserHistoryOnly?: boolean;
};

export default function BillingHome({
  purchaserHistoryOnly = false
}: BillingHomeProps = {}) {
  const { token } = useAuth();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createBillingHomeStyles(palette), [palette]);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(!purchaserHistoryOnly);
  const [busy, setBusy] = useState<"upgrade" | "cancel" | null>(null);
  const [sentGifts, setSentGifts] = useState<SentGift[]>([]);
  const [sentGiftsLoading, setSentGiftsLoading] = useState(true);
  const [sentGiftsLoaded, setSentGiftsLoaded] = useState(false);
  const [sentGiftsError, setSentGiftsError] = useState<string | null>(null);
  const [sentGiftsNextCursor, setSentGiftsNextCursor] = useState<string | null>(null);
  const [sentGiftsLoadingMore, setSentGiftsLoadingMore] = useState(false);
  const [sentGiftsLoadMoreError, setSentGiftsLoadMoreError] = useState<string | null>(
    null
  );
  const [resendingGiftId, setResendingGiftId] = useState<string | null>(null);
  const [confirmingResendGiftId, setConfirmingResendGiftId] = useState<string | null>(
    null
  );
  const [giftFeedback, setGiftFeedback] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getSubscription();
      setPlan(next?.data ?? next ?? null);
    } catch {
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSentGifts = useCallback(async () => {
    setSentGiftsLoading(true);
    setSentGiftsError(null);
    setSentGiftsLoadMoreError(null);
    try {
      const page = await listSentGifts({ limit: 20 });
      setSentGifts(page.gifts);
      setSentGiftsNextCursor(page.nextCursor);
    } catch {
      setSentGiftsError(
        purchaserHistoryOnly
          ? "We couldn't load gifts you sent. No billing action was taken."
          : "We couldn't load gifts you sent. Your current billing status is unaffected."
      );
    } finally {
      setSentGiftsLoaded(true);
      setSentGiftsLoading(false);
    }
  }, [purchaserHistoryOnly]);

  async function loadMoreSentGifts() {
    if (
      !sentGiftsNextCursor ||
      sentGiftsLoading ||
      sentGiftsLoadingMore ||
      resendingGiftId
    ) {
      return;
    }
    const cursor = sentGiftsNextCursor;
    setSentGiftsLoadingMore(true);
    setSentGiftsLoadMoreError(null);
    try {
      const page = await listSentGifts({ limit: 20, cursor });
      setSentGifts((current) => mergeSentGifts(current, page.gifts));
      setSentGiftsNextCursor(page.nextCursor);
    } catch {
      setSentGiftsLoadMoreError(
        "We couldn't load more gifts. The gifts already shown are unchanged."
      );
    } finally {
      setSentGiftsLoadingMore(false);
    }
  }

  useEffect(() => {
    if (!purchaserHistoryOnly) {
      void loadPlan();
    }
  }, [loadPlan, purchaserHistoryOnly]);

  useEffect(() => {
    void loadSentGifts();
  }, [loadSentGifts]);

  async function startUpgrade() {
    setBusy("upgrade");
    try {
      const checkout = await createCheckoutSession({ plan: "pro", interval: "monthly" });
      const url = checkout?.url || checkout?.checkoutUrl || checkout?.data?.url;
      if (!url) {
        Alert.alert("Checkout unavailable", "The backend did not return a checkout URL.");
        return;
      }
      await openExternalUrl(url);
    } catch (error: any) {
      Alert.alert("Checkout failed", error?.message || "Unable to start checkout.");
    } finally {
      setBusy(null);
    }
  }

  async function handleCancel() {
    if (!token) {
      Alert.alert("Sign in required", "Please sign in again before canceling.");
      return;
    }
    setBusy("cancel");
    try {
      await cancelSubscription(token);
      Alert.alert(
        "Renewal canceled",
        "Your paid access remains active through the end of the current billing period."
      );
      await loadPlan();
    } catch (error: any) {
      Alert.alert("Cancel failed", error?.message || "Unable to cancel subscription.");
    } finally {
      setBusy(null);
    }
  }

  async function performGiftResend(gift: SentGift, acknowledgePossibleDuplicate = false) {
    if (resendingGiftId || sentGiftsLoading || sentGiftsLoadingMore) return;
    setConfirmingResendGiftId(null);
    setResendingGiftId(gift.id);
    setGiftFeedback(null);
    try {
      const result = await resendSentGift(gift.id, {
        acknowledgePossibleDuplicate
      });
      if (result?.gift) {
        setSentGifts((current) => replaceSentGift(current, result.gift));
      } else {
        await loadSentGifts();
      }
      setGiftFeedback(
        result?.sent
          ? { kind: "success", text: "The gift email was sent." }
          : {
              kind: "error",
              text: "The resend was not confirmed. Check the current status before trying again."
            }
      );
    } catch (error: any) {
      const savedGift = error?.data?.gift;
      if (isSentGift(savedGift) && savedGift.id === gift.id) {
        setSentGifts((current) => replaceSentGift(current, savedGift));
      }
      setGiftFeedback({
        kind: "error",
        text: error?.message || "The gift email could not be resent."
      });
    } finally {
      setResendingGiftId(null);
    }
  }

  function handleGiftResend(gift: SentGift) {
    if (resendingGiftId || sentGiftsLoading || sentGiftsLoadingMore) return;
    if (gift.actions.resendRequiresAcknowledgement) {
      setGiftFeedback(null);
      setConfirmingResendGiftId(gift.id);
      return;
    }
    void performGiftResend(gift);
  }

  const paid = hasPaidAccess(plan);
  const giftEntitlement = isGiftEntitlement(plan);
  const canCancel = canCancelPaidSubscription(plan);
  const currentPlan = planLabel(plan);
  const currentStatus = subscriptionStatus(plan) || "unknown";
  const giftEndsAt = formatGiftEntitlementEnd(plan?.giftEntitlementEndsAt);
  const cancellationScheduled = plan?.cancelAtPeriodEnd === true;
  const paidThrough = formatGiftEntitlementEnd(plan?.currentPeriodEnd);

  const showSentGiftsSection =
    purchaserHistoryOnly ||
    (!sentGiftsLoaded && sentGiftsLoading) ||
    sentGifts.length > 0 ||
    sentGiftsError;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      {!purchaserHistoryOnly ? (
        <>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            Billing
          </Text>
          <Text style={styles.meta}>Plan: {currentPlan}</Text>
          <Text style={styles.meta}>Status: {currentStatus}</Text>
          {giftEntitlement ? (
            <>
              <Text style={styles.meta}>Access type: Prepaid gift</Text>
              <Text style={styles.meta}>Access ends: {giftEndsAt}</Text>
            </>
          ) : null}
          {!giftEntitlement && cancellationScheduled ? (
            <Text style={styles.meta}>Access through: {paidThrough}</Text>
          ) : null}
          <Text style={styles.note}>
            {giftEntitlement
              ? paid
                ? "Your prepaid access does not renew. Billing belongs to the gift purchaser, so there is no subscription to cancel from this account."
                : "This prepaid gift has ended. You can choose a personal subscription if you want to continue Pro access."
              : cancellationScheduled
                ? `Renewal is canceled. Your paid access remains available through ${paidThrough}.`
                : paid
                  ? "Your paid subscription is confirmed here. Canceling stops renewal and preserves access through the current billing period."
                  : "You are not on a paid plan yet. Use this screen to open the upgrade checkout."}
          </Text>
          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={() => void loadPlan()}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Refreshing..." : "Refresh Status"}
            </Text>
          </Pressable>
          {!loading && canCancel ? (
            <Pressable
              accessibilityLabel="Cancel subscription"
              accessibilityRole="button"
              accessibilityState={{ disabled: busy === "cancel" }}
              style={[styles.cancelButton, busy === "cancel" && styles.buttonDisabled]}
              onPress={() => void handleCancel()}
              disabled={busy === "cancel"}
            >
              <Text style={styles.cancelButtonText}>
                {busy === "cancel" ? "Canceling..." : "Cancel Subscription"}
              </Text>
            </Pressable>
          ) : !loading && !paid ? (
            <Pressable
              accessibilityLabel="Upgrade to Pro"
              accessibilityRole="button"
              accessibilityState={{ disabled: busy === "upgrade" }}
              style={[styles.button, busy === "upgrade" && styles.buttonDisabled]}
              onPress={() => void startUpgrade()}
              disabled={busy === "upgrade"}
            >
              <Text style={styles.buttonText}>
                {busy === "upgrade" ? "Opening..." : "Upgrade to Pro"}
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
      {showSentGiftsSection ? (
        <View style={styles.giftSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeadingCopy}>
              <Text
                accessibilityRole="header"
                aria-level={purchaserHistoryOnly ? 1 : 2}
                style={styles.sectionTitle}
              >
                Gifts you sent
              </Text>
              <Text style={styles.sectionNote}>
                View delivery and claim status for prepaid gifts purchased by this
                account.
              </Text>
            </View>
            {sentGiftsLoaded ? (
              <Pressable
                accessibilityLabel="Refresh gifts you sent"
                accessibilityRole="button"
                accessibilityState={{
                  disabled:
                    sentGiftsLoading || sentGiftsLoadingMore || Boolean(resendingGiftId)
                }}
                disabled={
                  sentGiftsLoading || sentGiftsLoadingMore || Boolean(resendingGiftId)
                }
                onPress={() => void loadSentGifts()}
                style={[
                  styles.secondaryButton,
                  (sentGiftsLoading || sentGiftsLoadingMore || resendingGiftId) &&
                    styles.buttonDisabled
                ]}
              >
                <Text style={styles.secondaryButtonText}>
                  {sentGiftsLoading ? "Refreshing..." : "Refresh"}
                </Text>
              </Pressable>
            ) : null}
          </View>

          {!sentGiftsLoaded && sentGiftsLoading ? (
            <Text accessibilityLiveRegion="polite" style={styles.sectionNote}>
              Checking gift history...
            </Text>
          ) : null}

          {purchaserHistoryOnly &&
          sentGiftsLoaded &&
          !sentGiftsLoading &&
          !sentGiftsError &&
          sentGifts.length === 0 ? (
            <Text style={styles.sectionNote}>
              You have not purchased any prepaid gifts from this account.
            </Text>
          ) : null}

          {sentGiftsError ? (
            <View style={styles.errorPanel}>
              <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                {sentGiftsError}
              </Text>
              {!sentGifts.length ? (
                <Pressable
                  accessibilityLabel="Retry gift history"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: sentGiftsLoading }}
                  disabled={sentGiftsLoading}
                  onPress={() => void loadSentGifts()}
                  style={[
                    styles.secondaryButton,
                    sentGiftsLoading && styles.buttonDisabled
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>Try again</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {giftFeedback?.kind === "success" ? (
            <Text accessibilityLiveRegion="polite" style={styles.successText}>
              {giftFeedback.text}
            </Text>
          ) : giftFeedback ? (
            <View style={styles.errorPanel}>
              <Text accessibilityLiveRegion="assertive" style={styles.errorText}>
                {giftFeedback.text}
              </Text>
            </View>
          ) : null}

          {sentGifts.map((gift) => {
            const isResending = resendingGiftId === gift.id;
            const timing = sentGiftTiming(gift);
            const recipient = [gift.recipientName?.trim(), gift.recipientEmailMasked]
              .filter(Boolean)
              .join(" - ");
            return (
              <View key={gift.id} style={styles.giftCard}>
                <View style={styles.giftCardHeader}>
                  <View style={styles.giftCardHeadingCopy}>
                    <Text style={styles.giftRecipient}>
                      {recipient || "Recipient unavailable"}
                    </Text>
                    <Text style={styles.giftMeta}>
                      {titleCase(gift.plan)} - {titleCase(gift.interval)} prepaid gift
                    </Text>
                  </View>
                  <Text style={styles.giftAmount}>
                    {formatSentGiftAmount(gift.amountCents, gift.currency)}
                  </Text>
                </View>

                <View style={styles.stateBadge}>
                  <Text style={styles.stateBadgeText}>
                    {sentGiftStateLabel(gift.state)}
                  </Text>
                </View>
                <Text style={styles.giftDetail}>{sentGiftStateDetail(gift)}</Text>
                {timing ? <Text style={styles.giftMeta}>{timing}</Text> : null}

                {gift.actions.requiresSupport ? (
                  <View style={styles.supportPanel}>
                    <Text style={styles.supportText}>
                      Email {SUPPORT_CONTACTS.billing} and include gift ID {gift.id}. Do
                      not purchase a replacement until support confirms the outcome.
                    </Text>
                  </View>
                ) : null}

                {gift.actions.canResend && confirmingResendGiftId === gift.id ? (
                  <View
                    accessibilityLiveRegion="assertive"
                    accessibilityRole="alert"
                    style={styles.resendConfirmationPanel}
                  >
                    <Text
                      accessibilityRole="header"
                      style={styles.resendConfirmationTitle}
                    >
                      Send this gift email again?
                    </Text>
                    <Text style={styles.supportText}>
                      The last delivery could not be confirmed. The recipient may already
                      have the email, so sending again could create a duplicate.
                    </Text>
                    <View style={styles.confirmationActions}>
                      <Pressable
                        accessibilityLabel={`Cancel resend to ${recipient || "recipient"}`}
                        accessibilityRole="button"
                        accessibilityState={{
                          disabled:
                            Boolean(resendingGiftId) ||
                            sentGiftsLoading ||
                            sentGiftsLoadingMore
                        }}
                        disabled={
                          Boolean(resendingGiftId) ||
                          sentGiftsLoading ||
                          sentGiftsLoadingMore
                        }
                        onPress={() => setConfirmingResendGiftId(null)}
                        style={[
                          styles.secondaryButton,
                          (resendingGiftId || sentGiftsLoading || sentGiftsLoadingMore) &&
                            styles.buttonDisabled
                        ]}
                      >
                        <Text style={styles.secondaryButtonText}>Not now</Text>
                      </Pressable>
                      <Pressable
                        accessibilityLabel={`Confirm resend gift to ${recipient || "recipient"}`}
                        accessibilityRole="button"
                        accessibilityState={{
                          disabled:
                            Boolean(resendingGiftId) ||
                            sentGiftsLoading ||
                            sentGiftsLoadingMore
                        }}
                        disabled={
                          Boolean(resendingGiftId) ||
                          sentGiftsLoading ||
                          sentGiftsLoadingMore
                        }
                        onPress={() => void performGiftResend(gift, true)}
                        style={[
                          styles.button,
                          (resendingGiftId || sentGiftsLoading || sentGiftsLoadingMore) &&
                            styles.buttonDisabled
                        ]}
                      >
                        <Text style={styles.buttonText}>
                          {isResending ? "Sending..." : "Send again"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : gift.actions.canResend ? (
                  <Pressable
                    accessibilityLabel={`Resend gift to ${recipient || "recipient"}`}
                    accessibilityRole="button"
                    accessibilityState={{
                      disabled:
                        Boolean(resendingGiftId) ||
                        sentGiftsLoading ||
                        sentGiftsLoadingMore
                    }}
                    disabled={
                      Boolean(resendingGiftId) || sentGiftsLoading || sentGiftsLoadingMore
                    }
                    onPress={() => handleGiftResend(gift)}
                    style={[
                      styles.secondaryButton,
                      (resendingGiftId || sentGiftsLoading || sentGiftsLoadingMore) &&
                        styles.buttonDisabled
                    ]}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {isResending ? "Sending..." : "Resend gift email"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}

          {sentGiftsLoadMoreError ? (
            <View style={styles.errorPanel}>
              <Text accessibilityLiveRegion="polite" style={styles.errorText}>
                {sentGiftsLoadMoreError}
              </Text>
            </View>
          ) : null}

          {sentGiftsNextCursor ? (
            <Pressable
              accessibilityLabel="Load more gifts"
              accessibilityRole="button"
              accessibilityState={{
                disabled:
                  sentGiftsLoading || sentGiftsLoadingMore || Boolean(resendingGiftId)
              }}
              disabled={
                sentGiftsLoading || sentGiftsLoadingMore || Boolean(resendingGiftId)
              }
              onPress={() => void loadMoreSentGifts()}
              style={[
                styles.secondaryButton,
                (sentGiftsLoading || sentGiftsLoadingMore || resendingGiftId) &&
                  styles.buttonDisabled
              ]}
            >
              <Text style={styles.secondaryButtonText}>
                {sentGiftsLoadingMore ? "Loading more..." : "Load more gifts"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

export const createBillingHomeStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    screen: { backgroundColor: palette.page, flex: 1 },
    container: { backgroundColor: palette.page, gap: 12, padding: 24 },
    title: { color: palette.text, fontSize: 20, fontWeight: "bold" },
    meta: { color: palette.textMuted },
    note: { color: palette.textSoft, lineHeight: 20 },
    button: {
      backgroundColor: palette.accent,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12
    },
    cancelButton: {
      backgroundColor: palette.surface,
      borderColor: palette.danger,
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 12
    },
    cancelButtonText: {
      color: palette.danger,
      fontWeight: "800",
      textAlign: "center"
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: {
      color: palette.accentText,
      fontWeight: "800",
      textAlign: "center"
    },
    giftSection: {
      borderTopColor: palette.border,
      borderTopWidth: 1,
      gap: 12,
      marginTop: 12,
      paddingTop: 20
    },
    sectionHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      justifyContent: "space-between"
    },
    sectionHeadingCopy: { flex: 1, gap: 4, minWidth: 220 },
    sectionTitle: { color: palette.text, fontSize: 18, fontWeight: "800" },
    sectionNote: { color: palette.textSoft, lineHeight: 20 },
    secondaryButton: {
      alignSelf: "flex-start",
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: 8,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    secondaryButtonText: { color: palette.accent, fontWeight: "800" },
    errorPanel: {
      alignItems: "flex-start",
      backgroundColor: palette.surface,
      borderColor: palette.danger,
      borderRadius: 10,
      borderWidth: 1,
      gap: 10,
      padding: 12
    },
    errorText: { color: palette.danger, lineHeight: 20 },
    successText: { color: palette.success, fontWeight: "700", lineHeight: 20 },
    giftCard: {
      backgroundColor: palette.card,
      borderColor: palette.border,
      borderRadius: 12,
      borderWidth: 1,
      gap: 10,
      padding: 16
    },
    giftCardHeader: {
      alignItems: "flex-start",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      justifyContent: "space-between"
    },
    giftCardHeadingCopy: { flex: 1, gap: 4, minWidth: 180 },
    giftRecipient: { color: palette.text, fontSize: 16, fontWeight: "800" },
    giftAmount: { color: palette.text, fontSize: 16, fontWeight: "800" },
    giftMeta: { color: palette.textMuted, lineHeight: 19 },
    giftDetail: { color: palette.textSoft, lineHeight: 20 },
    stateBadge: {
      alignSelf: "flex-start",
      backgroundColor: palette.accentSoft,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5
    },
    stateBadgeText: { color: palette.accent, fontSize: 12, fontWeight: "800" },
    supportPanel: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.warning,
      borderRadius: 8,
      borderWidth: 1,
      padding: 12
    },
    supportText: { color: palette.text, lineHeight: 20 },
    resendConfirmationPanel: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.warning,
      borderRadius: 8,
      borderWidth: 1,
      gap: 10,
      padding: 12
    },
    resendConfirmationTitle: {
      color: palette.text,
      fontSize: 15,
      fontWeight: "800"
    },
    confirmationActions: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10
    }
  });
