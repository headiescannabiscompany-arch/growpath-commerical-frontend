import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Text,
  TouchableOpacity,
  View
} from "react-native";

import { useAuth } from "@/auth/AuthContext";
import { startSubscription } from "../api/subscribe";
import { createCheckoutSession } from "../api/subscription";
import PrimaryButton from "../components/PrimaryButton";
import ScreenContainer from "../components/ScreenContainer";

export default function PaywallScreen({ navigation }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  function goToStatus() {
    navigation.navigate("SubscriptionStatus");
  }

  const handleStartTrial = async () => {
    setLoading(true);
    try {
      await startSubscription("trial", token);
      Alert.alert(
        "Trial request submitted",
        "Access unlocks only after backend subscription status confirms the trial.",
        [{ text: "Check Status", onPress: goToStatus }]
      );
    } catch (error) {
      Alert.alert(
        "Error",
        error?.data?.message || error?.message || "Failed to start trial"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const result = await createCheckoutSession();
      const url = result?.url || result?.checkoutUrl || result?.data?.url;
      if (!url) {
        Alert.alert("Error", "Could not create checkout session.");
        return;
      }

      await Linking.openURL(url);
      Alert.alert(
        "Complete Payment",
        "After completing payment in your browser, return to the app and refresh subscription status. Access unlocks only after backend confirmation.",
        [{ text: "Go to Status", onPress: goToStatus }, { text: "OK" }]
      );
    } catch (error) {
      Alert.alert(
        "Error",
        error?.data?.message || error?.message || "Failed to subscribe"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Upgrade to PRO</Text>

        <View style={styles.benefitsSection}>
          <Text style={styles.subtitle}>Unlock Premium Features:</Text>
          <Text style={styles.benefit}>Unlimited Plants and Grows</Text>
          <Text style={styles.benefit}>Social Feed: post, like, and comment</Text>
          <Text style={styles.benefit}>Task Management and reminders</Text>
          <Text style={styles.benefit}>AI Plant Diagnosis</Text>
          <Text style={styles.benefit}>AI Feeding Assistant</Text>
          <Text style={styles.benefit}>Environment Optimizer</Text>
          <Text style={styles.benefit}>Grow Templates and Marketplace</Text>
          <Text style={styles.benefit}>Advanced Training Guides</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#28A745" style={styles.loader} />
        ) : (
          <>
            <TouchableOpacity
              style={[styles.button, styles.trialButton]}
              onPress={handleStartTrial}
            >
              <Text style={styles.buttonText}>Start 7-Day Free Trial</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.subscribeButton]}
              onPress={handleSubscribe}
            >
              <Text style={styles.buttonText}>Subscribe Now - $9.99/month</Text>
            </TouchableOpacity>

            <PrimaryButton
              title="View Plans & Pricing"
              onPress={() => navigation.navigate("PricingMatrix")}
              style={{ marginBottom: 10 }}
            />

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cancelText}>Maybe Later</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = {
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5"
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center"
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
    color: "#333"
  },
  benefitsSection: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
    elevation: 3
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
    color: "#333"
  },
  benefit: {
    fontSize: 16,
    color: "#555",
    marginBottom: 10,
    lineHeight: 24
  },
  button: {
    paddingVertical: 16,
    borderRadius: 10,
    marginBottom: 15,
    alignItems: "center"
  },
  trialButton: {
    backgroundColor: "#28A745"
  },
  subscribeButton: {
    backgroundColor: "#007BFF"
  },
  buttonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold"
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: "center"
  },
  cancelText: {
    color: "#888",
    fontSize: 16
  },
  loader: {
    marginTop: 30
  }
};
