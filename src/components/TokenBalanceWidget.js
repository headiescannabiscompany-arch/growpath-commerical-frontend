import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

import { getTokenBalance } from "../api/tokens";
import { useAuth } from "../auth/AuthContext";
import { radius } from "../theme/theme";
import { useAppTheme } from "../theme/appTheme";
import { subscribeToTokenBalanceChange } from "../utils/tokenBalanceEvents";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * @param {{
 *   onPress?: () => void,
 *   interactive?: boolean,
 *   workspaceType?: "personal" | "commercial" | "facility",
 *   facilityId?: string,
 *   workspaceName?: string
 * }} props
 */
export default function TokenBalanceWidget({
  onPress = undefined,
  interactive = true,
  workspaceType = "personal",
  facilityId = "",
  workspaceName = ""
}) {
  const router = useRouter();
  const auth = useAuth();
  const { palette } = useAppTheme();
  const normalizedWorkspaceType = String(workspaceType || "personal").toLowerCase();
  const facilityScoped = workspaceType === "facility";
  const commercialScoped = normalizedWorkspaceType === "commercial";
  const normalizedFacilityId = String(facilityId || "").trim();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [allowanceMismatch, setAllowanceMismatch] = useState(false);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const stalePaidRetryTokenRef = useRef("");
  const accountStateKey = [
    auth?.token || "",
    auth?.user?.plan || "",
    auth?.user?.subscriptionStatus || "",
    auth?.ctx?.plan || "",
    auth?.ctx?.subscriptionStatus || ""
  ].join("|");
  const scopeStateKey = [
    workspaceType,
    normalizedFacilityId,
    workspaceName,
    auth?.ctx?.facilityPlan || "",
    auth?.ctx?.facilitySubscriptionStatus || ""
  ].join("|");
  const authToken = String(auth?.token || "");
  const stalePaidRetryKey = `${authToken}|${scopeStateKey}`;
  const retryMe = auth?.retryMe;
  const subscriptionStatus = String(
    facilityScoped
      ? auth?.ctx?.facilitySubscriptionStatus || ""
      : auth?.user?.subscriptionStatus || auth?.ctx?.subscriptionStatus || ""
  ).toLowerCase();
  const requestedPlan = String(
    facilityScoped
      ? auth?.ctx?.facilityPlan || "facility"
      : auth?.ctx?.requestedPlan || auth?.ctx?.plan || auth?.user?.plan || "free"
  ).toLowerCase();
  const hasPaidAccess =
    ["active", "trial", "trialing"].includes(subscriptionStatus) &&
    requestedPlan !== "free";

  useEffect(
    () =>
      subscribeToTokenBalanceChange(() => {
        setRefreshVersion((version) => version + 1);
      }),
    []
  );

  useEffect(() => {
    let alive = true;

    async function load() {
      if (facilityScoped && !normalizedFacilityId) {
        setBalance(null);
        setLoadFailed(false);
        setAllowanceMismatch(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      setLoadFailed(false);
      setAllowanceMismatch(false);
      setBalance(null);
      try {
        const requestOptions = {
          timeoutMs: 8000,
          ...(facilityScoped
            ? {
                params: {
                  workspaceType: "facility",
                  facilityId: normalizedFacilityId
                }
              }
            : commercialScoped
              ? {
                  params: {
                    workspaceType: "commercial"
                  }
                }
              : {})
        };
        let res = await getTokenBalance(undefined, requestOptions);
        let nextBalance = res?.data ?? res;
        const hasStaleFreeAllowance =
          hasPaidAccess && Number(nextBalance?.maxTokens) <= 5;

        if (
          hasStaleFreeAllowance &&
          stalePaidRetryTokenRef.current !== stalePaidRetryKey
        ) {
          stalePaidRetryTokenRef.current = stalePaidRetryKey;
          await retryMe?.();
          res = await getTokenBalance(undefined, requestOptions);
          nextBalance = res?.data ?? res;
        }

        if (alive) {
          setBalance(nextBalance);
          setAllowanceMismatch(hasPaidAccess && Number(nextBalance?.maxTokens) <= 5);
        }
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
  }, [
    accountStateKey,
    authToken,
    facilityScoped,
    hasPaidAccess,
    normalizedFacilityId,
    refreshVersion,
    retryMe,
    scopeStateKey,
    stalePaidRetryKey,
    commercialScoped
  ]);

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
    : facilityScoped && !normalizedFacilityId
      ? "Select a Facility to view and use its AI-credit balance."
      : balance?.refillDescription || "Your configured allowance refreshes weekly.";
  const usageCopy =
    "AI credits pay for real model work. Rule-based calculators and fallbacks are free; Plant Diagnose uses 3 credits and provider-backed text help uses 1.";
  const verifiedPlanCopy = balance?.plan
    ? `${facilityScoped ? "Facility" : commercialScoped ? "Commercial" : "Server"} plan: ${String(balance.plan).toUpperCase()} (${balance.subscriptionStatus || "unknown status"}); ${maxTokens ?? "-"} weekly credits from ${balance.allowanceSource || "plan"}.`
    : null;
  const weeklyUsageCopy = balance?.usage
    ? `Used this week: ${Number(balance.usage.creditsUsed || 0)} credits across ${Number(balance.usage.billedRequests || 0)} billed requests; ${Number(balance.usage.creditsRefunded || 0)} credits refunded.`
    : null;

  const Container = interactive ? TouchableOpacity : View;
  const detailsHref = facilityScoped
    ? normalizedFacilityId
      ? `/ai/how-it-works?workspaceType=facility&facilityId=${encodeURIComponent(normalizedFacilityId)}`
      : "/ai/how-it-works?workspaceType=facility"
    : commercialScoped
      ? "/ai/how-it-works?workspaceType=commercial"
      : "/ai/how-it-works";

  return (
    <Container
      style={[
        styles.container,
        {
          backgroundColor: palette.surface,
          borderColor: isLow ? palette.danger : palette.border
        },
        isLow && styles.containerLow
      ]}
      {...(interactive ? { onPress: onPress || (() => router.push(detailsHref)) } : {})}
    >
      <View style={styles.headerRow}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: palette.surfaceMuted,
              borderColor: palette.border
            }
          ]}
        >
          <Text style={[styles.icon, { color: palette.accent }]}>AI</Text>
        </View>
        <View style={styles.headerContent}>
          <Text style={[styles.label, { color: palette.textMuted }]}>
            {facilityScoped
              ? "Facility AI Credits"
              : commercialScoped
                ? "Commercial AI Credits"
                : "AI Credits"}
          </Text>
          <Text style={[styles.balance, { color: palette.text }]}>
            {aiTokens} / {maxTokens ?? "-"}
          </Text>
        </View>
        <View style={[styles.barContainer, { backgroundColor: palette.border }]}>
          <View
            style={[
              styles.bar,
              { width: `${percentage}%`, backgroundColor: palette.accent },
              isLow && styles.barLow
            ]}
          />
        </View>
      </View>

      <View style={styles.details}>
        <Text style={[styles.description, { color: palette.textMuted }]}>{usageCopy}</Text>
        {verifiedPlanCopy ? (
          <Text style={[styles.description, { color: palette.textMuted }]}>
            {verifiedPlanCopy}
          </Text>
        ) : null}
        {facilityScoped && workspaceName ? (
          <Text style={[styles.description, { color: palette.textMuted }]}>
            Balance owner: {workspaceName}.
          </Text>
        ) : null}
        {weeklyUsageCopy ? (
          <Text style={[styles.description, { color: palette.textMuted }]}>
            {weeklyUsageCopy}
          </Text>
        ) : null}
        {loading ? (
          <Text style={[styles.description, { color: palette.textMuted }]}>
            Checking live AI-credit balance...
          </Text>
        ) : null}
        <Text style={[styles.description, { color: palette.textMuted }]}>{refillCopy}</Text>
        {allowanceMismatch ? (
          <Text style={[styles.syncWarning, { color: palette.warning }]}>
            {facilityScoped ? "The Facility" : "Your paid or trial plan"} is active, but
            the server is still reporting the free 5-credit allowance. Refresh plan status
            before using AI credits.
          </Text>
        ) : null}
        {balance?.usage && !balance.usage.reconciled ? (
          <Text style={[styles.syncWarning, { color: palette.warning }]}>
            Balance and usage ledger differ by {balance.usage.ledgerDifference} credits.
            Report this account for reconciliation before using more AI credits.
          </Text>
        ) : null}
      </View>

      {interactive ? (
        <View style={styles.ctaRow}>
          <Text style={[styles.ctaText, { color: palette.link }]}>See how AI credits work</Text>
        </View>
      ) : null}
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.card,
    padding: 16,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: "#27ae60"
  },
  containerLow: {
    borderColor: "#e74c3c"
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
    borderWidth: 1,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12
  },
  icon: {
    fontSize: 14,
    fontWeight: "900"
  },
  headerContent: {
    flex: 1
  },
  label: {
    fontSize: 14,
    marginBottom: 2
  },
  balance: {
    fontSize: 20,
    fontWeight: "700",
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
  syncWarning: {
    color: "#991B1B",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
    marginTop: 8
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
