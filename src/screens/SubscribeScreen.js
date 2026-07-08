import React, { useEffect, useState } from "react";
import { Alert, Linking, Platform, Text } from "react-native";

import {
  createCheckoutSession,
  getSubscription,
  verifyIapReceipt
} from "../api/subscription";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import ScreenContainer from "../components/ScreenContainer";
import { PRO_PLAN_PRICE_DISPLAY } from "../constants/pricing";
import { colors, spacing } from "../theme/theme";
import { buySubscription, initIAP } from "../utils/iap";
import { openExternalUrl } from "../utils/openExternalUrl";

function isNativePurchasePlatform() {
  return Platform.OS === "ios" || Platform.OS === "android";
}

function isActiveSubscription(status) {
  return status?.subscriptionStatus === "active" || status?.status === "active";
}

export default function SubscribeScreen({ navigation }) {
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
    if (isNativePurchasePlatform()) initIAP();
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

  async function verifyNativePurchase() {
    const purchase = await buySubscription();
    await verifyIapReceipt({
      receipt: purchase.transactionReceipt,
      platform: Platform.OS,
      productId: purchase.productId,
      transactionId: purchase.transactionId
    });
    Alert.alert(
      "Verification submitted",
      "Access unlocks after the backend confirms subscription status.",
      [{ text: "Check Status", onPress: goToStatus }]
    );
  }

  async function handleUpgrade() {
    try {
      setLoading(true);
      if (isNativePurchasePlatform()) {
        await verifyNativePurchase();
      } else {
        await openStripeCheckout();
      }
    } catch (err) {
      Alert.alert("Error", err?.message || "Unable to start payment.");
    } finally {
      setLoading(false);
    }
  }

  if (!status) return null;

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

        <Text style={styles.price}>{PRO_PLAN_PRICE_DISPLAY}</Text>

        {isActiveSubscription(status) ? (
          <Text style={styles.active}>Subscription confirmed by backend</Text>
        ) : (
          <>
            <PrimaryButton
              title={loading ? "Processing..." : "Unlock Premium"}
              onPress={handleUpgrade}
              disabled={loading}
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
