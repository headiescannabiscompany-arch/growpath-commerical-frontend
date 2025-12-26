import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { startSubscription } from "../api/subscribe";
import ScreenContainer from "../components/ScreenContainer";

import { createCheckoutSession } from "../api/subscription";

export default function PaywallScreen({ navigation }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleStartTrial = async () => {
    setLoading(true);
    try {
      const result = await startSubscription("trial", token);
      if (result.success) {
        Alert.alert("Success", "7-day free trial started!", [
          { text: "OK", onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert("Error", result.message || "Failed to start trial");
      }
    } catch (error) {
      Alert.alert("Error", error?.data?.message || error?.message || "Failed to start trial");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const result = await createCheckoutSession();
      if (result.url) {
        // Open the Stripe Checkout page in the system browser
        Linking.openURL(result.url);
      } else {
        Alert.alert("Error", "Could not create checkout session");
      }
    } catch (error) {
      Alert.alert("Error", error?.data?.message || error?.message || "Failed to subscribe");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🚀 Upgrade to PRO</Text>

        <View style={styles.benefitsSection}>
          <Text style={styles.subtitle}>Unlock Premium Features:</Text>
          <Text style={styles.benefit}>✅ Unlimited Plants & Grows</Text>
          <Text style={styles.benefit}>✅ Social Feed (Post, Like, Comment)</Text>
          <Text style={styles.benefit}>✅ Task Management & Reminders</Text>
          <Text style={styles.benefit}>✅ AI Plant Diagnosis</Text>
          <Text style={styles.benefit}>✅ AI Feeding Assistant</Text>
          <Text style={styles.benefit}>✅ Environment Optimizer</Text>
          <Text style={styles.benefit}>✅ Grow Templates & Marketplace</Text>
          <Text style={styles.benefit}>✅ Advanced Training Guides</Text>
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

const styles = StyleSheet.create({
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
});
