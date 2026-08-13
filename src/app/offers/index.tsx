import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";

import { createCheckoutSession, getSubscriptionSetupStatus } from "@/api/subscription";
import { useAuth } from "@/auth/AuthContext";
import PaymentHelpDialog from "@/components/PaymentHelpDialog";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { formatPlanBillingNote, formatPlanPrice } from "@/constants/pricing";
import { BILLING_PLANS, type BillingPlanKey } from "@/features/billing/planCopy";
import GiftCheckoutReviewAction from "@/features/billing/GiftCheckoutReviewAction";
import GiftCheckoutRecoveryAction from "@/features/billing/GiftCheckoutRecoveryAction";
import { useEntitlements } from "@/entitlements";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { FREE_POLICY } from "@/config/freePolicy";
import {
  OFFERS_GIFT_RETURN_PATH,
  resolveAuthReturnPath,
  safeLoginPath
} from "@/utils/authReturnPath";

type BillingInterval = "monthly" | "yearly";
type CheckoutMode = "live" | "test" | "unknown";
type FeedbackTone = "info" | "success" | "error";

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

export function isExactOffersGiftContinuation(
  params: Record<string, string | string[] | undefined>,
  fragment: unknown = "",
  rawBrowserPath?: unknown
): boolean {
  return (
    resolveAuthReturnPath("/offers", params, fragment, rawBrowserPath) ===
    OFFERS_GIFT_RETURN_PATH
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
  const authenticated = Boolean(!auth.isHydrating && auth.token && auth.user);
  const router = useRouter();
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
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("info");
  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>("unknown");
  const [trialEnabled, setTrialEnabled] = useState(true);
  const [trialDays, setTrialDays] = useState(30);
  const [giftCheckoutConfigured, setGiftCheckoutConfigured] = useState(false);
  const [giftSetupLoaded, setGiftSetupLoaded] = useState(false);
  const [pendingImmediatePlan, setPendingImmediatePlan] = useState<BillingPlanKey | null>(
    null
  );
  const handledCheckoutResultRef = useRef("");
  const [giftMode, setGiftMode] = useState(false);
  const giftModeRef = useRef(giftMode);
  giftModeRef.current = giftMode;
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
  const eligibleTrialPlanTitles = BILLING_PLANS.filter(
    (plan) =>
      trialEligibleForPlan(plan.key) && !(subscriptionActive && activePlan === plan.key)
  ).map((plan) => plan.title);
  const subscriptionResult = useMemo(() => {
    const value = searchParams.subscription;
    return String(Array.isArray(value) ? value[0] : value || "").toLowerCase();
  }, [searchParams.subscription]);
  const browserLocation = (globalThis as any)?.window?.location;
  const fragment = String(browserLocation?.hash || "");
  const rawBrowserPath =
    Platform.OS === "web"
      ? browserLocation
        ? `${String(browserLocation.pathname || "")}${String(
            browserLocation.search || ""
          )}${fragment}`
        : null
      : undefined;
  const giftContinuationRequested = isExactOffersGiftContinuation(
    searchParams as Record<string, string | string[] | undefined>,
    fragment,
    rawBrowserPath
  );
  const giftRecipientValue = giftRecipientEmail.trim().toLowerCase();
  const giftRecipientValid = isLikelyEmail(giftRecipientValue);
  const purchasablePlans = giftMode
    ? BILLING_PLANS.filter((plan) => plan.key === "pro")
    : BILLING_PLANS;
  const giftCheckoutMaterial = useMemo(() => {
    return {
      plan: "pro" as const,
      interval,
      recipientEmail: giftRecipientValue,
      recipientName: giftRecipientName,
      message: giftMessage
    };
  }, [giftMessage, giftRecipientName, giftRecipientValue, interval]);
  const handleGiftFeedback = useCallback((tone: FeedbackTone, message: string) => {
    setFeedbackTone(tone);
    setFeedback(message);
  }, []);

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
        if (mounted) {
          setGiftCheckoutConfigured(status?.giftCheckoutConfigured === true);
          setGiftSetupLoaded(true);
        }
      })
      .catch(() => {
        if (mounted) {
          setCheckoutMode("unknown");
          setGiftCheckoutConfigured(false);
          setGiftSetupLoaded(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!authenticated || (giftSetupLoaded && !giftCheckoutConfigured)) {
      if (giftModeRef.current) setGiftMode(false);
      return;
    }
    if (!giftContinuationRequested || !giftSetupLoaded) return;
    if (!giftModeRef.current) setGiftMode(true);
  }, [authenticated, giftCheckoutConfigured, giftContinuationRequested, giftSetupLoaded]);

  useEffect(() => {
    if (!["success", "canceled"].includes(subscriptionResult)) return;
    if (handledCheckoutResultRef.current === subscriptionResult) return;
    handledCheckoutResultRef.current = subscriptionResult;

    if (subscriptionResult === "success") {
      setFeedbackTone("success");
      setFeedback(
        "Stripe checkout completed. GrowPath is refreshing your plan. If access does not update yet, reload in a moment."
      );
      void auth.retryMe().catch(() => {
        setFeedbackTone("error");
        setFeedback(
          "Stripe checkout completed, but GrowPath could not refresh the plan yet. Reload in a moment or open Account Profile."
        );
      });
      return;
    }

    setFeedbackTone("info");
    setFeedback("Checkout canceled. No new payment was submitted by this checkout.");
  }, [auth, subscriptionResult]);

  async function startCheckout(plan: BillingPlanKey, confirmedImmediateBilling = false) {
    if (giftMode) {
      return;
    }

    if (!trialEligibleForPlan(plan) && !confirmedImmediateBilling) {
      setPendingImmediatePlan(plan);
      const selected = BILLING_PLANS.find((item) => item.key === plan);
      setFeedbackTone("info");
      setFeedback(
        `${selected?.title || "This plan"} has no trial remaining for this account. Review the price, then continue only if you want Stripe to bill when checkout completes.`
      );
      return;
    }

    setPendingImmediatePlan(null);
    setLoadingPlan(plan);
    setFeedback("");
    setFeedbackTone("info");
    try {
      const response = await createCheckoutSession({ plan, interval });
      const url = checkoutUrlFromResponse(response);
      if (!url) {
        setFeedbackTone("error");
        setFeedback("Checkout is unavailable. The backend did not return a URL.");
        return;
      }
      await openCheckoutUrl(url);
      setFeedback("Stripe checkout opened. You can leave before payment.");
    } catch (e: any) {
      setFeedbackTone("error");
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
          <Text accessibilityRole="header" aria-level={1} style={styles.headerTitle}>
            Choose your GrowPath plan
          </Text>
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
        <Text style={styles.eyebrow}>Prepaid Pro gift</Text>
        <Text style={styles.cardTitle}>Buy for someone else</Text>
        <Text style={styles.cardDesc}>
          {giftContinuationRequested && giftSetupLoaded && !authenticated
            ? "Sign in with the purchasing account before gift checkout can continue. No price or payment request has started."
            : giftCheckoutConfigured
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
                  if (item.key === "gift" && !authenticated) {
                    router.push(safeLoginPath("", OFFERS_GIFT_RETURN_PATH) as any);
                    return;
                  }
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
                      ? authenticated
                        ? "Gift subscription mode"
                        : "Sign in for gift subscription"
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
              ? authenticated
                ? "Switch to gift mode when you want the checkout tied to another email address."
                : "Sign in with the purchasing account before requesting a gift price or opening Stripe."
              : "Buy for me remains available. Gift controls will open only after the recipient handoff is ready."}
          </Text>
        )}
        {!giftMode && giftCheckoutConfigured && !authenticated ? (
          <GiftCheckoutReviewAction
            material={giftCheckoutMaterial}
            recipientValid={giftRecipientValid}
            configured
            onFeedback={handleGiftFeedback}
            openCheckoutUrl={openCheckoutUrl}
          />
        ) : null}
      </AppCard>

      <GiftCheckoutRecoveryAction visible={!giftMode} />

      <Pressable
        accessibilityLabel="View gifts purchased by this account"
        accessibilityRole="button"
        onPress={() => router.push("/account/sent-gifts" as any)}
        style={styles.historyButton}
      >
        <Text style={styles.historyButtonTitle}>Gifts you sent</Text>
        <Text style={styles.historyButtonText}>
          Check delivery, claim, refund, and support status for prepaid gifts without
          changing workspaces.
        </Text>
      </Pressable>

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
          const current = activePlan === plan.key && subscriptionActive;
          const loading = loadingPlan === plan.key;
          const confirmingImmediateBilling = pendingImmediatePlan === plan.key;
          const planTrialEligible =
            trialEligibleForPlan(plan.key) && !(subscriptionActive && current);
          const buttonDisabled = loading || current;
          return (
            <AppCard key={plan.key} style={[styles.planCard, current && styles.current]}>
              <Text style={styles.eyebrow}>{plan.eyebrow}</Text>
              <Text style={styles.cardTitle}>{plan.title}</Text>
              {!giftMode ? (
                <Text style={styles.price}>
                  {formatPlanPrice(plan.key, interval)}
                  <Text style={styles.priceMeta}>
                    {` / ${interval === "monthly" ? "month" : "year"}`}
                  </Text>
                </Text>
              ) : null}
              <Text style={styles.billingNote}>
                {giftMode
                  ? `One prepaid ${interval === "monthly" ? "month" : "year"} of Pro. Starts when claimed and does not renew.`
                  : formatPlanBillingNote(plan.key, interval)}
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

              {giftMode ? (
                <GiftCheckoutReviewAction
                  material={giftCheckoutMaterial}
                  recipientValid={giftRecipientValid}
                  configured={giftCheckoutConfigured}
                  onFeedback={handleGiftFeedback}
                  openCheckoutUrl={openCheckoutUrl}
                />
              ) : (
                <Pressable
                  onPress={() => startCheckout(plan.key, confirmingImmediateBilling)}
                  disabled={buttonDisabled}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: buttonDisabled }}
                  accessibilityLabel={
                    confirmingImmediateBilling
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
                      : current
                        ? "Current plan"
                        : confirmingImmediateBilling
                          ? `Continue — billed ${formatPlanPrice(plan.key, interval)}`
                          : planTrialEligible
                            ? `Start ${trialDays}-day trial`
                            : "Review paid checkout"}
                  </Text>
                </Pressable>
              )}
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
      borderColor: palette.info,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 12
    },
    feedbackSuccess: { borderColor: palette.success },
    feedbackError: { borderColor: palette.danger },
    feedbackText: { color: palette.text, fontWeight: "800" },
    feedbackTextSuccess: { color: palette.success },
    feedbackTextError: { color: palette.danger },
    helpButton: {
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 12
    },
    helpButtonTitle: { color: palette.accent, fontWeight: "900" },
    helpButtonText: { color: palette.textMuted, fontSize: 12, marginTop: 3 },
    historyButton: {
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 12
    },
    historyButtonTitle: { color: palette.accent, fontWeight: "900" },
    historyButtonText: { color: palette.textMuted, fontSize: 12, marginTop: 3 },
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
