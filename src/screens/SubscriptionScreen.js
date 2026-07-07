import React, { useEffect, useState } from "react";
import { Alert, Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { createCheckoutSession } from "../api/subscription";
import ScreenContainer from "../components/ScreenContainer";
import { PRO_PLAN_PRICE_DISPLAY, formatPlanBillingNote } from "../constants/pricing";
import { spacing } from "../theme/theme";
import { openExternalUrl } from "../utils/openExternalUrl";

export default function SubscriptionScreen({ navigation }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: "Upgrade to Pro",
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 10 }}>
          <Text style={{ color: "#fff", fontSize: 16 }}>Close</Text>
        </TouchableOpacity>
      )
    });
  }, [navigation]);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const data = await createCheckoutSession();
      const url = data?.url || data?.checkoutUrl || data?.data?.url;

      if (!url) {
        Alert.alert(
          "Payment System Error",
          "The payment system is not configured yet. Please contact support."
        );
        return;
      }

      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert("Error", "Unable to open payment page. Please try again.");
        return;
      }

      await openExternalUrl(url);
      Alert.alert(
        "Payment Window Opened",
        "Complete payment in the browser. Access unlocks only after backend confirmation.",
        [
          {
            text: "Check Status",
            onPress: () => navigation.navigate("SubscriptionStatus")
          }
        ]
      );
    } catch (err) {
      console.error("Checkout error:", err);
      Alert.alert(
        "Connection Error",
        "Cannot connect to payment service.\n\nError: " + (err.message || "Unknown error")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.badge}>PREMIUM</Text>
          <Text style={styles.title}>Upgrade to Pro</Text>
          <Text style={styles.subtitle}>
            Unlock all features and grow like a professional
          </Text>
        </View>

        <View style={styles.pricingCard}>
          <Text style={styles.priceDisplay}>{PRO_PLAN_PRICE_DISPLAY}</Text>
          <Text style={styles.billingNote}>{formatPlanBillingNote("pro", "yearly")}</Text>
          <Text style={styles.billingNote}>Cancel anytime. No commitment.</Text>
        </View>

        <View style={styles.features}>
          <Feature
            label="Plant"
            title="Unlimited Plants"
            description="Track as many grows as you need"
          />
          <Feature
            label="AI"
            title="AI Diagnostics"
            description="Get instant help from our AI assistant"
          />
          <Feature
            label="Chat"
            title="Community Access"
            description="Post, comment, and connect with growers"
          />
          <Feature
            label="Stats"
            title="Advanced Analytics"
            description="Track growth patterns and yields"
          />
          <Feature
            label="Learn"
            title="Creator Tools"
            description="Create and sell your own courses"
          />
          <Feature
            label="Fast"
            title="Priority Support"
            description="Get help faster when you need it"
          />
          <Feature
            label="All"
            title="Unlock Everything"
            description="All pro features included"
          />
        </View>

        <TouchableOpacity
          style={[styles.subscribeBtn, loading && styles.subscribeBtnDisabled]}
          onPress={handleSubscribe}
          disabled={loading}
        >
          <Text style={styles.subscribeBtnText}>
            {loading ? "Processing..." : "Subscribe Now"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subscribeBtn, { backgroundColor: "#10B981" }]}
          onPress={() => navigation.navigate("PricingMatrix")}
        >
          <Text style={styles.subscribeBtnText}>View Plans & Pricing</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          By subscribing, you agree to our Terms of Service and Privacy Policy. Your
          subscription will auto-renew monthly unless canceled. Features unlock only after
          backend confirmation.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

function Feature({ label, title, description }) {
  return (
    <View style={styles.feature}>
      <View style={styles.featureIcon}>
        <Text style={styles.featureIconText}>{label}</Text>
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
      <Text style={styles.featureCheck}>OK</Text>
    </View>
  );
}

const styles = {
  container: {
    flex: 1
  },
  content: {
    padding: spacing(4),
    paddingBottom: 100
  },
  header: {
    alignItems: "center",
    marginBottom: spacing(6)
  },
  badge: {
    backgroundColor: "#FEF3C7",
    color: "#92400E",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 16
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center"
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24
  },
  pricingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: spacing(6),
    marginBottom: spacing(6),
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#10B981"
  },
  priceDisplay: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center"
  },
  billingNote: {
    fontSize: 14,
    color: "#6B7280"
  },
  features: {
    marginBottom: spacing(6)
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
  },
  featureIcon: {
    minWidth: 48,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing(3),
    paddingHorizontal: 8
  },
  featureIconText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151"
  },
  featureContent: {
    flex: 1
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2
  },
  featureDescription: {
    fontSize: 14,
    color: "#6B7280"
  },
  featureCheck: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "700"
  },
  subscribeBtn: {
    backgroundColor: "#10B981",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: spacing(4)
  },
  subscribeBtnDisabled: {
    backgroundColor: "#9CA3AF"
  },
  subscribeBtnText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700"
  },
  footer: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18
  }
};
