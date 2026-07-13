import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { getTokenBalance } from "../api/tokens";
import { useEntitlements } from "../entitlements";
import { radius } from "../theme/theme";
import { localPaidPreviewPlan } from "../utils/localPaidPreview";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function fallbackBalanceForPlan(plan) {
  const normalized = String(plan || "free").toLowerCase();
  if (normalized === "commercial" || normalized === "facility") {
    return {
      aiTokens: 1000,
      maxTokens: 1000,
      refillDescription:
        "Commercial and facility token limits reset from account billing.",
      estimated: true
    };
  }
  if (normalized === "pro" || normalized === "personal" || normalized === "premium") {
    return {
      aiTokens: 100,
      maxTokens: 100,
      refillDescription: "Pro token limits reset from account billing.",
      estimated: true
    };
  }
  return {
    aiTokens: 10,
    maxTokens: 10,
    refillDescription:
      "Free accounts get limited AI tokens for Ask AI and Plant Diagnose.",
    estimated: true
  };
}

export default function TokenBalanceWidget({ onPress = undefined }) {
  const navigation = useNavigation();
  const entitlements = useEntitlements();
  const displayPlan = localPaidPreviewPlan(entitlements.plan);
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const res = await getTokenBalance();
        if (alive) setBalance(res?.data ?? res);
      } catch (err) {
        console.error("Failed to load token balance:", err);
        if (alive) setBalance(fallbackBalanceForPlan(displayPlan));
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [displayPlan]);

  const effectiveBalance = useMemo(() => {
    const planFallback = fallbackBalanceForPlan(displayPlan);
    const rawMax = Number(balance?.maxTokens);
    if (
      !balance ||
      !Number.isFinite(rawMax) ||
      rawMax <= 0 ||
      rawMax < planFallback.maxTokens
    ) {
      return planFallback;
    }
    return balance;
  }, [balance, displayPlan]);

  const { aiTokens, maxTokens, percentage, isLow, missingMax } = useMemo(() => {
    const rawMax = Number(effectiveBalance?.maxTokens);
    const hasValidMax = Number.isFinite(rawMax) && rawMax > 0;
    const resolvedMax = hasValidMax ? rawMax : null;

    const rawCurrent = Number(effectiveBalance?.aiTokens);
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
  }, [effectiveBalance]);

  useEffect(() => {
    if (balance && missingMax) {
      console.error("Token balance missing maxTokens value", balance);
    }
  }, [balance, missingMax]);

  const refillCopy = effectiveBalance?.estimated
    ? `${effectiveBalance.refillDescription} Live balance is not available yet.`
    : effectiveBalance?.refillDescription ||
      "Token refills are managed by your account limits.";
  const usageCopy =
    "Use tokens for Ask AI, Plant Diagnose, recipe review, and environment analysis.";

  if (loading) return null;

  return (
    <TouchableOpacity
      style={[styles.container, isLow && styles.containerLow]}
      onPress={onPress || (() => navigation.navigate("TokenInfo"))}
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
        <Text style={styles.description}>{refillCopy}</Text>
      </View>

      <View style={styles.ctaRow}>
        <Text style={styles.ctaText}>See how tokens work</Text>
      </View>
    </TouchableOpacity>
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
