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

import { ApiError } from "@/api/apiRequest";
import { claimGift, getGiftClaim, type GiftClaimSummary } from "@/api/subscription";
import { useAuth } from "@/auth/AuthContext";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import {
  browserGiftClaimTokenFromFragment,
  buildClaimReturnPath,
  normalizeGiftClaimToken,
  scrubGiftClaimTokenFromBrowserUrl
} from "@/utils/claimReturnPath";
import {
  clearGiftClaimToken,
  readGiftClaimToken,
  writeGiftClaimToken
} from "@/utils/giftClaimTokenStore";

type ClaimState =
  | "loading"
  | "ready"
  | "claiming"
  | "claimed"
  | "preview-error"
  | "blocked"
  | "terminal";
type MessageTone = "info" | "success" | "error";

const TERMINAL_CLAIM_CODES = new Set(["GIFT_CLAIM_INVALID", "GIFT_ALREADY_CLAIMED"]);

export default function ClaimGiftScreen() {
  const router = useRouter();
  const auth = useAuth();
  const { palette } = useAppTheme();
  const styles = createClaimGiftStyles(palette);
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const queryToken = useMemo(() => normalizeGiftClaimToken(params.token), [params.token]);
  const [token, setToken] = useState("");
  const [tokenReady, setTokenReady] = useState(false);
  const returnPath = buildClaimReturnPath(token);
  const [state, setState] = useState<ClaimState>("loading");
  const [gift, setGift] = useState<GiftClaimSummary | null>(null);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<MessageTone>("info");
  const [accountMismatch, setAccountMismatch] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const [switchingAccount, setSwitchingAccount] = useState(false);

  useEffect(() => {
    let mounted = true;
    setTokenReady(false);
    setState("loading");
    setGift(null);
    setMessage("");
    setMessageTone("info");
    setAccountMismatch(false);
    setSwitchingAccount(false);

    async function captureToken() {
      const fragmentToken = browserGiftClaimTokenFromFragment();
      const incomingToken = fragmentToken || queryToken;
      if (incomingToken) await writeGiftClaimToken(incomingToken);
      scrubGiftClaimTokenFromBrowserUrl();
      const nextToken = incomingToken || (await readGiftClaimToken());
      if (!mounted) return;
      setToken(nextToken);
      setTokenReady(true);
    }

    void captureToken();

    return () => {
      mounted = false;
    };
  }, [queryToken]);

  useEffect(() => {
    if (!tokenReady) return;
    let mounted = true;
    setState("loading");
    setGift(null);
    setMessage("");
    setMessageTone("info");
    setAccountMismatch(false);

    if (!token) {
      setState("terminal");
      setMessage("This gift link is missing its claim token.");
      setMessageTone("error");
      return () => {
        mounted = false;
      };
    }

    async function loadGift() {
      try {
        const result = await getGiftClaim(token);
        if (!mounted) return;
        if (!result) throw new Error("This gift link did not return gift details.");
        setGift(result);
        setState("ready");
      } catch (error: unknown) {
        const terminal =
          error instanceof ApiError && TERMINAL_CLAIM_CODES.has(error.code);
        if (terminal) await clearGiftClaimToken();
        if (!mounted) return;
        setGift(null);
        setState(terminal ? "terminal" : "preview-error");
        setMessage(
          error instanceof Error ? error.message : "This gift link is invalid or expired."
        );
        setMessageTone("error");
      }
    }

    void loadGift();

    return () => {
      mounted = false;
    };
  }, [retryNonce, token, tokenReady]);

  async function acceptGift() {
    if (!token || state === "claiming") return;
    setState("claiming");
    setMessage("");
    setMessageTone("info");
    setAccountMismatch(false);

    try {
      const result = await claimGift(token);
      const planName = String(result?.plan || gift?.plan || "GrowPathAI");
      await clearGiftClaimToken();
      setState("claimed");
      setMessage(`Your prepaid ${planName} access is active.`);
      setMessageTone("success");

      try {
        await auth.retryMe();
      } catch {
        setMessage(
          `Your prepaid ${planName} access was claimed, but account details could not refresh yet.`
        );
        setMessageTone("info");
      }
    } catch (error: unknown) {
      const code = error instanceof ApiError ? error.code : "";
      if (code === "GIFT_RECIPIENT_EMAIL_MISMATCH" || code === "UNAUTHENTICATED") {
        setState("ready");
        setAccountMismatch(true);
      } else if (TERMINAL_CLAIM_CODES.has(code)) {
        await clearGiftClaimToken();
        setState("terminal");
        setGift(null);
      } else if (
        code === "ACTIVE_SUBSCRIPTION_EXISTS" ||
        code === "TEST_ACCOUNT_PLAN_LOCKED"
      ) {
        setState("blocked");
      } else {
        setState("ready");
      }
      setMessage(error instanceof Error ? error.message : "Unable to claim this gift.");
      setMessageTone("error");
    }
  }

  async function useAnotherAccount() {
    if (!returnPath || switchingAccount) return;
    setSwitchingAccount(true);
    try {
      await auth.logout();
      router.replace({ pathname: "/login", params: { next: returnPath } } as any);
    } catch (error: unknown) {
      setMessage(
        error instanceof Error ? error.message : "Unable to switch accounts right now."
      );
      setMessageTone("error");
      setSwitchingAccount(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text accessibilityRole="header" aria-level={1} style={styles.title}>
          Claim your GrowPathAI gift
        </Text>

        {state === "loading" ? (
          <>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.copy}>Checking this secure gift link...</Text>
          </>
        ) : null}

        {gift && state !== "loading" ? (
          <View style={styles.details}>
            <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
              {gift.interval === "yearly" ? "One year" : "One month"} of {gift.plan}
            </Text>
            <Text style={styles.copy}>Recipient: {gift.recipientEmail}</Text>
            {gift.message ? (
              <Text style={styles.note}>&ldquo;{gift.message}&rdquo;</Text>
            ) : null}
            <Text style={styles.helper}>
              This prepaid access starts when the gift is successfully claimed. Sign in or
              create a personal account with the recipient email above.
            </Text>
          </View>
        ) : null}

        {message ? (
          <Text
            accessibilityLiveRegion={messageTone === "error" ? "assertive" : "polite"}
            accessibilityRole={messageTone === "error" ? "alert" : undefined}
            style={[
              styles.feedback,
              messageTone === "success" && styles.feedbackSuccess,
              messageTone === "error" && styles.feedbackError
            ]}
          >
            {message}
          </Text>
        ) : null}

        {gift && state === "ready" && !auth.token ? (
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign in to claim gift"
              onPress={() =>
                router.push({ pathname: "/login", params: { next: returnPath } } as any)
              }
              style={styles.primaryButton}
            >
              <Text style={styles.primaryText}>Sign in to claim</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create account to claim gift"
              onPress={() =>
                router.push({
                  pathname: "/register",
                  params: { next: returnPath }
                } as any)
              }
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryText}>Create personal account</Text>
            </Pressable>
          </View>
        ) : null}

        {gift &&
        (state === "ready" || state === "claiming") &&
        auth.token &&
        !accountMismatch ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Claim prepaid access gift"
            disabled={state === "claiming"}
            onPress={acceptGift}
            style={[styles.primaryButton, state === "claiming" && styles.disabled]}
          >
            {state === "claiming" ? (
              <ActivityIndicator color={palette.accentText} />
            ) : (
              <Text style={styles.primaryText}>Claim prepaid access</Text>
            )}
          </Pressable>
        ) : null}

        {accountMismatch ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign in with a different account to claim gift"
            disabled={switchingAccount}
            onPress={useAnotherAccount}
            style={[styles.secondaryButton, switchingAccount && styles.disabled]}
          >
            {switchingAccount ? (
              <ActivityIndicator color={palette.accent} />
            ) : (
              <Text style={styles.secondaryText}>Use a different account</Text>
            )}
          </Pressable>
        ) : null}

        {state === "claimed" ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose workspace after claiming gift"
            onPress={() => router.replace("/account/mode")}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryText}>Choose workspace</Text>
          </Pressable>
        ) : null}

        {state === "preview-error" ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Try loading gift details again"
            onPress={() => setRetryNonce((value) => value + 1)}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryText}>Try again</Text>
          </Pressable>
        ) : null}

        {state === "blocked" ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Review account billing"
            onPress={() => router.replace("/account/billing")}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>Review account billing</Text>
          </Pressable>
        ) : null}

        {state === "terminal" ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go to GrowPathAI sign in"
            onPress={() => router.replace("/login")}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>Go to sign in</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

export const createClaimGiftStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    page: {
      alignItems: "center",
      backgroundColor: palette.page,
      flexGrow: 1,
      justifyContent: "center",
      padding: 18
    },
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 14,
      maxWidth: 520,
      padding: 22,
      width: "100%"
    },
    title: { color: palette.text, fontSize: 24, fontWeight: "900" },
    sectionTitle: { color: palette.text, fontSize: 18, fontWeight: "800" },
    details: { gap: 8 },
    copy: { color: palette.textSoft, lineHeight: 21 },
    helper: { color: palette.textMuted, fontSize: 13, lineHeight: 19 },
    note: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      fontStyle: "italic",
      lineHeight: 21,
      padding: 12
    },
    feedback: { color: palette.info, fontWeight: "700", lineHeight: 20 },
    feedbackSuccess: { color: palette.success },
    feedbackError: { color: palette.danger },
    actions: { gap: 10 },
    primaryButton: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: 16
    },
    primaryText: { color: palette.accentText, fontWeight: "900" },
    secondaryButton: {
      alignItems: "center",
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: 16
    },
    secondaryText: { color: palette.accent, fontWeight: "800" },
    disabled: { opacity: 0.5 }
  });
