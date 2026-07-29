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
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import {
  formatPlanBillingNote,
  formatPlanPrice,
  PLAN_PRICING
} from "@/constants/pricing";
import { useEntitlements } from "@/entitlements";
import { radius } from "@/theme/theme";
import { FREE_POLICY } from "@/config/freePolicy";

type BillingInterval = "monthly" | "yearly";
type PlanKey = "pro" | "commercial" | "facility";
type CheckoutMode = "live" | "test" | "unknown";

type Plan = {
  key: PlanKey;
  title: string;
  eyebrow: string;
  description: string;
  bullets: string[];
};

const PLANS: Plan[] = [
  {
    key: "pro",
    title: PLAN_PRICING.pro.title,
    eyebrow: PLAN_PRICING.pro.eyebrow,
    description:
      "For an individual grower account that needs AI guidance, diagnosis, planning, exports, and the stronger personal toolset without brand or facility admin overhead.",
    bullets: [
      "AI diagnosis, planning, and review workflows",
      "Advanced calculators and grow exports",
      "Personal account tools and saved run history"
    ]
  },
  {
    key: "commercial",
    title: PLAN_PRICING.commercial.title,
    eyebrow: PLAN_PRICING.commercial.eyebrow,
    description:
      "For a public brand or seller that needs storefronts, products, campaigns, courses, lives, orders, analytics, and the discovery surfaces that connect the whole brand workflow.",
    bullets: [
      "Storefront, products, and public brand pages",
      "Courses, lives, and campaign publishing",
      "Orders, analytics, and discovery reach"
    ]
  },
  {
    key: "facility",
    title: PLAN_PRICING.facility.title,
    eyebrow: PLAN_PRICING.facility.eyebrow,
    description:
      "For a multi-user operation that needs rooms, tasks, SOPs, audit evidence, compliance exports, and team coordination with stronger operational controls.",
    bullets: [
      "Rooms, tasks, and team coordination",
      "SOPs, audit evidence, and compliance exports",
      "Multi-user operational workflows"
    ]
  }
];

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
  const { width } = useWindowDimensions();
  const searchParams = useLocalSearchParams<{
    subscription?: string | string[];
    gift?: string | string[];
  }>();
  const isWide = width >= 980;

  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [feedback, setFeedback] = useState("");
  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>("unknown");
  const [trialEnabled, setTrialEnabled] = useState(true);
  const [trialDays, setTrialDays] = useState(30);
  const [pendingImmediatePlan, setPendingImmediatePlan] = useState<PlanKey | null>(null);
  const handledCheckoutResultRef = useRef("");
  const handledGiftResultRef = useRef("");
  const [giftMode, setGiftMode] = useState(false);
  const [giftRecipientEmail, setGiftRecipientEmail] = useState("");
  const [giftRecipientName, setGiftRecipientName] = useState("");
  const [giftMessage, setGiftMessage] = useState("");

  const activePlan = useMemo(() => String(ent.plan || "free"), [ent.plan]);
  const subscriptionActive = ["active", "trial", "trialing"].includes(
    String(auth.user?.subscriptionStatus || "").toLowerCase()
  );
  const reportedTrialPlans = Array.isArray(auth.user?.trialPlansUsed)
    ? auth.user.trialPlansUsed
    : [];
  const usedTrialPlans = new Set<PlanKey>(
    reportedTrialPlans.filter((plan): plan is PlanKey =>
      ["pro", "commercial", "facility"].includes(plan)
    )
  );
  if (!usedTrialPlans.size && auth.user?.trialUsed) usedTrialPlans.add("pro");
  const trialEligibleForPlan = (plan: PlanKey) =>
    trialEnabled && !usedTrialPlans.has(plan);
  const eligibleTrialPlanTitles = PLANS.filter((plan) =>
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

  async function startCheckout(plan: PlanKey, confirmedImmediateBilling = false) {
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
      const selected = PLANS.find((item) => item.key === plan);
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

      <AppCard style={styles.giftCard}>
        <Text style={styles.eyebrow}>Gift subscription</Text>
        <Text style={styles.cardTitle}>Buy for someone else</Text>
        <Text style={styles.cardDesc}>
          Turn this into a gift checkout, enter the recipient email, and use the monthly
          or yearly selector above for the gift term. Optional name and message fields
          are passed into the checkout payload so the backend can build the handoff flow.
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
              The backend receives the recipient email, optional name, note, and gift
              term with the checkout request so it can build the handoff flow.
            </Text>
          </>
        ) : (
          <Text style={styles.helper}>
            Switch to gift mode when you want the checkout tied to another email
            address.
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
        {PLANS.map((plan) => {
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
    </AppPage>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8 },
  kicker: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  headerTitle: {
    color: "#111827",
    fontSize: 30,
    fontWeight: "900"
  },
  headerSubtitle: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "700",
    maxWidth: 760
  },
  segment: {
    alignSelf: "flex-start",
    backgroundColor: "#e2e8f0",
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
  segmentButtonActive: { backgroundColor: "#111827" },
  segmentText: { color: "#334155", fontSize: 12, fontWeight: "900" },
  segmentTextActive: { color: "#ffffff" },
  feedback: {
    backgroundColor: "#ecfdf5",
    borderColor: "#86efac",
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 12
  },
  feedbackText: { color: "#166534", fontWeight: "800" },
  giftCard: { gap: 10 },
  modeBanner: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 12
  },
  modeBannerLive: {
    backgroundColor: "#fff7ed",
    borderColor: "#fb923c"
  },
  modeBannerTest: {
    backgroundColor: "#ecfdf5",
    borderColor: "#86efac"
  },
  modeBannerUnknown: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1"
  },
  modeBannerText: { color: "#334155", fontWeight: "900" },
  modeBannerTextLive: { color: "#9a3412" },
  planGrid: { gap: 12 },
  planGridWide: { flexDirection: "row" },
  planCard: { flex: 1, gap: 10 },
  freeCard: { gap: 8 },
  current: { borderColor: "#166534" },
  eyebrow: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  cardTitle: { color: "#111827", fontSize: 20, fontWeight: "900" },
  helper: { color: "#64748b", fontSize: 12, fontWeight: "700", lineHeight: 18 },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
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
  price: { color: "#111827", fontSize: 30, fontWeight: "900" },
  priceMeta: { color: "#64748b", fontSize: 13, fontWeight: "800" },
  billingNote: { color: "#334155", fontSize: 12, fontWeight: "800" },
  cardDesc: { color: "#475569", fontWeight: "700", lineHeight: 20 },
  bullets: { gap: 6 },
  bullet: { color: "#334155", fontSize: 13, fontWeight: "800" },
  button: {
    alignItems: "center",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    marginTop: 4,
    paddingVertical: 12
  },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: "#ffffff", fontWeight: "900" }
});
