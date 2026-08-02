import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { getStoredGiftCheckoutAttempt } from "@/features/billing/giftCheckoutAttempt";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type RecoveryState = "none" | "requested" | "storage_error";

export default function GiftCheckoutRecoveryAction({
  visible = true
}: {
  visible?: boolean;
}) {
  const router = useRouter();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createGiftCheckoutRecoveryStyles(palette), [palette]);
  const [state, setState] = useState<RecoveryState>("none");

  useEffect(() => {
    if (!visible) {
      setState("none");
      return;
    }
    let mounted = true;
    getStoredGiftCheckoutAttempt()
      .then((attempt) => {
        if (mounted) {
          setState(attempt?.phase === "checkout_requested" ? "requested" : "none");
        }
      })
      .catch(() => {
        if (mounted) setState("storage_error");
      });
    return () => {
      mounted = false;
    };
  }, [visible]);

  if (!visible || state === "none") return null;

  const storageError = state === "storage_error";
  return (
    <View style={styles.card} accessibilityLabel="Saved gift checkout recovery">
      <Text style={styles.title}>
        {storageError
          ? "Saved checkout status needs review"
          : "A saved checkout may exist"}
      </Text>
      <Text style={styles.copy}>
        {storageError
          ? "This browser could not safely read its gift checkout retry record. Review purchaser history before starting another payment."
          : "This browser has a gift attempt that reached checkout creation. Check its authoritative state before requesting another price or payment."}
      </Text>
      <Pressable
        accessibilityLabel={
          storageError
            ? "View gifts sent for checkout recovery"
            : "Check saved checkout from this browser"
        }
        accessibilityRole="button"
        onPress={() =>
          router.push(
            (storageError
              ? "/account/sent-gifts"
              : "/account/gift-checkout/cancel") as any
          )
        }
        style={styles.button}
      >
        <Text style={styles.buttonText}>
          {storageError ? "View gifts you sent" : "Check saved checkout"}
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
