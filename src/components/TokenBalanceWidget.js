import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getTokenBalance } from "../api/tokens";
import { useAuth } from "../context/AuthContext";

export default function TokenBalanceWidget({ onPress }) {
  const { isPro } = useAuth();
  const navigation = useNavigation();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await getTokenBalance();
      setBalance(res?.data ?? res);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load token balance:", err);
      setLoading(false);
    }
  }

  function showTokenInfo() {
    const message = isPro
      ? `You have ${balance?.aiTokens || 0} AI tokens.\n\nPro users get 100 tokens daily.\n\n• AI Diagnose: 1-2 tokens\n• Training Advisor: 1 token\n• Environment Assistant: 1 token`
      : `You have ${balance?.aiTokens || 0} AI tokens.\n\nFree users get 10 tokens weekly.\n\n• AI Diagnose: 1-2 tokens\n• Training Advisor: 1 token\n• Environment Assistant: 1 token\n\nUpgrade to Pro for 100 daily tokens!`;

    Alert.alert("🤖 AI Tokens", message);
  }

  if (loading || !balance) return null;

  const percentage = (balance.aiTokens / balance.maxTokens) * 100;
  const isLow = percentage < 30;

  return (
    <TouchableOpacity
      style={[styles.container, isLow && styles.containerLow]}
      onPress={onPress || (() => navigation.navigate("TokenInfo"))}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>🤖</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>AI Tokens</Text>
        <Text style={styles.balance}>
          {balance.aiTokens} / {balance.maxTokens}
        </Text>
      </View>
      <View style={styles.barContainer}>
        <View style={[styles.bar, { width: `${percentage}%` }, isLow && styles.barLow]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: "#27ae60"
  },
  containerLow: {
    borderColor: "#e74c3c",
    backgroundColor: "#fee"
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12
  },
  icon: {
    fontSize: 20
  },
  content: {
    flex: 1
  },
  label: {
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 4
  },
  balance: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2c3e50"
  },
  barContainer: {
    width: 80,
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    overflow: "hidden",
    marginLeft: 12
  },
  bar: {
    height: "100%",
    backgroundColor: "#27ae60",
    borderRadius: 4
  },
  barLow: {
    backgroundColor: "#e74c3c"
  }
});
