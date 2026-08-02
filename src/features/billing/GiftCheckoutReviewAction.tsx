import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import {
  formatGiftCheckoutAmount,
  useGiftCheckoutReview,
  type GiftCheckoutReviewFeedback,
  type GiftCheckoutReviewMaterial
} from "@/features/billing/giftCheckoutReview";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type Props = {
  material: GiftCheckoutReviewMaterial;
  recipientValid: boolean;
  configured: boolean;
  onFeedback: GiftCheckoutReviewFeedback;
  openCheckoutUrl: (url: string) => Promise<void>;
};

export default function GiftCheckoutReviewAction({
  material,
  recipientValid,
  configured,
  onFeedback,
  openCheckoutUrl
}: Props) {
  const { palette } = useAppTheme();
  const router = useRouter();
  const styles = useMemo(() => createGiftCheckoutReviewStyles(palette), [palette]);
  const { quote, busy, needsReconciliation, requestQuote, confirmAndContinue } =
    useGiftCheckoutReview({
      material,
      onFeedback,
      openCheckoutUrl
    });
  const amount = quote
    ? formatGiftCheckoutAmount(quote.amountCents, quote.currency)
    : null;

  return (
    <View style={styles.container}>
      {!configured ? (
        <View style={styles.review} accessibilityLabel="Gift checkout unavailable">
          <Text style={styles.pendingTitle}>Gift checkout is unavailable</Text>
          <Text style={styles.copy}>
            GrowPath cannot request a gift price or create a Stripe checkout while the
            server reports this feature unavailable. No payment was created.
          </Text>
        </View>
      ) : needsReconciliation ? (
        <View style={styles.review} accessibilityLabel="Saved gift checkout pending">
          <Text style={styles.pendingTitle}>Check the saved checkout first</Text>
          <Text style={styles.copy}>
            GrowPath may already have created this exact Stripe checkout. Verify its
            authoritative state before requesting another quote or payment attempt.
          </Text>
        </View>
      ) : quote && amount ? (
        <View style={styles.review} accessibilityLabel="Server-confirmed gift price">
          <Text style={styles.eyebrow}>Server-confirmed total</Text>
          <Text style={styles.amount}>{amount}</Text>
          <Text style={styles.copy}>
            One prepaid {quote.interval === "monthly" ? "month" : "year"} of Pro, quantity
            one. It does not renew. Stripe can charge this total only after you confirm
            below.
          </Text>
          <View style={styles.boundDetails}>
            <Text style={styles.boundDetail}>
              Recipient email: {material.recipientEmail.trim().toLowerCase()}
            </Text>
            {material.recipientName?.trim() ? (
              <Text style={styles.boundDetail}>
                Recipient name: {material.recipientName.trim()}
              </Text>
            ) : null}
            {material.message?.trim() ? (
              <Text style={styles.boundDetail}>
                Gift message: {material.message.trim()}
              </Text>
            ) : null}
            <Text style={styles.boundDetail}>
              Access begins only after the recipient successfully claims the gift.
            </Text>
          </View>
          <Text style={styles.expiry}>
            Quote expires {new Date(quote.expiresAt).toLocaleString()}.
          </Text>
          <Pressable
            accessibilityLabel={`Confirm and continue - ${amount}`}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={() => void confirmAndContinue()}
            style={[styles.button, busy && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>
              {busy ? "Opening Stripe..." : `Confirm and continue - ${amount}`}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.review} accessibilityLabel="Gift price pending server quote">
          <Text style={styles.pendingTitle}>Price hidden until secure review</Text>
          <Text style={styles.copy}>
            GrowPath will request the current one-time total from the server after the
            recipient details are complete. Requesting a quote does not create a Stripe
            checkout or payment.
          </Text>
          <Pressable
            accessibilityLabel="Review authoritative gift price"
            accessibilityRole="button"
            accessibilityState={{ disabled: busy || !recipientValid || !configured }}
            disabled={busy || !recipientValid || !configured}
            onPress={() => void requestQuote()}
            style={[
              styles.button,
              (busy || !recipientValid || !configured) && styles.buttonDisabled
            ]}
          >
            <Text style={styles.buttonText}>
              {busy ? "Loading secure price..." : "Review gift price"}
            </Text>
          </Pressable>
        </View>
      )}
      {needsReconciliation ? (
        <Pressable
          accessibilityLabel="Check saved gift checkout"
          accessibilityRole="button"
          onPress={() => router.push("/account/gift-checkout/cancel" as any)}
          style={styles.reconcileButton}
        >
          <Text style={styles.reconcileButtonText}>Check saved checkout</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const createGiftCheckoutReviewStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    container: { marginTop: 4 },
    review: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 7,
      padding: 12
    },
    eyebrow: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    pendingTitle: { color: palette.text, fontSize: 16, fontWeight: "900" },
    amount: { color: palette.text, fontSize: 30, fontWeight: "900" },
    copy: { color: palette.textSoft, fontSize: 13, fontWeight: "700", lineHeight: 19 },
    expiry: { color: palette.textMuted, fontSize: 12, fontWeight: "700" },
    boundDetails: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 4,
      padding: 10
    },
    boundDetail: {
      color: palette.text,
      fontSize: 12,
      fontWeight: "700",
      lineHeight: 18
    },
    button: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      marginTop: 4,
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: 12,
      paddingVertical: 11
    },
    buttonDisabled: { opacity: 0.55 },
    buttonText: {
      color: palette.accentText,
      fontWeight: "900",
      textAlign: "center"
    },
    reconcileButton: {
      alignItems: "center",
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    reconcileButtonText: { color: palette.accent, fontWeight: "900" }
  });
