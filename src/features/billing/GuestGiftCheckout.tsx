import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/theme/appTheme";
import type { GiftCheckoutInterval, GiftCheckoutQuote } from "@/api/subscription";
import type {
  GuestGiftDetails,
  GuestGiftPlan,
  GuestGiftReceipt
} from "./guestGiftCheckoutClient";
import {
  checkGuestGift,
  recoverGuestGift,
  clearGuestGiftReceipt,
  guestQuoteIdentity,
  loadGuestGiftReceipt,
  reviewGuestGift,
  startGuestGift,
  storeGuestGiftReceipt
} from "./guestGiftCheckoutClient";

type ButtonProps = { label: string; pressed: () => void; disabled?: boolean };
function Action({ label, pressed, disabled }: ButtonProps) {
  const { palette } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={pressed}
      style={[
        styles.action,
        { backgroundColor: palette.accent, opacity: disabled ? 0.55 : 1 }
      ]}
    >
      <Text style={{ color: palette.accentText, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}
function money(cents: number, currency: string) {
  const formatter = new Intl.NumberFormat(undefined, { style: "currency", currency });
  return formatter.format(
    cents / 10 ** (formatter.resolvedOptions().maximumFractionDigits ?? 2)
  );
}
function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Props = {
  plan: GuestGiftPlan;
  interval: GiftCheckoutInterval;
  onReceipt: (receipt: GuestGiftReceipt) => void;
  openCheckout: (url: string) => Promise<void>;
  previousReceipt?: GuestGiftReceipt | null;
};

export function GuestGiftOrder({
  plan,
  interval,
  onReceipt,
  openCheckout,
  previousReceipt
}: Props) {
  const { palette } = useAppTheme();
  const [buyer, setBuyer] = useState("");
  const [recipient, setRecipient] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [extra, setExtra] = useState(false);
  const [busy, setBusy] = useState(false);
  const active = useRef(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState<{
    fingerprint: string;
    quote: GiftCheckoutQuote;
    receipt: GuestGiftReceipt;
  } | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const details: GuestGiftDetails = {
    plan,
    interval,
    purchaserEmail: buyer.trim().toLowerCase(),
    giftRecipientEmail: recipient.trim().toLowerCase(),
    giftRecipientName: name.trim(),
    giftMessage: note.trim()
  };
  const fingerprint = JSON.stringify(details);
  const current = review?.fingerprint === fingerprint ? review : null;
  const lastInput = useRef(fingerprint);
  lastInput.current = fingerprint;
  const ready =
    EMAIL.test(details.purchaserEmail) &&
    EMAIL.test(details.giftRecipientEmail) &&
    details.purchaserEmail !== details.giftRecipientEmail;
  async function submit() {
    if (active.current || !ready) return;
    active.current = true;
    setBusy(true);
    setError("");
    let requested: GuestGiftReceipt | null = null;
    try {
      const saved = await loadGuestGiftReceipt();
      if (saved && saved.checkoutAttemptId !== previousReceipt?.checkoutAttemptId) {
        onReceipt(saved);
        return;
      }
      if (!current || Date.parse(current.quote.expiresAt) <= Date.now()) {
        const id = await guestQuoteIdentity();
        if (previousReceipt && previousReceipt.checkoutAttemptId !== id.checkoutAttemptId)
          throw new Error(
            "The earlier checkout could not be matched. Check its receipt before trying again."
          );
        const result = await reviewGuestGift(
          details,
          id,
          previousReceipt?.guestAccessToken
        );
        if (mounted.current && lastInput.current === fingerprint)
          setReview({ fingerprint, ...result });
        return;
      }
      await storeGuestGiftReceipt(current.receipt);
      if (!mounted.current || lastInput.current !== fingerprint) return;
      requested = current.receipt;
      const url = await startGuestGift(details, current.receipt, current.quote);
      if (mounted.current && lastInput.current === fingerprint) await openCheckout(url);
    } catch (err) {
      if (mounted.current)
        setError(errorText(err, "Gift checkout is temporarily unavailable."));
    } finally {
      active.current = false;
      if (mounted.current) {
        setBusy(false);
        if (requested) onReceipt(requested);
      }
    }
  }
  const input = [
    styles.input,
    { backgroundColor: palette.surface, color: palette.text, borderColor: palette.border }
  ];
  const label = { color: palette.text, fontWeight: "700" as const };
  return (
    <View style={styles.block}>
      <Text accessibilityRole="header" style={[styles.heading, { color: palette.text }]}>
        Send this gift
      </Text>
      <Text style={label}>Your receipt email</Text>
      <TextInput
        accessibilityLabel="Your receipt email"
        value={buyer}
        onChangeText={setBuyer}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!busy}
        maxLength={254}
        style={input}
      />
      <Text style={label}>Recipient’s email</Text>
      <TextInput
        accessibilityLabel="Gift recipient email"
        value={recipient}
        onChangeText={setRecipient}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!busy}
        maxLength={254}
        style={input}
      />
      {details.purchaserEmail && details.purchaserEmail === details.giftRecipientEmail ? (
        <Text accessibilityRole="alert" style={{ color: palette.text }}>
          Use the recipient’s email for the gift and your own for the receipt.
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: extra }}
        onPress={() => setExtra(!extra)}
        style={styles.disclosure}
      >
        <Text style={label}>
          {extra ? "Hide gift message" : "Add a name or gift message"}
        </Text>
      </Pressable>
      {extra && (
        <>
          <Text style={label}>Recipient name (optional)</Text>
          <TextInput
            accessibilityLabel="Gift recipient name"
            editable={!busy}
            value={name}
            maxLength={120}
            onChangeText={setName}
            style={input}
          />
          <Text style={label}>Gift message (optional)</Text>
          <TextInput
            accessibilityLabel="Gift message"
            editable={!busy}
            value={note}
            maxLength={500}
            onChangeText={setNote}
            multiline
            style={input}
          />
        </>
      )}
      {current && (
        <Text accessibilityLiveRegion="polite" style={{ color: palette.text }}>
          {plan === "pro" ? "Pro" : "Commercial"} for{" "}
          {interval === "yearly" ? "one year" : "one month"}, sent to{" "}
          {details.giftRecipientEmail}. One payment of{" "}
          {money(current.quote.amountCents, current.quote.currency)}. The gift ends
          automatically.
        </Text>
      )}
      {Boolean(error) && (
        <Text accessibilityRole="alert" style={{ color: palette.text }}>
          {error}
        </Text>
      )}
      <Action
        disabled={busy || !ready}
        pressed={submit}
        label={
          busy
            ? "Checking…"
            : current
              ? `Pay ${money(current.quote.amountCents, current.quote.currency)} with Stripe`
              : "Review gift price"
        }
      />
    </View>
  );
}

const statusMessages = {
  settled:
    "Payment confirmed. GrowPathAI sends the gift invitation to the recipient’s email.",
  open_unpaid: "Your checkout is still open. You can return to the same payment.",
  expired: "This unpaid checkout has expired.",
  not_created:
    "GrowPathAI has no payment checkout for this attempt. You can review this same gift again.",
  pending: "GrowPathAI is confirming this checkout. Check again before making a payment.",
  verifying: "GrowPathAI is verifying this checkout. Check back for the result.",
  payment_processing: "Your payment is processing. Check back for confirmation.",
  support: "This gift needs a billing review. Keep this receipt open and contact support."
} as const;

export function GuestGiftStatus({
  receipt,
  onNew,
  onRetry,
  openCheckout
}: {
  receipt: GuestGiftReceipt;
  onNew: () => void;
  onRetry: () => void;
  openCheckout: (url: string) => Promise<void>;
}) {
  const { palette } = useAppTheme();
  const [status, setStatus] = useState<Awaited<ReturnType<typeof checkGuestGift>> | null>(
    null
  );
  const [error, setError] = useState("");
  const router = useRouter();
  const [tick, setTick] = useState(0);
  const [loading, setLoading] = useState(true);
  const pendingRecovery = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setStatus(null);
    setError("");
    checkGuestGift(receipt)
      .then((value) => {
        if (active) setStatus(value);
      })
      .catch((err) => {
        if (active) setError(errorText(err, "Could not check this gift."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [receipt, tick]);
  async function recover() {
    if (
      loading ||
      pendingRecovery.current ||
      (status?.state !== "pending" && status?.state !== "verifying")
    )
      return;
    pendingRecovery.current = true;
    setLoading(true);
    setError("");
    try {
      const next = await recoverGuestGift(receipt);
      if (mounted.current) setStatus(next);
    } catch (err) {
      if (mounted.current)
        setError(
          errorText(err, "Could not recover this checkout. Check its status again.")
        );
    } finally {
      pendingRecovery.current = false;
      if (mounted.current) setLoading(false);
    }
  }
  async function fresh() {
    try {
      await clearGuestGiftReceipt(receipt);
      onNew();
    } catch (err) {
      setError(errorText(err, "Could not clear the completed receipt."));
    }
  }
  return (
    <View style={styles.block}>
      <Text accessibilityRole="header" style={[styles.heading, { color: palette.text }]}>
        Your gift checkout
      </Text>
      <Text accessibilityLiveRegion="polite" style={{ color: palette.text }}>
        {loading
          ? "Checking the payment…"
          : status
            ? statusMessages[status.state]
            : error}
      </Text>
      {(status?.state === "pending" || status?.state === "verifying") && (
        <Action label="Retry the same checkout" disabled={loading} pressed={recover} />
      )}
      {status?.checkoutUrl && (
        <Action
          label="Resume the same Stripe checkout"
          pressed={() => {
            void openCheckout(status.checkoutUrl!).catch(() =>
              setError("Stripe checkout could not open.")
            );
          }}
        />
      )}
      {status?.state === "not_created" && status.canStartNewAttempt && (
        <Action label="Review this gift again" pressed={onRetry} />
      )}
      {status?.state === "support" && (
        <>
          <Text selectable style={{ color: palette.text }}>
            Gift reference {receipt.checkoutAttemptId}
          </Text>
          <Action
            label="Contact support"
            pressed={() => router.push("/contact" as any)}
          />
        </>
      )}
      {status?.canStartNewAttempt &&
        (status.state === "settled" || status.state === "expired") && (
          <Action label="Start a different gift" pressed={fresh} />
        )}
      {Boolean(error) && status && (
        <Text accessibilityRole="alert" style={{ color: palette.text }}>
          {error}
        </Text>
      )}
      <Action
        label="Check gift status"
        pressed={() => setTick((i) => i + 1)}
        disabled={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 10, paddingVertical: 12 },
  heading: { fontSize: 22, fontWeight: "800" },
  disclosure: { minHeight: 44, justifyContent: "center" },
  action: { alignItems: "center", padding: 14, borderRadius: 10, minHeight: 44 },
  input: { borderWidth: 1, borderRadius: 8, minHeight: 44, padding: 10 }
});
