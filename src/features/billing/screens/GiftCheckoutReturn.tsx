import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ApiError } from "@/api/apiRequest";
import {
  getGiftCheckoutRecovery,
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
import { useAuth } from "@/auth/AuthContext";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import {
  GIFT_CHECKOUT_CANCEL_PATH,
  GIFT_CHECKOUT_RECOVERY_PATH,
  GIFT_CHECKOUT_SUCCESS_PATH,
  isCanonicalLegacyCancelReturn,
  normalizeGiftCheckoutAttemptId,
  normalizeGiftCheckoutSessionId,
  resolveAuthReturnPath
} from "@/utils/authReturnPath";
import { openExternalUrl } from "@/utils/openExternalUrl";

type Props = { expectedReturn: "success" | "cancel" | "recovery" };

type ResolvedReturnProps = Props & {
  validatedReturnPath: string;
  legacyCancel: boolean;
  sessionId: string;
  urlAttemptId: string;
};

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
  not_created: {
    title: "Stripe checkout was not created",
    body: "GrowPath verified that Stripe checkout was not created and no payment was submitted. The server allows a new attempt after the local saved attempt is safely cleared."
  },
  support: {
    title: "Support review required",
    body: "GrowPath cannot safely classify this checkout as paid, unpaid, or resumable. Do not start another gift checkout unless this screen confirms that a new attempt is allowed."
  }
};

export function normalizeGiftCheckoutSessionParam(
  value: string | string[] | undefined
): string | null {
  return normalizeGiftCheckoutSessionId(value) || null;
}

function errorCode(error: unknown): string {
  return String((error as any)?.code || "");
}

function errorMessage(error: unknown): string {
  return String(
    (error as any)?.message ||
      "GrowPath could not verify this checkout. No payment status was inferred from the return address."
  );
}

export default function GiftCheckoutReturn({ expectedReturn }: Props) {
  const params = useLocalSearchParams() as {
    session_id?: string | string[];
    checkout_attempt_id?: string | string[];
    [key: string]: string | string[] | undefined;
  };
  const fragment = String((globalThis as any)?.window?.location?.hash || "");
  const expectedPath =
    expectedReturn === "success"
      ? GIFT_CHECKOUT_SUCCESS_PATH
      : expectedReturn === "cancel"
        ? GIFT_CHECKOUT_CANCEL_PATH
        : GIFT_CHECKOUT_RECOVERY_PATH;
  const browserLocation = (globalThis as any)?.window?.location;
  const rawBrowserPath =
    Platform.OS === "web"
      ? browserLocation
        ? `${String(browserLocation.pathname || "")}${String(
            browserLocation.search || ""
          )}${String(browserLocation.hash || "")}`
        : null
      : undefined;
  const validatedReturnPath = resolveAuthReturnPath(
    expectedPath,
    params,
    fragment,
    rawBrowserPath
  );
  const paramKeys = Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .map(([key]) => key);
  const legacyCancel =
    expectedReturn === "cancel" &&
    paramKeys.length === 0 &&
    fragment === "" &&
    isCanonicalLegacyCancelReturn(rawBrowserPath);
  const sessionId =
    expectedReturn === "success" && validatedReturnPath
      ? normalizeGiftCheckoutSessionId(params.session_id)
      : "";
  const urlAttemptId =
    expectedReturn === "cancel" && validatedReturnPath
      ? normalizeGiftCheckoutAttemptId(params.checkout_attempt_id)
      : "";
  const decodedRouteIdentity = JSON.stringify(
    Object.entries(params)
      .filter(([, value]) => value !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
  );
  const returnIdentity = `${expectedReturn}:${
    rawBrowserPath === undefined
      ? `native:${decodedRouteIdentity}:${fragment}`
      : `web:${String(rawBrowserPath)}`
  }`;

  return (
    <GiftCheckoutReturnForIdentity
      key={returnIdentity}
      expectedReturn={expectedReturn}
      validatedReturnPath={validatedReturnPath}
      legacyCancel={legacyCancel}
      sessionId={sessionId}
      urlAttemptId={urlAttemptId}
    />
  );
}

function GiftCheckoutReturnForIdentity({
  expectedReturn,
  validatedReturnPath,
  legacyCancel,
  sessionId,
  urlAttemptId
}: ResolvedReturnProps) {
  const router = useRouter();
  const auth = useAuth();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createGiftCheckoutReturnStyles(palette), [palette]);
  const { width } = useWindowDimensions();
  const [result, setResult] = useState<GiftCheckoutReconcileResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cleanupWarning, setCleanupWarning] = useState("");
  const [supportRequired, setSupportRequired] = useState(false);
  const [wrongAccountRecovery, setWrongAccountRecovery] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const activeRef = useRef(true);
  const checkingRef = useRef(false);
  const resumeRef = useRef(false);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  const checkStatus = useCallback(async () => {
    if (!activeRef.current || checkingRef.current) return;
    checkingRef.current = true;
    setLoading(true);
    setError("");
    setCleanupWarning("");
    setSupportRequired(false);
    setWrongAccountRecovery(false);
    try {
      let recoveryAttemptId = "";
      if (expectedReturn === "success" && !validatedReturnPath) {
        throw new Error(
          "This success return is missing a valid Stripe Checkout session. GrowPath will not infer payment from this address. Open Gifts you sent for authoritative history."
        );
      }
      if (expectedReturn === "cancel" && !validatedReturnPath && !legacyCancel) {
        throw new Error(
          "This cancel return has invalid or extra checkout information. GrowPath will not use browser storage as a substitute."
        );
      }
      if (expectedReturn === "recovery") {
        if (!validatedReturnPath) {
          throw new Error("This account recovery address is invalid.");
        }
        const recovery = await getGiftCheckoutRecovery();
        if (!activeRef.current) return;
        if (recovery.state === "support") {
          setResult(null);
          setSupportRequired(true);
          return;
        }
        if (recovery.state === "none") {
          throw new ApiError("GIFT_RECONCILIATION_NOT_FOUND", 404, {
            message: "Gift checkout was not found."
          });
        }
        recoveryAttemptId = recovery.attempt.checkoutAttemptId;
      }

      const localAttempt = legacyCancel ? await getStoredGiftCheckoutAttempt() : null;
      if (!activeRef.current) return;
      const legacyAttemptId =
        localAttempt?.phase === "checkout_requested"
          ? localAttempt.checkoutAttemptId
          : "";
      const reconciledAttemptId = recoveryAttemptId || urlAttemptId || legacyAttemptId;
      if (expectedReturn === "cancel" && !reconciledAttemptId) {
        throw new Error(
          "No valid saved gift attempt is available to verify. Open Gifts you sent for authoritative history."
        );
      }
      const verified = await reconcileGiftCheckout(
        expectedReturn === "success"
          ? { sessionId }
          : { checkoutAttemptId: reconciledAttemptId }
      );
      if (!activeRef.current) return;
      setResult(verified);
      if (verified.canStartNewAttempt) {
        try {
          const currentAttempt = await getStoredGiftCheckoutAttempt();
          if (!activeRef.current) return;
          if (!currentAttempt) return;
          if (currentAttempt.checkoutAttemptId !== verified.checkoutAttemptId) {
            setCleanupWarning(
              "The server finished checking the authenticated attempt, but this browser saved a different attempt. The browser record was not cleared."
            );
            return;
          }
          const cleared = await clearGiftCheckoutAttemptWhenAllowed(
            true,
            verified.checkoutAttemptId
          );
          if (!activeRef.current) return;
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
      if (!activeRef.current) return;
      setResult(null);
      const code = errorCode(nextError);
      if (code === "GIFT_RECONCILIATION_NOT_FOUND") {
        setWrongAccountRecovery(true);
        setError(
          "GrowPath did not find this gift checkout for this signed-in account. No gift or recipient details were exposed."
        );
      } else if (code === "GIFT_RECONCILIATION_SUPPORT_REQUIRED") {
        setSupportRequired(true);
      } else {
        setError(errorMessage(nextError));
      }
    } finally {
      checkingRef.current = false;
      if (activeRef.current) setLoading(false);
    }
  }, [expectedReturn, legacyCancel, sessionId, urlAttemptId, validatedReturnPath]);

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

  const switchToPurchasingAccount = useCallback(async () => {
    if (switchingAccount) return;
    setSwitchingAccount(true);
    setError("");
    const next = validatedReturnPath || GIFT_CHECKOUT_RECOVERY_PATH;
    try {
      await auth.logout();
      router.replace({ pathname: "/login", params: { next } } as any);
    } catch (nextError) {
      setError(errorMessage(nextError));
      setSwitchingAccount(false);
    }
  }, [auth, router, switchingAccount, validatedReturnPath]);

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
            : expectedReturn === "cancel"
              ? "GrowPath is checking the exact returned or legacy-saved gift attempt. A cancel address alone does not prove whether a payment was submitted."
              : "GrowPath may finish or resume the same saved checkout operation for this purchasing account. It will not start a different attempt, and this page does not submit payment."}
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

        {!loading && supportRequired ? (
          <View
            style={styles.warningCard}
            accessibilityLabel="Gift checkout support review"
          >
            <Text style={styles.statusTitle}>Checkout support review is required</Text>
            <Text style={styles.statusBody}>
              GrowPath found account checkout state that cannot be safely resumed or
              classified here. No new payment should be started until support reviews it.
            </Text>
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
        {wrongAccountRecovery ? (
          <Pressable
            accessibilityLabel="Use the purchasing account"
            accessibilityRole="button"
            accessibilityState={{ disabled: switchingAccount }}
            disabled={switchingAccount}
            onPress={() => void switchToPurchasingAccount()}
            style={[styles.primaryButton, switchingAccount && styles.buttonDisabled]}
          >
            <Text style={styles.primaryButtonText}>
              {switchingAccount ? "Switching account..." : "Use the purchasing account"}
            </Text>
          </Pressable>
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
