import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import {
  isSafeStripeCheckoutUrl,
  reconcileGiftCheckout,
  type GiftCheckoutReconcileResult,
  type GiftCheckoutReconcileState
} from "@/api/subscription";
import {
  clearGiftCheckoutAttemptWhenAllowed,
  getStoredGiftCheckoutAttempt
} from "@/features/billing/giftCheckoutAttempt";
import { formatGiftCheckoutAmount } from "@/features/billing/giftCheckoutReview";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { openExternalUrl } from "@/utils/openExternalUrl";

type Props = { expectedReturn: "success" | "cancel" };

const SESSION_ID_PATTERN = /^cs_[A-Za-z0-9_]{3,252}$/;

const STATE_COPY: Record<GiftCheckoutReconcileState, { title: string; body: string }> = {
  verifying: {
    title: "Verification is still in progress",
    body: "GrowPath could not yet obtain a final authoritative Stripe state. No payment or gift delivery is being claimed here."
  },
  pending: {
    title: "Checkout request is pending",
    body: "A saved gift attempt exists, but GrowPath has not verified an open checkout or payment. Check again before taking another action."
  },
  open_unpaid: {
    title: "Checkout remains open and unpaid",
    body: "Stripe reports that this exact checkout is still open and unpaid. You may review the same Stripe checkout; GrowPath will not create another attempt."
  },
  payment_processing: {
    title: "Payment is not settled yet",
    body: "Stripe has not provided enough authoritative evidence to activate or deliver this gift. Check again before assuming payment succeeded."
  },
  settled: {
    title: "Payment verified by GrowPath",
    body: "GrowPath verified the exact Stripe session and payment before reporting this gift as paid. Recipient delivery and claim status are shown below."
  },
  expired: {
    title: "Checkout expired without a verified payment",
    body: "GrowPath verified that the saved checkout expired unpaid. The server allows a new attempt after the local saved attempt is safely cleared."
  },
  support: {
    title: "Support review required",
    body: "GrowPath cannot safely classify this checkout as paid, unpaid, or resumable. Do not start another gift checkout unless this screen confirms that a new attempt is allowed."
  }
};

export function normalizeGiftCheckoutSessionParam(
  value: string | string[] | undefined
): string | null {
  if (Array.isArray(value)) return null;
  const normalized = String(value || "").trim();
  return SESSION_ID_PATTERN.test(normalized) ? normalized : null;
}

function errorMessage(error: unknown): string {
  return String(
    (error as any)?.message ||
      "GrowPath could not verify this checkout. No payment status was inferred from the return address."
  );
}

export default function GiftCheckoutReturn({ expectedReturn }: Props) {
  const router = useRouter();
  const params = useLocalSearchParams<{
    session_id?: string | string[];
  }>();
  const sessionId = normalizeGiftCheckoutSessionParam(params.session_id);
  const { palette } = useAppTheme();
  const styles = useMemo(() => createGiftCheckoutReturnStyles(palette), [palette]);
  const { width } = useWindowDimensions();
  const [result, setResult] = useState<GiftCheckoutReconcileResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cleanupWarning, setCleanupWarning] = useState("");
  const checkingRef = useRef(false);
  const resumeRef = useRef(false);

  const checkStatus = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    setLoading(true);
    setError("");
    setCleanupWarning("");
    try {
      if (expectedReturn === "success" && !sessionId) {
        throw new Error(
          "This success return is missing a valid Stripe Checkout session. GrowPath will not infer payment from this address. Open Gifts you sent for authoritative history."
        );
      }
      const attempt =
        expectedReturn === "cancel" ? await getStoredGiftCheckoutAttempt() : null;
      if (expectedReturn === "cancel" && !attempt?.checkoutAttemptId) {
        throw new Error(
          "No valid Stripe session or saved gift attempt is available to verify. Open Gifts you sent for authoritative history."
        );
      }
      const verified = await reconcileGiftCheckout(
        expectedReturn === "success"
          ? { sessionId: sessionId! }
          : { checkoutAttemptId: attempt!.checkoutAttemptId }
      );
      setResult(verified);
      if (verified.canStartNewAttempt && expectedReturn === "cancel") {
        try {
          const currentAttempt = await getStoredGiftCheckoutAttempt();
          if (
            !attempt?.checkoutAttemptId ||
            currentAttempt?.checkoutAttemptId !== attempt.checkoutAttemptId
          ) {
            throw new Error("The saved checkout changed during verification.");
          }
          const cleared = await clearGiftCheckoutAttemptWhenAllowed(true);
          if (!cleared) {
            throw new Error("Saved checkout cleanup was not verified.");
          }
        } catch {
          setCleanupWarning(
            "The server allows a new attempt, but this browser could not verify removal of its saved attempt. Do not start another checkout in this tab yet."
          );
        }
      }
    } catch (nextError) {
      setResult(null);
      setError(errorMessage(nextError));
    } finally {
      checkingRef.current = false;
      setLoading(false);
    }
  }, [expectedReturn, sessionId]);

  useEffect(() => {
    void checkStatus();
  }, [checkStatus]);

  const resumeCheckout = useCallback(async () => {
    if (
      resumeRef.current ||
      !result?.canResume ||
      !isSafeStripeCheckoutUrl(result.checkoutUrl)
    ) {
      return;
    }
    resumeRef.current = true;
    setError("");
    try {
      await openExternalUrl(result.checkoutUrl);
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      resumeRef.current = false;
    }
  }, [result]);

  const stateCopy = result ? STATE_COPY[result.state] : null;
  const amount =
    result?.amountCents && result.currency
      ? formatGiftCheckoutAmount(result.amountCents, result.currency)
      : null;

  return (
    <ScrollView
      contentContainerStyle={[styles.page, { paddingHorizontal: width < 600 ? 16 : 24 }]}
    >
      <View style={styles.content}>
        <Text accessibilityRole="header" aria-level={1} style={styles.title}>
          Check gift checkout
        </Text>
        <Text style={styles.intro}>
          {expectedReturn === "success"
            ? "Stripe returned to GrowPath after checkout. This address alone does not prove that a payment succeeded."
            : "GrowPath is checking the exact saved gift attempt. A cancel return or recovery link alone does not prove whether a payment was submitted."}
        </Text>

        {loading ? (
          <View style={styles.statusCard} accessibilityLabel="Verifying gift checkout">
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.statusTitle}>Verifying with GrowPath and Stripe...</Text>
            <Text style={styles.statusBody}>
              No payment status is inferred from the page address.
            </Text>
          </View>
        ) : null}

        {!loading && stateCopy && result ? (
          <View style={styles.statusCard} accessibilityLabel="Authoritative gift status">
            <Text accessibilityRole="header" aria-level={2} style={styles.statusTitle}>
              {stateCopy.title}
            </Text>
            <Text style={styles.statusBody}>{stateCopy.body}</Text>
            {amount ? (
              <Text style={styles.amount}>Authoritative total: {amount}</Text>
            ) : null}
            <View style={styles.giftCard}>
              <Text style={styles.giftLine}>
                Recipient: {result.gift.recipientEmailMasked || "Unavailable"}
              </Text>
              {result.gift.recipientName ? (
                <Text style={styles.giftLine}>Name: {result.gift.recipientName}</Text>
              ) : null}
              <Text style={styles.giftLine}>
                Gift status: {result.gift.state.replaceAll("_", " ")}
              </Text>
              <Text style={styles.giftLine}>
                Term: one prepaid {result.gift.interval === "yearly" ? "year" : "month"}
              </Text>
            </View>
            {result.canResume && isSafeStripeCheckoutUrl(result.checkoutUrl) ? (
              <Pressable
                accessibilityLabel="Resume the same Stripe checkout"
                accessibilityRole="button"
                onPress={() => void resumeCheckout()}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>
                  Resume the same Stripe checkout
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {error ? (
          <View accessibilityRole="alert" style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        {cleanupWarning ? (
          <View accessibilityRole="alert" style={styles.warningCard}>
            <Text style={styles.warningText}>{cleanupWarning}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            accessibilityLabel="Check gift checkout again"
            accessibilityRole="button"
            disabled={loading}
            onPress={() => void checkStatus()}
            style={[styles.secondaryButton, loading && styles.buttonDisabled]}
          >
            <Text style={styles.secondaryButtonText}>Check again</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="View gifts you sent"
            accessibilityRole="button"
            onPress={() => router.replace("/account/sent-gifts" as any)}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>View gifts you sent</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Return to offers"
            accessibilityRole="button"
            onPress={() => router.replace("/offers" as any)}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Return to offers</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

export const createGiftCheckoutReturnStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    page: {
      backgroundColor: palette.page,
      flexGrow: 1,
      paddingBottom: 32,
      paddingTop: 16
    },
    content: { alignSelf: "center", gap: 12, maxWidth: 760, width: "100%" },
    title: { color: palette.text, fontSize: 28, fontWeight: "900" },
    intro: { color: palette.textSoft, fontWeight: "700", lineHeight: 20 },
    statusCard: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 10,
      padding: 16
    },
    statusTitle: { color: palette.text, fontSize: 19, fontWeight: "900" },
    statusBody: { color: palette.textSoft, fontWeight: "700", lineHeight: 20 },
    amount: { color: palette.accent, fontSize: 18, fontWeight: "900" },
    giftCard: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 5,
      padding: 12
    },
    giftLine: { color: palette.text, fontSize: 13, fontWeight: "700" },
    errorCard: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.danger,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 12
    },
    errorText: { color: palette.danger, fontWeight: "800" },
    warningCard: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.warning,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 12
    },
    warningText: { color: palette.warning, fontWeight: "800" },
    actions: { gap: 8 },
    primaryButton: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: 12,
      paddingVertical: 11
    },
    primaryButtonText: {
      color: palette.accentText,
      fontWeight: "900",
      textAlign: "center"
    },
    secondaryButton: {
      alignItems: "center",
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    secondaryButtonText: { color: palette.accent, fontWeight: "900" },
    buttonDisabled: { opacity: 0.55 }
  });
