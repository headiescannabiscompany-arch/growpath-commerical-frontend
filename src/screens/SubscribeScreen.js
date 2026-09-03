import React, { useEffect, useState } from "react";
import { Alert, Linking, Text } from "react-native";

import { createCheckoutSession, getSubscription } from "../api/subscription";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import ScreenContainer from "../components/ScreenContainer";
import {
  formatVerifiedPlanPrice,
  verifiedPlanQuote
} from "../constants/pricing";
import { useRecurringPriceQuotes } from "../hooks/useRecurringPriceQuotes";
import { colors, spacing } from "../theme/theme";
import { resolveSubscriptionSafety } from "../features/billing/subscriptionSafety";
import { openExternalUrl } from "../utils/openExternalUrl";

export default function SubscribeScreen({ navigation }) {
  const { quotes } = useRecurringPriceQuotes();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      setStatus(await getSubscription());
    } catch (err) {
      Alert.alert("Error", err?.message || "Unable to load subscription.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function goToStatus() {
    await load();
    if (navigation?.navigate) navigation.navigate("SubscriptionStatus");
  }

  async function openStripeCheckout() {
    const checkout = await createCheckoutSession();
    const url = checkout?.url || checkout?.checkoutUrl || checkout?.data?.url;
    if (!url) {
      Alert.alert("Error", "Could not create checkout session.");
      return;
    }

    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert("Error", "Unable to open payment page.");
      return;
    }

    await openExternalUrl(url);
    Alert.alert(
      "Checkout opened",
      "Complete payment in the browser. Access unlocks only after backend confirmation.",
      [{ text: "Check Status", onPress: goToStatus }]
    );
  }

  async function handleUpgrade() {
    try {
      setLoading(true);
      await openStripeCheckout();
    } catch (err) {
      Alert.alert("Error", err?.message || "Unable to start payment.");
    } finally {
      setLoading(false);
    }
  }

  if (!status) return null;
  const access = resolveSubscriptionSafety(status);
  const monthlyQuote = verifiedPlanQuote(quotes, "pro", "monthly");
  const yearlyQuote = verifiedPlanQuote(quotes, "pro", "yearly");

  return (
    <ScreenContainer scroll>
      <Text style={styles.title}>Become a Pro Grower</Text>

      <Card>
        <Text style={styles.desc}>Unlock all premium features:</Text>

        <Text style={styles.item}>Full AI Diagnose with Vision</Text>
        <Text style={styles.item}>Unlimited plants and photo uploads</Text>
        <Text style={styles.item}>Growers Forum/Q&A access</Text>
        <Text style={styles.item}>Create and sell courses</Text>
        <Text style={styles.item}>Advanced grow analytics</Text>

        <Text style={styles.note}>
          Courses are sold separately by creators. Subscription unlocks platform features
          only after backend confirmation.
        </Text>

        <Text style={styles.note}>
          Secure Stripe checkout opens in your browser. Native in-app purchases are not
          currently available.
        </Text>

        <Text style={styles.price}>
          {formatVerifiedPlanPrice(monthlyQuote)}/month or{" "}
          {formatVerifiedPlanPrice(yearlyQuote)}/year
        </Text>

        {access.active ? (
          <>
            <Text style={styles.active}>Subscription confirmed by backend</Text>
            <Text style={styles.note}>{access.message}</Text>
            {access.managementUrl ? (
              <PrimaryButton
                title="Open Provider Subscription Management"
                onPress={() => openExternalUrl(access.managementUrl)}
                style={{ marginTop: 10 }}
              />
            ) : null}
            <PrimaryButton
              title="View Subscription Status"
              onPress={() => navigation.navigate("SubscriptionStatus")}
              style={{ marginTop: 10 }}
            />
          </>
        ) : (
          <>
            <PrimaryButton
              title={
                loading
                  ? "Processing..."
                  : monthlyQuote
                    ? `Unlock Premium — ${formatVerifiedPlanPrice(monthlyQuote)}/month`
                    : "Stripe pricing unavailable"
              }
              onPress={handleUpgrade}
              disabled={loading || !monthlyQuote}
            />
            <PrimaryButton
              title="View Plans & Pricing"
              onPress={() => navigation.navigate("PricingMatrix")}
              style={{ marginTop: 10 }}
            />
          </>
        )}
      </Card>
    </ScreenContainer>
  );
}

const styles = {
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: spacing(5),
    color: colors.text
  },
  desc: {
    marginBottom: spacing(4),
    fontSize: 16,
    color: colors.textSoft
  },
  item: {
    marginBottom: spacing(2),
    fontSize: 15,
    color: colors.text
  },
  note: {
    marginTop: spacing(3),
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    lineHeight: 16
  },
  price: {
    marginVertical: spacing(4),
    fontSize: 24,
    fontWeight: "700",
    color: colors.accent
  },
  active: {
    marginTop: spacing(4),
    fontSize: 16,
    fontWeight: "600",
    color: colors.accent
  }
};
