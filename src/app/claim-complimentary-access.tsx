import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  claimComplimentaryGrant,
  previewComplimentaryGrant,
  type ComplimentaryClaimSummary
} from "@/api/complimentaryGrants";
import { ApiError } from "@/api/apiRequest";
import { useAuth } from "@/auth/AuthContext";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import {
  clearComplimentaryClaimToken,
  COMPLIMENTARY_CLAIM_PATH,
  browserComplimentaryClaimToken,
  normalizeComplimentaryClaimToken,
  readComplimentaryClaimToken,
  scrubComplimentaryClaimTokenFromUrl,
  writeComplimentaryClaimToken
} from "@/utils/complimentaryClaimTokenStore";

const TERMINAL_CODES = new Set([
  "COMPLIMENTARY_CLAIM_INVALID",
  "COMPLIMENTARY_ALREADY_CLAIMED"
]);

type State =
  | "loading"
  | "ready"
  | "claiming"
  | "claimed"
  | "blocked"
  | "error"
  | "terminal";

export default function ClaimComplimentaryAccessScreen() {
  const router = useRouter();
  const auth = useAuth();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const queryToken = useMemo(
    () => normalizeComplimentaryClaimToken(params.token),
    [params.token]
  );
  const [token, setToken] = useState("");
  const [tokenReady, setTokenReady] = useState(false);
  const [summary, setSummary] = useState<ComplimentaryClaimSummary | null>(null);
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function capture() {
      const fragmentToken = browserComplimentaryClaimToken();
      const incoming = fragmentToken || queryToken;
      if (incoming) await writeComplimentaryClaimToken(incoming);
      scrubComplimentaryClaimTokenFromUrl();
      const resolved = incoming || (await readComplimentaryClaimToken());
      if (mounted) {
        setToken(resolved);
        setTokenReady(true);
      }
    }
    void capture();
    return () => {
      mounted = false;
    };
  }, [queryToken]);

  useEffect(() => {
    if (!tokenReady) return;
    if (!token) {
      setState("terminal");
      setMessage("This complimentary access link is missing its secure claim token.");
      return;
    }
    let mounted = true;
    setState("loading");
    setMessage("");
    async function load() {
      try {
        const result = await previewComplimentaryGrant(token);
        if (!mounted) return;
        setSummary(result);
        setState("ready");
      } catch (error) {
        const code = error instanceof ApiError ? error.code : "";
        if (TERMINAL_CODES.has(code)) await clearComplimentaryClaimToken();
        if (!mounted) return;
        setState(TERMINAL_CODES.has(code) ? "terminal" : "error");
        setMessage(
          error instanceof Error
            ? error.message
            : "This complimentary access link could not be checked."
        );
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [retry, token, tokenReady]);

  async function claim() {
    if (!token || state === "claiming") return;
    setState("claiming");
    setMessage("");
    try {
      const result = await claimComplimentaryGrant(token);
      await clearComplimentaryClaimToken();
      setState("claimed");
      setMessage(
        `Your complimentary ${String(result?.plan || summary?.plan || "GrowPathAI")} access is active and will not renew.`
      );
      try {
        await auth.retryMe();
      } catch {
        setMessage(
          "Complimentary access was claimed. Refresh the account if the new plan is not visible yet."
        );
      }
    } catch (error) {
      const code = error instanceof ApiError ? error.code : "";
      if (TERMINAL_CODES.has(code)) {
        await clearComplimentaryClaimToken();
        setState("terminal");
      } else if (
        [
          "ACTIVE_SUBSCRIPTION_EXISTS",
          "BILLING_RECONCILIATION_REQUIRED",
          "BILLING_AUTHORITY_UNRESOLVED",
          "GIFT_SUBSCRIPTION_CONFLICT",
          "SUBSCRIPTION_CHECKOUT_IN_PROGRESS",
          "TEST_ACCOUNT_PLAN_LOCKED",
          "PROTECTED_PLATFORM_IDENTITY"
        ].includes(code)
      ) {
        setState("blocked");
      } else {
        setState("ready");
      }
      setMessage(
        error instanceof Error
          ? error.message
          : "Complimentary access could not be claimed."
      );
    }
  }

  async function switchAccount() {
    await auth.logout();
    router.replace({
      pathname: "/login",
      params: { next: COMPLIMENTARY_CLAIM_PATH }
    } as any);
  }

  if (!tokenReady && state === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text accessibilityRole="header" aria-level={1} style={styles.title}>
          Complimentary GrowPathAI access
        </Text>
        <Text style={styles.copy}>
          This is Admin-issued access. No payment was made, no card is required, and it
          will not renew automatically.
        </Text>

        {state === "loading" || state === "claiming" ? (
          <ActivityIndicator color={palette.accent} />
        ) : null}

        {summary ? (
          <View style={styles.details}>
            <Text style={styles.plan}>
              {summary.duration === "year" ? "One year" : "One month"} of {summary.plan}
            </Text>
            <Text style={styles.copy}>Recipient: {summary.recipientEmail}</Text>
            {summary.message ? <Text style={styles.note}>{summary.message}</Text> : null}
            <Text style={styles.helper}>
              Access starts only when the matching verified account claims it.
            </Text>
          </View>
        ) : null}

        {message ? (
          <Text
            accessibilityRole={state === "claimed" ? undefined : "alert"}
            style={[styles.feedback, state === "claimed" ? styles.success : styles.error]}
          >
            {message}
          </Text>
        ) : null}

        {summary && state === "ready" && !auth.token ? (
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              style={styles.primary}
              onPress={() =>
                router.push({
                  pathname: "/login",
                  params: { next: COMPLIMENTARY_CLAIM_PATH }
                } as any)
              }
            >
              <Text style={styles.primaryText}>Sign in to claim</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={styles.secondary}
              onPress={() =>
                router.push({
                  pathname: "/register",
                  params: { next: COMPLIMENTARY_CLAIM_PATH }
                } as any)
              }
            >
              <Text style={styles.secondaryText}>Create account</Text>
            </Pressable>
          </View>
        ) : null}

        {summary && auth.token && ["ready", "claiming"].includes(state) ? (
          <Pressable
            accessibilityRole="button"
            disabled={state === "claiming"}
            style={[styles.primary, state === "claiming" && styles.disabled]}
            onPress={() => void claim()}
          >
            <Text style={styles.primaryText}>Activate complimentary access</Text>
          </Pressable>
        ) : null}

        {auth.token && state === "blocked" ? (
          <Pressable
            accessibilityRole="button"
            style={styles.secondary}
            onPress={() => void switchAccount()}
          >
            <Text style={styles.secondaryText}>Use a different account</Text>
          </Pressable>
        ) : null}

        {state === "error" ? (
          <Pressable
            accessibilityRole="button"
            style={styles.secondary}
            onPress={() => setRetry((value) => value + 1)}
          >
            <Text style={styles.secondaryText}>Try again</Text>
          </Pressable>
        ) : null}

        {state === "claimed" ? (
          <Pressable
            accessibilityRole="button"
            style={styles.primary}
            onPress={() => router.replace("/account/billing" as any)}
          >
            <Text style={styles.primaryText}>View access details</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    page: {
      alignItems: "center",
      backgroundColor: palette.page,
      flexGrow: 1,
      padding: 24
    },
    center: {
      alignItems: "center",
      backgroundColor: palette.page,
      flex: 1,
      justifyContent: "center",
      padding: 24
    },
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 16,
      maxWidth: 620,
      padding: 24,
      width: "100%"
    },
    title: { color: palette.text, fontSize: 28, fontWeight: "900" },
    plan: { color: palette.text, fontSize: 20, fontWeight: "800" },
    copy: { color: palette.text, fontSize: 15, lineHeight: 22 },
    helper: { color: palette.textMuted, fontSize: 13, lineHeight: 19 },
    note: {
      backgroundColor: palette.surfaceMuted,
      borderRadius: radius.card,
      color: palette.text,
      padding: 12
    },
    details: { gap: 10 },
    feedback: { borderRadius: radius.card, padding: 12 },
    error: { color: palette.danger, fontWeight: "700" },
    success: { color: palette.success, fontWeight: "700" },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    primary: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 16,
      paddingVertical: 12
    },
    primaryText: { color: palette.accentText, fontWeight: "900" },
    secondary: {
      alignItems: "center",
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 16,
      paddingVertical: 12
    },
    secondaryText: { color: palette.text, fontWeight: "800" },
    disabled: { opacity: 0.55 }
  });
}
