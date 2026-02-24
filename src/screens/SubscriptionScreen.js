import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Platform,
  ActivityIndicator
} from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { colors, spacing } from "../theme/theme";
import { createCheckoutSession } from "../api/subscription";

export default function SubscriptionScreen({ navigation }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: "Upgrade to Pro",
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 10 }}>
          <Text style={{ color: "#fff", fontSize: 16 }}>✕ Close</Text>
        </TouchableOpacity>
      )
    });
  }, [navigation]);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const data = await createCheckoutSession();

      if (data.url) {
        // Open Stripe Checkout in browser
        const supported = await Linking.canOpenURL(data.url);
        if (supported) {
          await Linking.openURL(data.url);

          Alert.alert(
            "Payment Window Opened",
            "Complete your payment in the browser. The app will update when payment is complete.",
            [{ text: "OK", onPress: () => navigation.goBack() }]
          );
        } else {
          Alert.alert("Error", "Unable to open payment page. Please try again.");
        }
      } else {
        Alert.alert(
          "Payment System Error",
          "The payment system is not configured yet. Please contact support or try the test upgrade button below."
        );
      }
    } catch (err) {
      console.error("Checkout error:", err);
      Alert.alert(
        "Connection Error",
        "Cannot connect to payment service. This may be because:\n\n" +
          "1. Stripe keys are not configured\n" +
          "2. Backend server is not running\n" +
          "3. No internet connection\n\n" +
          "Error: " +
          (err.message || "Unknown error")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.badge}>✨ PREMIUM</Text>
          <Text style={styles.title}>Upgrade to Pro</Text>
          <Text style={styles.subtitle}>
            Unlock all features and grow like a professional
          </Text>
        </View>

        {/* Pricing Card */}
        <View style={styles.pricingCard}>
          <View style={styles.priceRow}>
            <Text style={styles.currency}>$</Text>
            <Text style={styles.price}>10</Text>
            <Text style={styles.period}>/month</Text>
          </View>
          <Text style={styles.billingNote}>Cancel anytime • No commitment</Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <Feature
            icon="🌱"
            title="Unlimited Plants"
            description="Track as many grows as you need"
          />
          <Feature
            icon="🤖"
            title="AI Diagnostics"
            description="Get instant help from our AI assistant"
          />
          <Feature
            icon="💬"
            title="Community Access"
            description="Post, comment, and connect with growers"
          />
          <Feature
            icon="📊"
            title="Advanced Analytics"
            description="Track growth patterns and yields"
          />
          <Feature
            icon="🎓"
            title="Creator Tools"
            description="Create and sell your own courses"
          />
          <Feature
            icon="⚡"
            title="Priority Support"
            description="Get help faster when you need it"
          />
          <Feature
            icon="🔓"
            title="Unlock Everything"
            description="All pro features included"
          />
        </View>

        {/* Subscribe Button */}
        <TouchableOpacity
          style={[styles.subscribeBtn, loading && styles.subscribeBtnDisabled]}
          onPress={handleSubscribe}
          disabled={loading}
        >
          <Text style={styles.subscribeBtnText}>
            {loading ? "Processing..." : "Subscribe Now"}
          </Text>
        </TouchableOpacity>

        {/* View Plans & Pricing Button */}
        <TouchableOpacity
          style={[styles.subscribeBtn, { backgroundColor: "#10B981" }]}
          onPress={() => navigation.navigate("PricingMatrix")}
        >
          <Text style={styles.subscribeBtnText}>View Plans & Pricing</Text>
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.footer}>
          By subscribing, you agree to our Terms of Service and Privacy Policy. Your
          subscription will auto-renew monthly unless canceled.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

function Feature({ icon, title, description }) {
  return (
    <View style={styles.feature}>
      <View style={styles.featureIcon}>
        <Text style={styles.featureIconText}>{icon}</Text>
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
      <Text style={styles.featureCheck}>✓</Text>
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
  priceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8
  },
  currency: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginTop: 8
  },
  price: {
    fontSize: 56,
    fontWeight: "800",
    color: "#111827"
  },
  period: {
    fontSize: 20,
    color: "#6B7280",
    marginTop: 28
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing(3)
  },
  featureIconText: {
    fontSize: 20
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
    fontSize: 20,
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
  testBtn: {
    backgroundColor: "#6B7280",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: spacing(4),
    borderWidth: 1,
    borderColor: "#9CA3AF"
  },
  testBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600"
  },
  footer: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18
  }
};
