import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  createCheckoutSession,
  getSubscription,
  isSafeStripeCheckoutUrl
} from "@/api/subscription";
import { useAuth } from "@/auth/AuthContext";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { openExternalUrl } from "@/utils/openExternalUrl";

type Recovery = {
  checkoutAttemptId: string;
  plan: "pro" | "commercial";
  interval: "monthly" | "yearly";
};

export function subscriptionCheckoutRecovery(value: any): Recovery | null {
  const recovery = value?.checkoutRecovery;
  if (
    value?.canResumeCheckout !== true ||
    value?.checkoutInProgress !== true ||
    value?.active !== false ||
    value?.paymentState !== "nonpaid" ||
    value?.consistency !== "consistent" ||
    !recovery ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      recovery.checkoutAttemptId || ""
    ) ||
    !["pro", "commercial"].includes(recovery.plan) ||
    !["monthly", "yearly"].includes(recovery.interval)
  ) {
    return null;
  }
  return {
    checkoutAttemptId: recovery.checkoutAttemptId,
    plan: recovery.plan,
    interval: recovery.interval
  };
}

export default function SubscriptionCheckoutRecoveryAction({
  pending = false
}: {
  pending?: boolean;
}) {
  const { token, user, isHydrating } = useAuth();
  const userId = String(user?.id || user?._id || user?.email || "");
  const scope = useMemo(
    () => (pending && !isHydrating && token && userId ? { token, userId } : null),
    [pending, isHydrating, token, userId]
  );
  const scopeRef = useRef(scope);
  scopeRef.current = scope;
  const mounted = useRef(false);
  const inFlight = useRef(false);
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [state, setState] = useState<{
    scope: typeof scope;
    recovery: Recovery | null;
    message: string;
    busy: boolean;
  }>({ scope, recovery: null, message: "", busy: false });
  const current = state.scope === scope ? state : null;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setState({ scope, recovery: null, message: "", busy: false });
    if (pending && scope) {
      void getSubscription().then(
        (billing) => {
          if (!active || scopeRef.current !== scope) return;
          const recovery = subscriptionCheckoutRecovery(billing);
          setState({
            scope,
            recovery,
            busy: false,
            message: recovery
              ? ""
              : "The saved checkout needs a status review. Refresh Billing before trying another payment."
          });
        },
        () => {
          if (!active || scopeRef.current !== scope) return;
          setState({
            scope,
            recovery: null,
            busy: false,
            message:
              "Checkout status could not be verified. Refresh Billing to try again."
          });
        }
      );
    }
    return () => {
      active = false;
    };
  }, [pending, scope]);

  async function resume() {
    const expected = current?.recovery;
    if (!scope || !expected || inFlight.current) return;
    inFlight.current = true;
    setState({ scope, recovery: expected, message: "", busy: true });
    const stillCurrent = () => mounted.current && scopeRef.current === scope;
    try {
      const fresh = subscriptionCheckoutRecovery(await getSubscription());
      if (!stillCurrent()) return;
      if (
        !fresh ||
        fresh.checkoutAttemptId !== expected.checkoutAttemptId ||
        fresh.plan !== expected.plan ||
        fresh.interval !== expected.interval
      ) {
        throw new Error("Checkout state changed. Refresh Billing before continuing.");
      }
      const response = await createCheckoutSession({ ...fresh, recoveryOnly: true });
      if (!stillCurrent()) return;
      if (
        response?.checkoutAttemptId !== expected.checkoutAttemptId ||
        !isSafeStripeCheckoutUrl(response?.url) ||
        new URL(response.url).pathname !== `/c/pay/${response?.sessionId}`
      ) {
        throw new Error(
          "The saved checkout link could not be verified. No link was opened."
        );
      }
      // Keep the entire provider URL, including its required fragment.
      await openExternalUrl(response.url);
      if (stillCurrent()) {
        setState({
          scope,
          recovery: expected,
          busy: false,
          message: "The saved Stripe checkout opened. Opening it does not submit payment."
        });
      }
    } catch (error: any) {
      if (stillCurrent()) {
        setState({
          scope,
          recovery: expected,
          busy: false,
          message:
            error?.message ||
            "Unable to recover this checkout. No new checkout was requested."
        });
      }
    } finally {
      inFlight.current = false;
    }
  }

  if (!pending || !scope || !current || (!current.recovery && !current.message))
    return null;

  return (
    <View style={styles.card} accessibilityLabel="Unfinished subscription checkout">
      <Text style={styles.title}>Review unfinished checkout</Text>
      <Text style={styles.copy}>
        {current.recovery
          ? `Continue the saved ${current.recovery.interval === "monthly" ? "monthly" : "yearly"} ${current.recovery.plan === "pro" ? "Pro" : "Commercial"} checkout. This does not create a different purchase or submit payment.`
          : "No new subscription checkout will be started from this recovery control."}
      </Text>
      {current.message ? (
        <Text accessibilityRole="alert" style={styles.copy}>
          {current.message}
        </Text>
      ) : null}
      {current.recovery ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Resume saved subscription checkout"
          accessibilityState={{ disabled: current.busy }}
          disabled={current.busy}
          onPress={() => void resume()}
          style={styles.button}
        >
          <Text style={styles.buttonText}>
            {current.busy ? "Checking checkout..." : "Resume saved checkout"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const createStyles = (palette: ThemePalette) =>
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
    copy: { color: palette.textSoft, fontSize: 13, lineHeight: 19 },
    button: {
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      padding: 10
    },
    buttonText: { color: palette.accent, fontWeight: "900" }
  });
