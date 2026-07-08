import React, { useMemo, useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";

import { createCheckoutSession } from "@/api/subscription";
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

type BillingInterval = "monthly" | "yearly";
type PlanKey = "pro" | "commercial" | "facility";

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
    description: "Advanced personal grow tools, AI workflows, and exports.",
    bullets: ["AI diagnosis and planning", "Advanced calculators", "Grow exports"]
  },
  {
    key: "commercial",
    title: PLAN_PRICING.commercial.title,
    eyebrow: PLAN_PRICING.commercial.eyebrow,
    description: "Storefront, products, campaigns, and brand operations.",
    bullets: ["Storefront and products", "Campaign tools", "Commercial inventory"]
  },
  {
    key: "facility",
    title: PLAN_PRICING.facility.title,
    eyebrow: PLAN_PRICING.facility.eyebrow,
    description: "Facility compliance, SOPs, team workflows, audit evidence, and AI.",
    bullets: ["Compliance export packet", "Rooms, plants, SOPs", "Facility AI command"]
  }
];

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
  const isWide = width >= 980;

  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [feedback, setFeedback] = useState("");

  const activePlan = useMemo(() => String(ent.plan || "free"), [ent.plan]);
  const subscriptionActive = ["active", "trial", "trialing"].includes(
    String(auth.user?.subscriptionStatus || "").toLowerCase()
  );

  async function startCheckout(plan: PlanKey) {
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
            Start checkout for a paid plan, then close Stripe before entering payment when
            you only need a smoke test.
          </Text>
          <View style={styles.segment}>
            {(["monthly", "yearly"] as const).map((item) => {
              const active = interval === item;
              return (
                <Pressable
                  key={item}
                  onPress={() => setInterval(item)}
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
      {feedback ? (
        <View style={styles.feedback}>
          <Text style={styles.feedbackText}>{feedback}</Text>
        </View>
      ) : null}

      <View style={[styles.planGrid, isWide ? styles.planGridWide : null]}>
        {PLANS.map((plan) => {
          const current = activePlan === plan.key && subscriptionActive;
          const loading = loadingPlan === plan.key;
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
                onPress={() => startCheckout(plan.key)}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel={`Start ${plan.title} checkout`}
                style={[styles.button, loading && styles.buttonDisabled]}
              >
                <Text style={styles.buttonText}>
                  {loading
                    ? "Starting..."
                    : current
                      ? "Manage checkout"
                      : "Start checkout"}
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
  planGrid: { gap: 12 },
  planGridWide: { flexDirection: "row" },
  planCard: { flex: 1, gap: 10 },
  current: { borderColor: "#166534" },
  eyebrow: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  cardTitle: { color: "#111827", fontSize: 20, fontWeight: "900" },
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
