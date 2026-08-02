import React, { useEffect, useMemo, useState } from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import { useLocalSearchParams } from "expo-router";

import AppCard from "../../../components/layout/AppCard";
import {
  createCheckoutSession,
  getSubscriptionSetupStatus
} from "../../../api/subscription";
import {
  formatPlanBillingNote,
  formatPlanPrice,
  PLAN_PRICING
} from "../../../constants/pricing";
import { BILLING_PLANS, type BillingPlanKey } from "../planCopy";
import { openExternalUrl } from "../../../utils/openExternalUrl";
import { useAppTheme, type ThemePalette } from "../../../theme/appTheme";

type BillingInterval = "monthly" | "yearly";
type CheckoutMode = "live" | "test" | "unknown";
type FeedbackTone = "info" | "success" | "error";

function normalizePlanKey(value: unknown): BillingPlanKey | null {
  const raw = String(Array.isArray(value) ? value[0] : value || "").toLowerCase();
  return ["pro", "commercial", "facility"].includes(raw) ? (raw as BillingPlanKey) : null;
}

function isLikelyEmail(value: string) {
  const next = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next);
}

function checkoutUrlFromResponse(response: any) {
  return (
    response?.url ||
    response?.checkoutUrl ||
    response?.data?.url ||
    response?.session?.url ||
    ""
  );
}

export default function UpgradePlan() {
  const { width } = useWindowDimensions();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createUpgradePlanStyles(palette), [palette]);
  const searchParams = useLocalSearchParams<{
    plan?: string | string[];
  }>();
  const isWide = width >= 980;

  const requestedPlan = useMemo(
    () => normalizePlanKey(searchParams.plan),
    [searchParams.plan]
  );
  const plans = useMemo(() => {
    if (!requestedPlan) return BILLING_PLANS;
    const selected = BILLING_PLANS.find((plan) => plan.key === requestedPlan);
    if (!selected) return BILLING_PLANS;
    return [selected, ...BILLING_PLANS.filter((plan) => plan.key !== requestedPlan)];
  }, [requestedPlan]);

  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<BillingPlanKey | null>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("info");
  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>("unknown");
  const [giftCheckoutConfigured, setGiftCheckoutConfigured] = useState(false);
  const [giftMode, setGiftMode] = useState(false);
  const [giftRecipientEmail, setGiftRecipientEmail] = useState("");
  const [giftRecipientName, setGiftRecipientName] = useState("");
  const [giftMessage, setGiftMessage] = useState("");

  const giftRecipientValue = giftRecipientEmail.trim().toLowerCase();
  const giftRecipientValid = isLikelyEmail(giftRecipientValue);
  const purchasablePlans = giftMode
    ? BILLING_PLANS.filter((plan) => plan.key === "pro")
    : plans;

  useEffect(() => {
    let mounted = true;

    getSubscriptionSetupStatus()
      .then((status) => {
        const mode = String(status?.mode || "unknown").toLowerCase();
        if (mounted && ["live", "test", "unknown"].includes(mode)) {
          setCheckoutMode(mode as CheckoutMode);
        }
        if (mounted) {
          setGiftCheckoutConfigured(status?.giftCheckoutConfigured === true);
        }
      })
      .catch(() => {
        if (mounted) setCheckoutMode("unknown");
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function startCheckout(plan: BillingPlanKey) {
    const selected = BILLING_PLANS.find((item) => item.key === plan);
    const recipient = giftRecipientValue;
    const recipientName = giftRecipientName.trim();
    const note = giftMessage.trim();

    if (giftMode && plan !== "pro") {
      setFeedback("Only prepaid Pro gifts are supported.");
      setFeedbackTone("error");
      return;
    }

    if (giftMode && !giftCheckoutConfigured) {
      setFeedbackTone("error");
      setFeedback(
        "Gift subscriptions are not available yet. No checkout or payment was created."
      );
      return;
    }

    if (giftMode && !giftRecipientValid) {
      setFeedbackTone("error");
      setFeedback("Enter a valid recipient email before starting a gift checkout.");
      return;
    }

    setLoadingPlan(plan);
    setFeedback("");
    setFeedbackTone("info");
    try {
      const origin =
        typeof window !== "undefined" && window.location ? window.location.origin : "";
      const response = await createCheckoutSession({
        plan,
        interval,
        ...(giftMode
          ? {
              giftMode: true,
              giftRecipientEmail: recipient,
              ...(recipientName ? { giftRecipientName: recipientName } : {}),
              ...(note ? { giftMessage: note } : {}),
              successUrl: origin ? `${origin}/home/personal/upgrade` : undefined,
              cancelUrl: origin ? `${origin}/home/personal/upgrade` : undefined
            }
          : {})
      });
      const url = checkoutUrlFromResponse(response);
      if (!url) {
        setFeedbackTone("error");
        setFeedback("Checkout is unavailable. The backend did not return a URL.");
        return;
      }
      await openExternalUrl(url);
      setFeedback(
        giftMode
          ? `Gift checkout opened in a new tab for ${recipient}. Close it anytime before payment.`
          : `Checkout opened in a new tab for ${selected?.title || "this plan"}. Close it anytime before payment.`
      );
    } catch (e: any) {
      setFeedbackTone("error");
      setFeedback(e?.message || "Unable to start checkout.");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Upgrade Account
        </Text>
        <Text style={styles.subtitle}>
          Pick a plan, choose monthly or yearly billing, and open Stripe when you are
          ready.
          {requestedPlan
            ? ` ${PLAN_PRICING[requestedPlan].title} is shown first from your link.`
            : ""}
        </Text>
        <Text style={styles.comparisonNote}>
          Compare the cards below. Each one explains who it is for, what it unlocks, and
          what Stripe does next when you continue.
        </Text>
        <View style={styles.segment}>
          {(["monthly", "yearly"] as const).map((item) => {
            const active = interval === item;
            return (
              <Pressable
                key={item}
                onPress={() => {
                  setInterval(item);
                  setFeedback("");
                }}
                accessibilityRole="button"
                accessibilityLabel={
                  giftMode
                    ? item === "monthly"
                      ? "One month of prepaid access"
                      : "One year of prepaid access"
                    : item === "monthly"
                      ? "Monthly billing"
                      : "Yearly billing"
                }
                accessibilityState={{ selected: active }}
                style={[styles.segmentButton, active && styles.segmentButtonActive]}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {giftMode
                    ? item === "monthly"
                      ? "One month"
                      : "One year"
                    : item === "monthly"
                      ? "Monthly"
                      : "Yearly"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View
        style={[
          styles.modeBanner,
          checkoutMode === "live"
            ? styles.modeBannerLive
            : checkoutMode === "test"
              ? styles.modeBannerTest
              : styles.modeBannerUnknown
        ]}
      >
        <Text
          style={[
            styles.modeBannerText,
            checkoutMode === "live" ? styles.modeBannerTextLive : null
          ]}
        >
          {checkoutMode === "live"
            ? "Stripe checkout is live. Real cards can be charged."
            : checkoutMode === "test"
              ? "Stripe checkout is in test mode. Test card payments are not real charges."
              : "Stripe checkout mode is being checked before payment."}
        </Text>
      </View>

      <AppCard style={styles.giftCard}>
        <Text style={styles.eyebrow}>Prepaid Pro gift</Text>
        <Text style={styles.cardTitle}>Buy for someone else</Text>
        <Text style={styles.cardDesc}>
          {giftCheckoutConfigured
            ? "Give one prepaid month or year of Pro. Access starts when the recipient claims it and does not renew."
            : "Gift checkout is not available yet because recipient fulfillment and claim delivery are not configured. No gift payment can be started."}
        </Text>
        <View style={styles.segment}>
          {(
            [
              { key: "self", label: "Buy for me" },
              { key: "gift", label: "Gift someone else" }
            ] as const
          ).map((item) => {
            const active = (item.key === "gift") === giftMode;
            return (
              <Pressable
                key={item.key}
                disabled={item.key === "gift" && !giftCheckoutConfigured}
                onPress={() => {
                  setGiftMode(item.key === "gift");
                  setFeedback("");
                }}
                accessibilityRole="button"
                accessibilityState={{
                  disabled: item.key === "gift" && !giftCheckoutConfigured,
                  selected: active
                }}
                accessibilityLabel={
                  item.key === "gift"
                    ? giftCheckoutConfigured
                      ? "Gift subscription mode"
                      : "Gift subscriptions unavailable"
                    : "Buy for me mode"
                }
                style={[
                  styles.segmentButton,
                  active && styles.segmentButtonActive,
                  item.key === "gift" && !giftCheckoutConfigured && styles.buttonDisabled
                ]}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {giftMode ? (
          <>
            <TextInput
              accessibilityLabel="Gift recipient email"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              maxLength={254}
              placeholder="recipient@example.com"
              placeholderTextColor={palette.textMuted}
              style={styles.input}
              value={giftRecipientEmail}
              onChangeText={(value) => {
                setGiftRecipientEmail(value);
                setFeedback("");
              }}
            />
            <TextInput
              accessibilityLabel="Gift recipient name"
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={120}
              placeholder="Recipient name (optional)"
              placeholderTextColor={palette.textMuted}
              style={styles.input}
              value={giftRecipientName}
              onChangeText={(value) => {
                setGiftRecipientName(value);
                setFeedback("");
              }}
            />
            <TextInput
              accessibilityLabel="Gift message"
              autoCapitalize="sentences"
              autoCorrect
              maxLength={500}
              multiline
              placeholder="Short gift note (optional)"
              placeholderTextColor={palette.textMuted}
              style={[styles.input, styles.textArea]}
              value={giftMessage}
              onChangeText={(value) => {
                setGiftMessage(value);
                setFeedback("");
              }}
            />
            <Text style={styles.helper}>
              The recipient receives a one-time claim link. Their prepaid Pro access
              begins on a successful claim and ends after the selected month or year.
            </Text>
          </>
        ) : (
          <Text style={styles.helper}>
            {giftCheckoutConfigured
              ? "Switch to gift mode when you want the checkout tied to another email address."
              : "Buy for me remains available. Gift controls will open only after the recipient handoff is ready."}
          </Text>
        )}
      </AppCard>

      {feedback ? (
        <View
          style={[
            styles.feedback,
            feedbackTone === "success" && styles.feedbackSuccess,
            feedbackTone === "error" && styles.feedbackError
          ]}
          accessibilityRole="alert"
          accessibilityLiveRegion={feedbackTone === "error" ? "assertive" : "polite"}
        >
          <Text
            style={[
              styles.feedbackText,
              feedbackTone === "success" && styles.feedbackTextSuccess,
              feedbackTone === "error" && styles.feedbackTextError
            ]}
          >
            {feedback}
          </Text>
        </View>
      ) : null}

      <View style={[styles.planGrid, isWide ? styles.planGridWide : null]}>
        {purchasablePlans.map((plan) => {
          const loading = loadingPlan === plan.key;
          const featured = requestedPlan === plan.key;
          const giftBlocked = giftMode && !giftRecipientValid;
          return (
            <AppCard
              key={plan.key}
              style={[styles.planCard, featured && styles.planCardFeatured]}
            >
              <Text style={styles.eyebrow}>{plan.eyebrow}</Text>
              {featured ? (
                <Text style={styles.selectedFlag}>Selected from link</Text>
              ) : null}
              <Text style={styles.cardTitle}>{plan.title}</Text>
              <Text style={styles.sectionLabel}>Who it is for</Text>
              <Text style={styles.sectionText}>{plan.audience}</Text>
              <Text style={styles.sectionLabel}>What it unlocks</Text>
              <Text style={styles.cardDesc}>{plan.description}</Text>
              <Text style={styles.sectionLabel}>Plan details</Text>
              <View style={styles.details}>
                {plan.details.map((detail) => (
                  <Text key={detail} style={styles.detail}>
                    • {detail}
                  </Text>
                ))}
              </View>
              <Text style={styles.price}>
                {formatPlanPrice(plan.key, interval)}
                <Text style={styles.priceMeta}>
                  {giftMode
                    ? " one-time"
                    : ` / ${interval === "monthly" ? "month" : "year"}`}
                </Text>
              </Text>
              <Text style={styles.billingNote}>
                {giftMode
                  ? `One prepaid ${interval === "monthly" ? "month" : "year"} of Pro. Starts when claimed and does not renew.`
                  : formatPlanBillingNote(plan.key, interval)}
              </Text>
              <Text style={styles.sectionLabel}>Billing next</Text>
              <Text style={styles.sectionText}>{plan.billingNext}</Text>

              <View style={styles.bullets}>
                {plan.bullets.map((bullet) => (
                  <Text key={bullet} style={styles.bullet}>
                    {bullet}
                  </Text>
                ))}
              </View>

              <Pressable
                onPress={() => void startCheckout(plan.key)}
                disabled={loading || giftBlocked}
                accessibilityRole="button"
                accessibilityState={{ disabled: loading || giftBlocked }}
                accessibilityLabel={
                  giftMode
                    ? `Gift ${plan.title} checkout`
                    : `Choose ${plan.title} ${interval} checkout`
                }
                style={[(loading || giftBlocked) && styles.buttonDisabled, styles.button]}
              >
                <Text style={styles.buttonText}>
                  {loading
                    ? "Starting..."
                    : giftMode
                      ? `Gift ${plan.title}`
                      : `Checkout ${formatPlanPrice(plan.key, interval)}${
                          interval === "monthly" ? "/month" : "/year"
                        }`}
                </Text>
              </Pressable>
            </AppCard>
          );
        })}
      </View>
    </View>
  );
}

export const createUpgradePlanStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    container: { backgroundColor: palette.page, gap: 12, padding: 24 },
    header: { gap: 8 },
    title: { color: palette.text, fontSize: 20, fontWeight: "bold" },
    subtitle: { color: palette.textMuted, fontSize: 14, fontWeight: "700" },
    comparisonNote: {
      color: palette.text,
      fontSize: 13,
      fontWeight: "800",
      lineHeight: 18
    },
    segment: {
      alignSelf: "flex-start",
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: 8,
      borderWidth: 1,
      flexDirection: "row",
      gap: 4,
      marginTop: 8,
      padding: 4
    },
    segmentButton: {
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8
    },
    segmentButtonActive: { backgroundColor: palette.accent },
    segmentText: { color: palette.textSoft, fontSize: 12, fontWeight: "900" },
    segmentTextActive: { color: palette.accentText },
    modeBanner: {
      borderRadius: 8,
      borderWidth: 1,
      padding: 12
    },
    modeBannerLive: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.warning
    },
    modeBannerTest: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.success
    },
    modeBannerUnknown: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border
    },
    modeBannerText: { color: palette.textSoft, fontWeight: "900" },
    modeBannerTextLive: { color: palette.warning },
    giftCard: {
      backgroundColor: palette.card,
      borderColor: palette.border,
      gap: 10
    },
    eyebrow: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    selectedFlag: {
      color: palette.link,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    cardTitle: { color: palette.text, fontSize: 20, fontWeight: "900" },
    sectionLabel: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    sectionText: {
      color: palette.textSoft,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 19
    },
    price: { color: palette.text, fontSize: 30, fontWeight: "900" },
    priceMeta: { color: palette.textMuted, fontSize: 13, fontWeight: "800" },
    billingNote: { color: palette.textSoft, fontSize: 12, fontWeight: "800" },
    cardDesc: { color: palette.textMuted, fontWeight: "700", lineHeight: 20 },
    details: { gap: 4 },
    detail: {
      color: palette.textSoft,
      fontSize: 12,
      fontWeight: "700",
      lineHeight: 18
    },
    helper: {
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: "700",
      lineHeight: 18
    },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 8,
      borderWidth: 1,
      color: palette.text,
      fontSize: 15,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    textArea: {
      minHeight: 92,
      textAlignVertical: "top"
    },
    bullets: { gap: 6 },
    bullet: { color: palette.textSoft, fontSize: 13, fontWeight: "800" },
    feedback: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.info,
      borderRadius: 8,
      borderWidth: 1,
      padding: 12
    },
    feedbackSuccess: { borderColor: palette.success },
    feedbackError: { borderColor: palette.danger },
    feedbackText: { color: palette.text, fontWeight: "800" },
    feedbackTextSuccess: { color: palette.success },
    feedbackTextError: { color: palette.danger },
    planGrid: { gap: 12 },
    planGridWide: { flexDirection: "row" },
    planCard: {
      backgroundColor: palette.card,
      borderColor: palette.border,
      flex: 1,
      gap: 10
    },
    planCardFeatured: {
      borderColor: palette.accent
    },
    button: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: 8,
      marginTop: 4,
      paddingVertical: 12
    },
    buttonDisabled: { opacity: 0.55 },
    buttonText: { color: palette.accentText, fontWeight: "900" }
  });
