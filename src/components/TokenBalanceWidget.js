import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

import { getTokenBalance } from "../api/tokens";
import { useAuth } from "../auth/AuthContext";
import { radius } from "../theme/theme";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * @param {{ onPress?: () => void, interactive?: boolean }} props
 */
export default function TokenBalanceWidget({ onPress = undefined, interactive = true }) {
  const router = useRouter();
  const auth = useAuth();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const accountStateKey = [
    auth?.token || "",
    auth?.user?.plan || "",
    auth?.user?.subscriptionStatus || "",
    auth?.ctx?.plan || "",
    auth?.ctx?.subscriptionStatus || ""
  ].join("|");

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setLoadFailed(false);
      try {
        const res = await getTokenBalance(undefined, { timeoutMs: 8000 });
        if (alive) setBalance(res?.data ?? res);
      } catch (err) {
        console.error("Failed to load token balance:", err);
        if (alive) setLoadFailed(true);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [accountStateKey]);

  const { aiTokens, maxTokens, percentage, isLow, missingMax } = useMemo(() => {
    const rawMax = Number(balance?.maxTokens);
    const hasValidMax = Number.isFinite(rawMax) && rawMax > 0;
    const resolvedMax = hasValidMax ? rawMax : null;

    const rawCurrent = Number(balance?.aiTokens);
    const resolvedCurrent =
      Number.isFinite(rawCurrent) && rawCurrent >= 0 ? rawCurrent : 0;

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

  const refillCopy = loadFailed
    ? "Live balance is unavailable. No estimated balance is being shown."
    : balance?.refillDescription || "Your configured allowance refreshes weekly.";
  const usageCopy =
    "Use tokens for Ask AI, Plant Diagnose, recipe review, and environment analysis.";

  const Container = interactive ? TouchableOpacity : View;

  return (
    <Container
      style={[styles.container, isLow && styles.containerLow]}
      {...(interactive
        ? { onPress: onPress || (() => router.push("/ai/how-it-works")) }
        : {})}
    >
      <View style={styles.headerRow}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>AI</Text>
        </View>
        <View style={styles.headerContent}>
          <Text style={styles.label}>AI Tokens</Text>
          <Text style={styles.balance}>
            {aiTokens} / {maxTokens ?? "-"}
          </Text>
        </View>
        <View style={styles.barContainer}>
          <View
            style={[styles.bar, { width: `${percentage}%` }, isLow && styles.barLow]}
          />
        </View>
      </View>

      <View style={styles.details}>
        <Text style={styles.description}>{usageCopy}</Text>
        {loading ? (
          <Text style={styles.description}>Checking live token balance...</Text>
        ) : null}
        <Text style={styles.description}>{refillCopy}</Text>
      </View>

      {interactive ? (
        <View style={styles.ctaRow}>
          <Text style={styles.ctaText}>See how tokens work</Text>
        </View>
      ) : null}
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f8f9fa",
    borderRadius: radius.card,
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
    borderRadius: radius.pill,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12
  },
  icon: {
    color: "#166534",
    fontSize: 14,
    fontWeight: "900"
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
    borderRadius: radius.pill,
    overflow: "hidden",
    marginLeft: 12
  },
  bar: {
    height: "100%",
    backgroundColor: "#27ae60",
    borderRadius: radius.pill
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
