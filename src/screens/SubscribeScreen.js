import React, { useState, useEffect } from "react";
import { Text, StyleSheet, Alert, Platform } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import { colors, spacing } from "../theme/theme";
import { initIAP, buySubscription } from "../utils/iap";

const API_URL = "http://192.168.1.42:4000";

export default function SubscribeScreen({ navigation }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    try {
      const res = await fetch(`${API_URL}/api/subscription/me`, {
        headers: {
          Authorization: `Bearer ${global.authToken}`,
          "Content-Type": "application/json"
        }
      });
      const s = await res.json();
      setStatus(s);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  }

  useEffect(() => {
    load();
    if (Platform.OS === "ios" || Platform.OS === "android") {
      initIAP();
    }
  }, []);

  async function handleUpgrade() {
    try {
      setLoading(true);

      if (Platform.OS === "ios" || Platform.OS === "android") {
        // Native IAP
        const purchase = await buySubscription();

        const res = await fetch(`${API_URL}/iap/verify`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${global.authToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            receipt: purchase.transactionReceipt,
            platform: Platform.OS
          })
        });

        const data = await res.json();
        if (data.ok) {
          Alert.alert("Success", "You are now Pro!");
          load();
        } else {
          Alert.alert("Error", data.error || "Verification failed");
        }
      }
    } catch (err) {
      Alert.alert("Error", err.message);
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

        <Text style={styles.item}>✔ Full AI Diagnose with Vision</Text>
        <Text style={styles.item}>✔ Unlimited plants & photo uploads</Text>
        <Text style={styles.item}>✔ Growers Guild access & community</Text>
        <Text style={styles.item}>✔ Create & sell courses (earn 85%)</Text>
        <Text style={styles.item}>✔ Advanced grow analytics</Text>

        <Text style={styles.note}>
          * Courses are sold separately by creators. Subscription unlocks platform
          features.
        </Text>

        <Text style={styles.price}>$9.99 / month</Text>

        {status.subscriptionStatus === "active" ? (
          <Text style={styles.active}>You are already a Pro user 🎉</Text>
        ) : (
          <PrimaryButton
            title={loading ? "Processing..." : "Unlock Premium"}
            onPress={handleUpgrade}
            disabled={loading}
          />
        )}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
});
