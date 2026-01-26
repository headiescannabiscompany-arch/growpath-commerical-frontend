import React, { useEffect, useState, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getTokenBalance } from "../api/tokens";
import { useAuth } from "@/auth/AuthContext";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

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

  const { aiTokens, maxTokens, percentage, isLow, missingMax } = useMemo(() => {
    const rawMax = Number(balance?.maxTokens);
    const hasValidMax = Number.isFinite(rawMax) && rawMax > 0;
    const resolvedMax = hasValidMax ? rawMax : null;

    const rawCurrent = Number(balance?.aiTokens);
    const resolvedCurrent = Number.isFinite(rawCurrent) && rawCurrent >= 0 ? rawCurrent : 0;

    const pct =
      resolvedMax && resolvedMax > 0
        ? clamp((resolvedCurrent / resolvedMax) * 100, 0, 100)
        : 0;

    return {
      aiTokens: resolvedCurrent,
      maxTokens: resolvedMax,
      percentage: pct,
      isLow: resolvedMax ? pct < 30 : false,
      missingMax: !hasValidMax
    };
  }, [balance]);

  useEffect(() => {
    if (balance && missingMax) {
      console.error("Token balance missing maxTokens value", balance);
    }
  }, [balance, missingMax]);

  const refillCopy = isPro
    ? "Pro members receive 100 AI tokens every day."
    : "Free accounts receive 10 AI tokens each week.";
  const usageCopy =
    "Use tokens for Diagnose (1–2), Training Coach (1), and Environment Assistant (1).";

  if (loading || balance === null) return null;

  return (
    <TouchableOpacity
      style={[styles.container, isLow && styles.containerLow]}
      onPress={onPress || (() => navigation.navigate("TokenInfo"))}
    >
      <View style={styles.headerRow}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🤖</Text>
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.label}>AI Tokens</Text>
          <Text style={styles.balance}>
            {aiTokens} / {maxTokens ?? "—"}
          </Text>
        </View>
        <View style={styles.barContainer}>
          <View
            style={[
              styles.bar,
              { width: `${percentage}%` },
              isLow && styles.barLow
            ]}
          />
        </View>
      </View>

      <View style={styles.details}>
        <Text style={styles.description}>{usageCopy}</Text>
        <Text style={styles.description}>{refillCopy}</Text>
      </View>

      <View style={styles.ctaRow}>
        <Text style={styles.ctaText}>See how tokens work →</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: "#27ae60"
  },
  containerLow: {
    borderColor: "#e74c3c",
    backgroundColor: "#fff5f5"
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12
  },
  icon: {
    fontSize: 20
  },
  headerContent: {
    flex: 1
  },
  label: {
    fontSize: 14,
    color: "#4b5563",
    marginBottom: 2
  },
  balance: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937"
  },
  barContainer: {
    width: 96,
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
  },
  details: {
    marginBottom: 12
  },
  description: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20
  },
  ctaRow: {
    flexDirection: "row",
    justifyContent: "flex-end"
  },
  ctaText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#047857"
  }
});
