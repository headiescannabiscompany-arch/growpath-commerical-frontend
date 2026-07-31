import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import { useLocalSearchParams } from "expo-router";

import { createCheckoutSession, getSubscriptionSetupStatus } from "@/api/subscription";
import { useAuth } from "@/auth/AuthContext";
import PaymentHelpDialog from "@/components/PaymentHelpDialog";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import {
  formatPlanBillingNote,
  formatPlanPrice,
  PLAN_PRICING
} from "@/constants/pricing";
import { BILLING_PLANS, type BillingPlanKey } from "@/features/billing/planCopy";
import { useEntitlements } from "@/entitlements";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { FREE_POLICY } from "@/config/freePolicy";

type BillingInterval = "monthly" | "yearly";
type CheckoutMode = "live" | "test" | "unknown";

function isLikelyEmail(value: string) {
  const next = value.trim();
  return /[^\s@]+@[^\s@]+\.[^\s@]+/.test(next);
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

async function openCheckoutUrl(url: string) {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    window.location.href = url;
    return;
  }
  await Linking.openURL(url);
}

export default function Offers() {
  const auth = useAuth();
  const ent = useEntitlements();
  const { palette } = useAppTheme();
  const styles = createStyles(palette);
  const { width } = useWindowDimensions();
  const searchParams = useLocalSearchParams<{
    subscription?: string | string[];
    gift?: string | string[];
  }>();
  const isWide = width >= 980;

  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<BillingPlanKey | null>(null);
  const [feedback, setFeedback] = useState("");
  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>("unknown");
  const [trialEnabled, setTrialEnabled] = useState(true);
  const [trialDays, setTrialDays] = useState(30);
  const [pendingImmediatePlan, setPendingImmediatePlan] = useState<BillingPlanKey | null>(
    null
  );
  const handledCheckoutResultRef = useRef("");
  const handledGiftResultRef = useRef("");
  const [giftMode, setGiftMode] = useState(false);
  const [giftRecipientEmail, setGiftRecipientEmail] = useState("");
  const [giftRecipientName, setGiftRecipientName] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [showPaymentHelp, setShowPaymentHelp] = useState(false);

  const activePlan = useMemo(() => String(ent.plan || "free"), [ent.plan]);
  const subscriptionActive = ["active", "trial", "trialing"].includes(
    String(auth.user?.subscriptionStatus || "").toLowerCase()
  );
  const reportedTrialPlans = Array.isArray(auth.user?.trialPlansUsed)
    ? auth.user.trialPlansUsed
    : [];
  const usedTrialPlans = new Set<BillingPlanKey>(
    reportedTrialPlans.filter((plan): plan is BillingPlanKey =>
      ["pro", "commercial", "facility"].includes(plan)
    )
  );
  if (!usedTrialPlans.size && auth.user?.trialUsed) usedTrialPlans.add("pro");
  const trialEligibleForPlan = (plan: BillingPlanKey) =>
    trialEnabled && !usedTrialPlans.has(plan);
  const eligibleTrialPlanTitles = BILLING_PLANS.filter((plan) =>
    trialEligibleForPlan(plan.key)
  ).map((plan) => plan.title);
  const subscriptionResult = useMemo(() => {
    const value = searchParams.subscription;
    return String(Array.isArray(value) ? value[0] : value || "").toLowerCase();
  }, [searchParams.subscription]);
  const giftResult = useMemo(() => {
    const value = searchParams.gift;
    return String(Array.isArray(value) ? value[0] : value || "").toLowerCase();
  }, [searchParams.gift]);
  const giftRecipientValue = giftRecipientEmail.trim().toLowerCase();
  const giftRecipientValid = isLikelyEmail(giftRecipientValue);

  useEffect(() => {
    let mounted = true;

    getSubscriptionSetupStatus()
      .then((status) => {
        const mode = String(status?.mode || "unknown").toLowerCase();
        if (mounted && ["live", "test", "unknown"].includes(mode)) {
          setCheckoutMode(mode as CheckoutMode);
        }
        if (mounted && status?.trial) {
          setTrialEnabled(status.trial.enabled !== false);
          setTrialDays(Number(status.trial.days) || 30);
        }
      })
      .catch(() => {
        if (mounted) setCheckoutMode("unknown");
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!["success", "canceled"].includes(subscriptionResult)) return;
    if (handledCheckoutResultRef.current === subscriptionResult) return;
    handledCheckoutResultRef.current = subscriptionResult;

    if (subscriptionResult === "success") {
      setFeedback(
        "Stripe checkout completed. GrowPath is refreshing your plan. If access does not update yet, reload in a moment."
      );
      void auth.retryMe().catch(() => {
        setFeedback(
          "Stripe checkout completed, but GrowPath could not refresh the plan yet. Reload in a moment or open Account Profile."
        );
      });
      return;
    }

    setFeedback("Checkout canceled. No new payment was submitted by this checkout.");
  }, [auth, subscriptionResult]);

  useEffect(() => {
    if (!["success", "canceled"].includes(giftResult)) return;
    if (handledGiftResultRef.current === giftResult) return;
    handledGiftResultRef.current = giftResult;

    if (giftResult === "success") {
      setFeedback(
        "Gift checkout completed. The recipient details were included in the checkout request."
      );
      return;
    }

    setFeedback("Gift checkout canceled. No new payment was submitted.");
  }, [giftResult]);

  async function startCheckout(plan: BillingPlanKey, confirmedImmediateBilling = false) {
    if (giftMode) {
      const recipient = giftRecipientValue;
      const recipientName = giftRecipientName.trim();
      const note = giftMessage.trim();

      if (!giftRecipientValid) {
        setFeedback("Enter a valid recipient email before starting a gift checkout.");
        return;
      }

      setLoadingPlan(plan);
      setFeedback("");
      try {
        const origin =
          typeof window !== "undefined" && window.location ? window.location.origin : "";
        const response = await createCheckoutSession({
          plan,
          interval,
          giftMode: true,
          giftRecipientEmail: recipient,
          ...(recipientName ? { giftRecipientName: recipientName } : {}),
          ...(note ? { giftMessage: note } : {}),
          giftTerm: interval,
          successUrl: origin ? `${origin}/offers?gift=success` : undefined,
          cancelUrl: origin ? `${origin}/offers?gift=canceled` : undefined
        });
        const url = checkoutUrlFromResponse(response);
        if (!url) {
          setFeedback("Checkout is unavailable. The backend did not return a URL.");
          return;
        }
        await openCheckoutUrl(url);
        setFeedback(
          `Gift checkout opened in a new tab for ${recipient}. Close it anytime before payment.`
        );
      } catch (e: any) {
        setFeedback(e?.message || "Unable to start checkout.");
      } finally {
        setLoadingPlan(null);
      }
      return;
    }

    if (!trialEligibleForPlan(plan) && !confirmedImmediateBilling) {
      setPendingImmediatePlan(plan);
      const selected = BILLING_PLANS.find((item) => item.key === plan);
      setFeedback(
        `${selected?.title || "This plan"} has no trial remaining for this account. Review the price, then continue only if you want Stripe to bill when checkout completes.`
      );
      return;
    }

    setPendingImmediatePlan(null);
    setLoadingPlan(plan);
    setFeedback("");
    try {
      const response = await createCheckoutSession({ plan, interval });
      const url = checkoutUrlFromResponse(response);
      if (!url) {
        setFeedback("Checkout is unavailable. The backend did not return a URL.");
        return;
      }
      await openCheckoutUrl(url);
      setFeedback("Checkout opened in a new tab. Close it anytime before payment.");
    } catch (e: any) {
      setFeedback(e?.message || "Unable to start checkout.");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <AppPage
      routeKey="offers"
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>Plans</Text>
          <Text style={styles.headerTitle}>Choose your GrowPath plan</Text>
          <Text style={styles.headerSubtitle}>
            {eligibleTrialPlanTitles.length > 0
              ? `This account has a separate ${trialDays}-day trial available for ${eligibleTrialPlanTitles.join(", ")}. Each trial requires a payment method, and paid billing begins after that plan's trial unless canceled.`
              : trialEnabled
                ? `This account has already used its Pro, Commercial, and Facility trials. Starting another paid plan will bill the shown price when Stripe checkout completes.`
                : "New trials have ended. Stripe checkout begins paid billing immediately."}
          </Text>
          <View style={styles.segment}>
            {(["monthly", "yearly"] as const).map((item) => {
              const active = interval === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => {
                    setInterval(item);
                    setPendingImmediatePlan(null);
                    setFeedback("");
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    item === "monthly" ? "Monthly billing" : "Yearly billing"
                  }
                  style={[styles.segmentButton, active && styles.segmentButtonActive]}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {item === "monthly" ? "Monthly" : "Yearly"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      }
      railOverride={null}
    >
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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open payment help"
        onPress={() => setShowPaymentHelp(true)}
        style={styles.helpButton}
      >
        <Text style={styles.helpButtonTitle}>Payment or subscription problem?</Text>
        <Text style={styles.helpButtonText}>
          Open payment help without starting checkout.
        </Text>
      </Pressable>

      <AppCard style={styles.giftCard}>
        <Text style={styles.eyebrow}>Gift subscription</Text>
        <Text style={styles.cardTitle}>Buy for someone else</Text>
        <Text style={styles.cardDesc}>
          Turn this into a gift checkout, enter the recipient email, and use the monthly
          or yearly selector above for the gift term. Optional name and message fields are
          passed into the checkout payload so the backend can build the handoff flow.
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
                onPress={() => {
                  setGiftMode(item.key === "gift");
                  setFeedback("");
                }}
                accessibilityRole="button"
                accessibilityLabel={
                  item.key === "gift" ? "Gift subscription mode" : "Buy for me mode"
                }
                style={[styles.segmentButton, active && styles.segmentButtonActive]}
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
              placeholder="recipient@example.com"
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
              placeholder="Recipient name (optional)"
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
              multiline
              placeholder="Short gift note (optional)"
              style={[styles.input, styles.textArea]}
              value={giftMessage}
              onChangeText={(value) => {
                setGiftMessage(value);
                setFeedback("");
              }}
            />
            <Text style={styles.helper}>
              The backend receives the recipient email, optional name, note, and gift term
              with the checkout request so it can build the handoff flow.
            </Text>
          </>
        ) : (
          <Text style={styles.helper}>
            Switch to gift mode when you want the checkout tied to another email address.
          </Text>
        )}
      </AppCard>

      <AppCard style={styles.freeCard}>
        <Text style={styles.eyebrow}>Ad-supported Free</Text>
        <Text style={styles.cardTitle}>Test the real GrowPath experience</Text>
        <Text style={styles.cardDesc}>
          Track {FREE_POLICY.maxTrackedGrows} grow and {FREE_POLICY.maxTrackedPlants}
          {" plant"}; use rule-based tools for other plants without tracking them; receive
          {` ${FREE_POLICY.aiCreditsPerWeek} AI credits weekly`}; join courses; publish
          one paid course; and use Forum within daily anti-spam limits. Paid accounts
          receive at least {FREE_POLICY.paidAdReductionPercentMinimum}% fewer ads and
          higher limits.
        </Text>
      </AppCard>

      {feedback ? (
        <View
          style={styles.feedback}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          <Text style={styles.feedbackText}>{feedback}</Text>
        </View>
      ) : null}

      <View style={[styles.planGrid, isWide ? styles.planGridWide : null]}>
        {BILLING_PLANS.map((plan) => {
          const current = activePlan === plan.key && subscriptionActive;
          const loading = loadingPlan === plan.key;
          const confirmingImmediateBilling = pendingImmediatePlan === plan.key;
          const planTrialEligible = trialEligibleForPlan(plan.key);
          const giftBlocked = giftMode && !giftRecipientValid;
          const buttonDisabled = loading || (!giftMode && current) || giftBlocked;
          return (
            <AppCard key={plan.key} style={[styles.planCard, current && styles.current]}>
              <Text style={styles.eyebrow}>{plan.eyebrow}</Text>
              <Text style={styles.cardTitle}>{plan.title}</Text>
              <Text style={styles.price}>
                {formatPlanPrice(plan.key, interval)}
                <Text style={styles.priceMeta}>
                  {" "}
                  / {interval === "monthly" ? "month" : "year"}
                </Text>
              </Text>
              <Text style={styles.billingNote}>
                {formatPlanBillingNote(plan.key, interval)}
              </Text>
              <Text style={styles.cardDesc}>{plan.description}</Text>

              <Text style={styles.sectionLabel}>Plan details</Text>
              <View style={styles.details}>
                {plan.details.map((detail) => (
                  <Text key={detail} style={styles.detail}>
                    • {detail}
                  </Text>
                ))}
              </View>

              <View style={styles.bullets}>
                {plan.bullets.map((bullet) => (
                  <Text key={bullet} style={styles.bullet}>
                    {bullet}
                  </Text>
                ))}
              </View>

              <Pressable
                onPress={() => startCheckout(plan.key, confirmingImmediateBilling)}
                disabled={buttonDisabled}
                accessibilityRole="button"
                accessibilityLabel={
                  giftMode
                    ? `Gift ${plan.title} checkout`
                    : confirmingImmediateBilling
                      ? `Continue to paid ${plan.title} checkout`
                      : planTrialEligible
                        ? `Start ${plan.title} trial checkout`
                        : `Review paid ${plan.title} checkout`
                }
                style={[styles.button, buttonDisabled && styles.buttonDisabled]}
              >
                <Text style={styles.buttonText}>
                  {loading
                    ? "Starting..."
                    : !giftMode && current
                      ? "Current plan"
                      : giftMode
                        ? `Gift ${plan.title}`
                        : confirmingImmediateBilling
                          ? `Continue — billed ${formatPlanPrice(plan.key, interval)}`
                          : planTrialEligible
                            ? `Start ${trialDays}-day trial`
                            : "Review paid checkout"}
                </Text>
              </Pressable>
            </AppCard>
          );
        })}
      </View>
      {showPaymentHelp ? (
        <PaymentHelpDialog onClose={() => setShowPaymentHelp(false)} />
      ) : null}
    </AppPage>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    header: { gap: 8 },
    kicker: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    headerTitle: {
      color: palette.text,
      fontSize: 30,
      fontWeight: "900"
    },
    headerSubtitle: {
      color: palette.textMuted,
      fontSize: 14,
      fontWeight: "700",
      maxWidth: 760
    },
    segment: {
      alignSelf: "flex-start",
      backgroundColor: palette.surfaceStrong,
      borderRadius: radius.card,
      flexDirection: "row",
      gap: 4,
      marginTop: 8,
      padding: 4
    },
    segmentButton: {
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 8
    },
    segmentButtonActive: { backgroundColor: palette.accent },
    segmentText: { color: palette.textMuted, fontSize: 12, fontWeight: "900" },
    segmentTextActive: { color: palette.accentText },
    feedback: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.success,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 12
    },
    feedbackText: { color: palette.text, fontWeight: "800" },
    helpButton: {
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 12
    },
    helpButtonTitle: { color: palette.accent, fontWeight: "900" },
    helpButtonText: { color: palette.textMuted, fontSize: 12, marginTop: 3 },
    giftCard: { gap: 10 },
    modeBanner: {
      borderRadius: radius.card,
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
    modeBannerText: { color: palette.text, fontWeight: "900" },
    modeBannerTextLive: { color: palette.warning },
    planGrid: { gap: 12 },
    planGridWide: { flexDirection: "row" },
    planCard: { flex: 1, gap: 10 },
    freeCard: { gap: 8 },
    current: { borderColor: palette.accent },
    eyebrow: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    cardTitle: { color: palette.text, fontSize: 20, fontWeight: "900" },
    helper: { color: palette.textMuted, fontSize: 12, fontWeight: "700", lineHeight: 18 },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      color: palette.text,
      borderRadius: radius.card,
      borderWidth: 1,
      fontSize: 15,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    textArea: {
      minHeight: 92,
      textAlignVertical: "top"
    },
    price: { color: palette.text, fontSize: 30, fontWeight: "900" },
    priceMeta: { color: palette.textMuted, fontSize: 13, fontWeight: "800" },
    billingNote: { color: palette.textMuted, fontSize: 12, fontWeight: "800" },
    cardDesc: { color: palette.textSoft, fontWeight: "700", lineHeight: 20 },
    sectionLabel: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    details: { gap: 4 },
    detail: { color: palette.textMuted, fontSize: 12, fontWeight: "700", lineHeight: 18 },
    bullets: { gap: 6 },
    bullet: { color: palette.textMuted, fontSize: 13, fontWeight: "800" },
    button: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      marginTop: 4,
      paddingVertical: 12
    },
    buttonDisabled: { opacity: 0.55 },
    buttonText: { color: palette.accentText, fontWeight: "900" }
  });
