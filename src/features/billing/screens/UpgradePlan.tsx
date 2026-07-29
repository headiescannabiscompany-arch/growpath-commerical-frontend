import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { openExternalUrl } from "../../../utils/openExternalUrl";

type BillingInterval = "monthly" | "yearly";
type PlanKey = "pro" | "commercial" | "facility";
type CheckoutMode = "live" | "test" | "unknown";

type Plan = {
  key: PlanKey;
  title: string;
  eyebrow: string;
  audience: string;
  description: string;
  billingNext: string;
  bullets: string[];
};

const PLANS: Plan[] = [
  {
    key: "pro",
    title: PLAN_PRICING.pro.title,
    eyebrow: PLAN_PRICING.pro.eyebrow,
    audience:
      "Solo growers and personal accounts that want AI guidance, diagnosis, planning, exports, and saved run history without storefront or facility admin overhead.",
    description:
      "For an individual grower account that needs AI guidance, diagnosis, planning, exports, and the stronger personal toolset without brand or facility admin overhead.",
    billingNext:
      "Stripe opens with Pro selected and the chosen monthly or yearly interval. Payment is collected there.",
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
    audience:
      "Brands, sellers, and educators that need storefronts, products, courses, lives, orders, analytics, and discovery surfaces.",
    description:
      "For a public brand or seller that needs storefronts, products, campaigns, courses, lives, orders, analytics, and the discovery surfaces that connect the whole brand workflow.",
    billingNext:
      "Stripe opens with Commercial selected and the chosen monthly or yearly interval. Payment is collected there.",
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
    audience:
      "Multi-user operators that need rooms, tasks, SOPs, compliance, and team controls.",
    description:
      "For a multi-user operation that needs rooms, tasks, SOPs, audit evidence, compliance exports, and team coordination with stronger operational controls.",
    billingNext:
      "Stripe opens with Facility selected and the chosen monthly or yearly interval. Payment is collected there.",
    bullets: [
      "Rooms, tasks, and team coordination",
      "SOPs, audit evidence, and compliance exports",
      "Multi-user operational workflows"
    ]
  }
];

function normalizePlanKey(value: unknown): PlanKey | null {
  const raw = String(Array.isArray(value) ? value[0] : value || "").toLowerCase();
  return ["pro", "commercial", "facility"].includes(raw) ? (raw as PlanKey) : null;
}

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

export default function UpgradePlan() {
  const { width } = useWindowDimensions();
  const searchParams = useLocalSearchParams<{
    plan?: string | string[];
    gift?: string | string[];
  }>();
  const isWide = width >= 980;

  const requestedPlan = useMemo(
    () => normalizePlanKey(searchParams.plan),
    [searchParams.plan]
  );
  const giftResult = useMemo(() => {
    const value = searchParams.gift;
    return String(Array.isArray(value) ? value[0] : value || "").toLowerCase();
  }, [searchParams.gift]);
  const plans = useMemo(() => {
    if (!requestedPlan) return PLANS;
    const selected = PLANS.find((plan) => plan.key === requestedPlan);
    if (!selected) return PLANS;
    return [selected, ...PLANS.filter((plan) => plan.key !== requestedPlan)];
  }, [requestedPlan]);

  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [feedback, setFeedback] = useState("");
  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>("unknown");
  const [giftMode, setGiftMode] = useState(false);
  const [giftRecipientEmail, setGiftRecipientEmail] = useState("");
  const [giftRecipientName, setGiftRecipientName] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const handledGiftResultRef = useRef("");

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
      })
      .catch(() => {
        if (mounted) setCheckoutMode("unknown");
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!giftResult || !["success", "canceled"].includes(giftResult)) return;
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

  async function startCheckout(plan: PlanKey) {
    const selected = PLANS.find((item) => item.key === plan);
    const recipient = giftRecipientValue;
    const recipientName = giftRecipientName.trim();
    const note = giftMessage.trim();

    if (giftMode && !giftRecipientValid) {
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
        ...(giftMode
          ? {
              giftMode: true,
              giftRecipientEmail: recipient,
              ...(recipientName ? { giftRecipientName: recipientName } : {}),
              ...(note ? { giftMessage: note } : {}),
              giftTerm: interval,
              successUrl: origin
                ? `${origin}/home/personal/upgrade?gift=success`
                : undefined,
              cancelUrl: origin
                ? `${origin}/home/personal/upgrade?gift=canceled`
                : undefined
            }
          : {})
      });
      const url = checkoutUrlFromResponse(response);
      if (!url) {
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
      setFeedback(e?.message || "Unable to start checkout.");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Upgrade Account</Text>
        <Text style={styles.subtitle}>
          Pick a plan, choose monthly or yearly billing, and open Stripe when you are
          ready.
          {requestedPlan
            ? ` ${PLAN_PRICING[requestedPlan].title} is shown first from your link.`
            : ""}
        </Text>
        <Text style={styles.comparisonNote}>
          Compare the cards below. Each one explains who it is for, what it unlocks,
          and what Stripe does next when you continue.
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
        {plans.map((plan) => {
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

const styles = StyleSheet.create({
  container: { gap: 12, padding: 24 },
  header: { gap: 8 },
  title: { fontSize: 20, fontWeight: "bold" },
  subtitle: { color: "#475569", fontSize: 14, fontWeight: "700" },
  comparisonNote: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18
  },
  segment: {
    alignSelf: "flex-start",
    backgroundColor: "#e2e8f0",
    borderRadius: 8,
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
  segmentButtonActive: { backgroundColor: "#111827" },
  segmentText: { color: "#334155", fontSize: 12, fontWeight: "900" },
  segmentTextActive: { color: "#ffffff" },
  modeBanner: {
    borderRadius: 8,
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
  giftCard: { gap: 10 },
  eyebrow: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  selectedFlag: {
    color: "#0f766e",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  cardTitle: { color: "#111827", fontSize: 20, fontWeight: "900" },
  sectionLabel: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  sectionText: { color: "#334155", fontSize: 13, fontWeight: "700", lineHeight: 19 },
  price: { color: "#111827", fontSize: 30, fontWeight: "900" },
  priceMeta: { color: "#64748b", fontSize: 13, fontWeight: "800" },
  billingNote: { color: "#334155", fontSize: 12, fontWeight: "800" },
  cardDesc: { color: "#475569", fontWeight: "700", lineHeight: 20 },
  helper: { color: "#64748b", fontSize: 12, fontWeight: "700", lineHeight: 18 },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  textArea: {
    minHeight: 92,
    textAlignVertical: "top"
  },
  bullets: { gap: 6 },
  bullet: { color: "#334155", fontSize: 13, fontWeight: "800" },
  feedback: {
    backgroundColor: "#ecfdf5",
    borderColor: "#86efac",
    borderRadius: 8,
    borderWidth: 1,
    padding: 12
  },
  feedbackText: { color: "#166534", fontWeight: "800" },
  planGrid: { gap: 12 },
  planGridWide: { flexDirection: "row" },
  planCard: { flex: 1, gap: 10 },
  planCardFeatured: {
    borderColor: "#0f766e"
  },
  button: {
    alignItems: "center",
    backgroundColor: "#166534",
    borderRadius: 8,
    marginTop: 4,
    paddingVertical: 12
  },
  buttonDisabled: { opacity: 0.55 },
  buttonText: { color: "#ffffff", fontWeight: "900" }
});
