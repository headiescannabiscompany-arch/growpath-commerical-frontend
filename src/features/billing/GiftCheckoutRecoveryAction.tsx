import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import {
  getGiftCheckoutRecovery,
  type GiftCheckoutRecoveryAttempt
} from "@/api/subscription";
import { useAuth } from "@/auth/AuthContext";
import { getStoredGiftCheckoutAttempt } from "@/features/billing/giftCheckoutAttempt";
import { formatGiftCheckoutAmount } from "@/features/billing/giftCheckoutReview";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { buildAuthReturnPath, GIFT_CHECKOUT_CANCEL_PATH } from "@/utils/authReturnPath";

type RecoveryState =
  | { kind: "none" }
  | { kind: "local"; checkoutAttemptId: string }
  | { kind: "recoverable"; attempt: GiftCheckoutRecoveryAttempt }
  | { kind: "support" }
  | { kind: "unavailable" };

type ScopedRecoveryState = {
  scopeKey: string;
  value: RecoveryState;
};

function authenticatedAccountKey(token: unknown, user: unknown): string {
  const record =
    user && typeof user === "object" ? (user as Record<string, unknown>) : {};
  const identity = record.id || record._id || record.email || token;
  return identity ? `account:${String(identity)}` : "";
}

export default function GiftCheckoutRecoveryAction({
  visible = true
}: {
  visible?: boolean;
}) {
  const router = useRouter();
  const { token, user, isHydrating } = useAuth();
  const authenticated = Boolean(!isHydrating && token && user);
  const scopeKey = isHydrating
    ? "hydrating"
    : authenticated
      ? authenticatedAccountKey(token, user)
      : "anonymous";
  const { palette } = useAppTheme();
  const styles = useMemo(() => createGiftCheckoutRecoveryStyles(palette), [palette]);
  const [scopedState, setScopedState] = useState<ScopedRecoveryState>({
    scopeKey,
    value: { kind: "none" }
  });
  const state =
    scopedState.scopeKey === scopeKey ? scopedState.value : ({ kind: "none" } as const);

  useEffect(() => {
    if (!visible || isHydrating) {
      setScopedState({ scopeKey, value: { kind: "none" } });
      return;
    }
    let mounted = true;
    const commit = (value: RecoveryState) => {
      if (mounted) setScopedState({ scopeKey, value });
    };
    commit({ kind: "none" });
    if (!authenticated) {
      getStoredGiftCheckoutAttempt()
        .then((attempt) => {
          if (!mounted) return;
          const returnPath =
            attempt?.phase === "checkout_requested"
              ? buildAuthReturnPath(GIFT_CHECKOUT_CANCEL_PATH, {
                  checkout_attempt_id: attempt.checkoutAttemptId
                })
              : "";
          commit(
            returnPath
              ? { kind: "local", checkoutAttemptId: attempt!.checkoutAttemptId }
              : { kind: "none" }
          );
        })
        .catch(() => {
          commit({ kind: "none" });
        });
      return () => {
        mounted = false;
      };
    }
    Promise.allSettled([getStoredGiftCheckoutAttempt(), getGiftCheckoutRecovery()]).then(
      ([localResult, serverResult]) => {
        if (!mounted) return;
        const localAttempt =
          localResult.status === "fulfilled" &&
          localResult.value?.phase === "checkout_requested" &&
          buildAuthReturnPath(GIFT_CHECKOUT_CANCEL_PATH, {
            checkout_attempt_id: localResult.value.checkoutAttemptId
          })
            ? localResult.value
            : null;
        if (serverResult.status === "fulfilled") {
          if (serverResult.value.state === "recoverable") {
            commit({ kind: "recoverable", attempt: serverResult.value.attempt });
            return;
          }
          if (serverResult.value.state === "support") {
            commit({ kind: "support" });
            return;
          }
          if (localResult.status === "rejected") {
            commit({ kind: "unavailable" });
            return;
          }
          commit(
            localAttempt
              ? { kind: "local", checkoutAttemptId: localAttempt.checkoutAttemptId }
              : { kind: "none" }
          );
          return;
        }
        commit(
          localAttempt
            ? { kind: "local", checkoutAttemptId: localAttempt.checkoutAttemptId }
            : { kind: "unavailable" }
        );
      }
    );
    return () => {
      mounted = false;
    };
  }, [authenticated, isHydrating, scopeKey, visible]);

  if (!visible || isHydrating || state.kind === "none") return null;

  const serverRecoverable = state.kind === "recoverable";
  const localOnly = state.kind === "local";
  const unavailable = state.kind === "unavailable";
  const amount = serverRecoverable
    ? formatGiftCheckoutAmount(state.attempt.amountCents, state.attempt.currency)
    : "";
  const accessibilityLabel = serverRecoverable
    ? "Check active gift checkout for this account"
    : localOnly
      ? "Check saved checkout from this browser"
      : "Review gift checkout support status";
  const destination = localOnly
    ? buildAuthReturnPath(GIFT_CHECKOUT_CANCEL_PATH, {
        checkout_attempt_id: state.checkoutAttemptId
      })
    : "/account/gift-checkout/recover";

  return (
    <View style={styles.card} accessibilityLabel="Saved gift checkout recovery">
      <Text style={styles.title}>
        {serverRecoverable
          ? "An account checkout needs review"
          : localOnly
            ? "A saved checkout may exist"
            : unavailable
              ? "Checkout recovery is temporarily unavailable"
              : "Checkout support review is required"}
      </Text>
      <Text style={styles.copy}>
        {serverRecoverable
          ? `GrowPath found one active ${
              state.attempt.interval === "yearly" ? "yearly" : "monthly"
            } Pro gift checkout for ${amount}. Check its authoritative state before another payment attempt.`
          : localOnly
            ? "This browser saved a checkout attempt. Sign in with the purchasing account to check its authoritative state before requesting another price or payment."
            : unavailable
              ? "GrowPath could not safely verify whether this account has an active gift checkout. Do not start another payment until recovery can be checked."
              : "GrowPath found checkout state that requires support review. No new gift checkout should be started from this account."}
      </Text>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={() => router.push(destination as any)}
        style={styles.button}
      >
        <Text style={styles.buttonText}>
          {serverRecoverable || localOnly ? "Check checkout" : "Review recovery"}
        </Text>
      </Pressable>
    </View>
  );
}

export const createGiftCheckoutRecoveryStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    card: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.warning,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 7,
      padding: 12
    },
    title: { color: palette.text, fontSize: 16, fontWeight: "900" },
    copy: { color: palette.textSoft, fontSize: 13, fontWeight: "700", lineHeight: 19 },
    button: {
      alignItems: "center",
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    buttonText: { color: palette.accent, fontWeight: "900" }
  });
