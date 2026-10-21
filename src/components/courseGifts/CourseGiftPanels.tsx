import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import AppCard from "@/components/layout/AppCard";
import PrimaryButton from "@/components/PrimaryButton";
import { useAppTheme } from "@/theme/appTheme";
import {
  boundBuyerStatus,
  boundClaimResult,
  buyerGiftMessage,
  giftClaimDeadline,
  giftClaimTiming,
  maskedGiftRecipient,
  normalizedGiftEmail,
  recipientGiftMessage,
  usableGiftQuote,
  type GiftBuyerStatus,
  type GiftCheckoutRequest,
  type GiftClaimResult,
  type GiftQuote,
  type GiftRecipientState
} from "./courseGiftPresentation";

/** The public entry is deliberately closed, including on native and for Admins.
 * No env, query parameter or capability prop can activate these unfinished panels.
 * This module is unmounted: production routes, auth return, private metadata and
 * API/readiness adapters need their own reviewed slice before any public use.
 */
export default function CourseGiftEntry() {
  return null;
}

type BuyerProps = {
  // Must change for account/session/course/authority changes. Not a credential.
  scopeKey: string;
  availability: "ready" | "loading" | "sign_in" | "verify_email" | "unavailable";
  quote: GiftQuote | null;
  onCheckout: (request: GiftCheckoutRequest) => Promise<GiftBuyerStatus>;
  onRefresh: (attemptId: string) => Promise<GiftBuyerStatus>;
  reviewedRecipient?: string;
  onEditRecipient?: () => void;
  onOpenCheckout?: () => Promise<void>;
};

export function CourseGiftBuyerPanel(props: BuyerProps) {
  // Quote/terms changes invalidate consent and any old async completion immediately.
  return (
    <BuyerPanel
      key={JSON.stringify([
        props.scopeKey,
        props.availability,
        props.quote,
        props.reviewedRecipient
      ])}
      {...props}
    />
  );
}

function BuyerPanel({
  scopeKey,
  availability,
  quote,
  onCheckout,
  onRefresh,
  reviewedRecipient,
  onEditRecipient,
  onOpenCheckout
}: BuyerProps) {
  const { palette } = useAppTheme();
  const [email, setEmail] = useState(reviewedRecipient || "");
  const [reviewing, setReviewing] = useState(Boolean(reviewedRecipient));
  const [accepted, setAccepted] = useState(false);
  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState<GiftBuyerStatus | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const active = useRef(true);
  const inFlight = useRef(false);
  const attempted = useRef(false);
  const boundGiftId = useRef("");
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  if (!scopeKey || availability !== "ready" || !usableGiftQuote(quote)) {
    const notice =
      availability === "loading"
        ? "Checking course gift availability."
        : availability === "sign_in"
          ? "Sign in before reviewing a course gift."
          : availability === "verify_email"
            ? "Verify your email before reviewing a course gift."
            : "Course gifting is not available here.";
    return (
      <AppCard title="Course gift">
        <Text style={{ color: palette.text }}>{notice}</Text>
      </AppCard>
    );
  }
  const validQuote = quote;
  const recipient = normalizedGiftEmail(email);

  async function submit(refresh: boolean) {
    if (
      inFlight.current ||
      (!refresh && (!reviewing || !accepted || !recipient || attempted.current))
    )
      return;
    if (refresh && !attempted.current) return;
    inFlight.current = true;
    attempted.current = true;
    setStarted(true);
    setBusy(true);
    setMessage("");
    try {
      const result = refresh
        ? await onRefresh(validQuote.checkoutAttemptId)
        : await onCheckout({
            courseId: validQuote.courseId,
            checkoutAttemptId: validQuote.checkoutAttemptId,
            recipientEmail: recipient,
            policyVersion: validQuote.terms.version
          });
      if (!active.current) return;
      if (
        !boundBuyerStatus(result, validQuote.checkoutAttemptId) ||
        (boundGiftId.current && result.giftId !== boundGiftId.current)
      )
        throw new Error("Unbound status");
      boundGiftId.current = result.giftId;
      setStatus(result);
    } catch {
      if (active.current) {
        setStatus(null);
        setMessage(
          "We could not confirm this attempt. Check its status; do not start another payment."
        );
      }
    } finally {
      if (active.current) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  }

  return (
    <AppCard title="Give one course" titleLevel={2}>
      <View style={styles.stack}>
        <Text style={{ color: palette.text }}>{quote.title}</Text>
        <Text style={{ color: palette.text }}>
          One course: USD {(quote.amountCents / 100).toFixed(2)}
        </Text>
        <Text style={{ color: palette.textMuted }}>
          You’re buying this course for the email address shown. The recipient must sign
          in with that verified address and claim it. This does not enroll you or change
          either person’s subscription, AI credits, or access to other features.
        </Text>
        <Text style={{ color: palette.textMuted }}>
          For gift support, contact support@growpathai.com.
        </Text>
        {!started && !reviewing && (
          <>
            <Text style={{ color: palette.text }}>Recipient email</Text>
            <TextInput
              accessibilityLabel="Recipient email"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="off"
              maxLength={320}
              value={email}
              onChangeText={setEmail}
              style={[styles.input, { color: palette.text, borderColor: palette.border }]}
            />
            <Text style={{ color: palette.textMuted }}>
              Use their exact email address. Different aliases are not treated as the same
              recipient.
            </Text>
            <PrimaryButton
              title="Review gift"
              textStyle={{ color: palette.accentText }}
              disabled={!recipient}
              onPress={() => {
                if (recipient) {
                  setReviewing(true);
                  setAccepted(false);
                }
              }}
            />
          </>
        )}
        {!started && reviewing && (
          <>
            <Text style={{ color: palette.text }}>Recipient: {recipient}</Text>
            <Text style={{ color: palette.text }}>
              Claim window: {quote.terms.expiry}
            </Text>
            <Text style={{ color: palette.text }}>
              Existing access: {quote.terms.duplicateAccess}
            </Text>
            <Text style={{ color: palette.text }}>
              Course availability: {quote.terms.courseUnavailable}
            </Text>
            {quote.terms.refund && (
              <Text style={{ color: palette.text }}>Refunds: {quote.terms.refund}</Text>
            )}
            <Text style={{ color: palette.text }}>
              Manual review does not limit your right to a refund, cancellation or other
              remedy required by applicable law.
            </Text>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel="I reviewed the recipient and gift terms"
              accessibilityState={{ checked: accepted }}
              aria-checked={accepted}
              onPress={() => setAccepted(!accepted)}
              style={[styles.input, { borderColor: palette.border }]}
            >
              <Text style={{ color: palette.text }}>
                {accepted ? "[x]" : "[ ]"} I reviewed the recipient and gift terms
              </Text>
            </Pressable>
            <PrimaryButton
              title="Continue to checkout"
              textStyle={{ color: palette.accentText }}
              disabled={!accepted}
              onPress={() => void submit(false)}
            />
            <PrimaryButton
              title="Edit recipient"
              textStyle={{ color: palette.accentText }}
              onPress={() => {
                if (onEditRecipient) {
                  onEditRecipient();
                  return;
                }
                setReviewing(false);
                setAccepted(false);
              }}
            />
          </>
        )}
        {started && (
          <>
            <Text accessibilityLiveRegion="polite" style={{ color: palette.text }}>
              {busy
                ? "Checking this gift attempt..."
                : message || (status ? buyerGiftMessage(status) : "Status unavailable.")}
            </Text>
            <PrimaryButton
              title="Check gift payment status"
              textStyle={{ color: palette.accentText }}
              disabled={busy}
              accessibilityState={{ busy }}
              onPress={() => void submit(true)}
            />
            {onOpenCheckout &&
              status &&
              !status.paymentRecorded &&
              ["reserved", "open", "creation_unknown"].includes(
                status.checkoutStatus
              ) && (
                <PrimaryButton
                  title="Open secure checkout"
                  disabled={busy}
                  onPress={() => {
                    if (inFlight.current) return;
                    inFlight.current = true;
                    setBusy(true);
                    setStatus(null);
                    void onOpenCheckout()
                      .catch(() => {
                        if (active.current)
                          setMessage(
                            "Checkout was not confirmed. Check this same payment attempt before continuing."
                          );
                      })
                      .finally(() => {
                        if (active.current) {
                          inFlight.current = false;
                          setBusy(false);
                        }
                      });
                  }}
                />
              )}
          </>
        )}
      </View>
    </AppCard>
  );
}

type RecipientProps = {
  scopeKey: string;
  state: GiftRecipientState;
  // Adapter retains the fragment token privately; neither props nor UI log it.
  onClaim: () => Promise<GiftClaimResult>;
  onRenew?: () => Promise<import("@/api/courseGiftRenewalContract").GiftRenewalResult>;
  onRecheck: () => Promise<GiftRecipientState>;
  onSignIn: () => void;
  onOpenCourse: (courseId: string) => void;
};

export function CourseGiftRecipientPanel(props: RecipientProps) {
  return (
    <RecipientPanel key={JSON.stringify([props.scopeKey, props.state])} {...props} />
  );
}

function RecipientPanel({
  scopeKey,
  state,
  onClaim,
  onRenew,
  onRecheck,
  onSignIn,
  onOpenCourse
}: RecipientProps) {
  const { palette } = useAppTheme();
  const [current, setCurrent] = useState(state);
  const [claimed, setClaimed] = useState(false);
  const [unknown, setUnknown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [renewalStarted, setRenewalStarted] = useState(false);
  const [renewalMessage, setRenewalMessage] = useState("");
  const active = useRef(true);
  const inFlight = useRef(false);
  const claiming = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const usable = Boolean(scopeKey && current.giftId && current.courseId);
  const deadline = giftClaimDeadline(current.claimExpiresAt);
  const inClaimWindow = Number.isFinite(deadline) && deadline > Date.now();
  const canClaim =
    usable &&
    inClaimWindow &&
    !claimed &&
    !unknown &&
    current.code === "COURSE_GIFT_TRANSACTION_REQUIRED";
  const canOpen =
    usable && !unknown && (claimed || current.code === "COURSE_GIFT_ALREADY_CLAIMED");
  const canRenew =
    usable &&
    !claimed &&
    onRenew &&
    current.code === "COURSE_GIFT_LINK_RENEWAL_REQUIRED" &&
    current.claimExpiryMode === "none" &&
    current.inactivityFeeCents === 0 &&
    Number.isFinite(deadline) &&
    !inClaimWindow;
  async function renew() {
    if (!canRenew || inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setRenewalStarted(true);
    try {
      const result = await onRenew!();
      if (!active.current) return;
      if (result.giftId !== current.giftId) throw new Error("Unbound renewal");
      setRenewalMessage(
        ["pending", "sending", "retry", "accepted"].includes(result.deliveryStatus)
          ? "Replacement invitation recorded. This does not confirm inbox delivery or course access. Use the new invitation when it arrives; if it does not, contact support for manual review."
          : "Replacement delivery needs manual review. Do not request another invitation or assume course access."
      );
      setUnknown(false);
    } catch {
      if (active.current) {
        setUnknown(true);
        setRenewalMessage(
          "Replacement could not be confirmed. Retry this same request only. Leaving or reloading loses this recovery; contact support if the new invitation does not arrive."
        );
      }
    } finally {
      if (active.current) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  }

  async function act(claim: boolean) {
    if (
      !usable ||
      inFlight.current ||
      (claim && (!canClaim || claiming.current || deadline <= Date.now()))
    )
      return;
    inFlight.current = true;
    if (claim) claiming.current = true;
    setBusy(true);
    try {
      if (claim) {
        const result = await onClaim();
        if (!active.current) return;
        if (!boundClaimResult(result, current)) throw new Error("Unbound claim");
        setClaimed(true);
      } else {
        const result = await onRecheck();
        if (!active.current) return;
        if (
          !result ||
          result.giftId !== state.giftId ||
          result.courseId !== state.courseId ||
          !result.code
        ) {
          throw new Error("Unbound preview");
        }
        setCurrent(result);
        setClaimed(false);
        claiming.current = false;
      }
      setUnknown(false);
    } catch {
      if (active.current) setUnknown(true);
    } finally {
      if (active.current) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  }

  return (
    <AppCard title="Claim a course gift" titleLevel={2}>
      <View style={styles.stack}>
        {usable && (
          <>
            <Text style={{ color: palette.text }}>{current.courseTitle}</Text>
            <Text style={{ color: palette.text }}>
              Recipient: {maskedGiftRecipient(current.recipient)}
            </Text>
            {Number.isFinite(deadline) && (
              <Text style={{ color: palette.textMuted }}>{giftClaimTiming(current)}</Text>
            )}
          </>
        )}
        <Text accessibilityLiveRegion="polite" style={{ color: palette.text }}>
          {renewalMessage ||
            (!usable
              ? "This gift cannot be checked here. Reopen the original invitation."
              : busy
                ? "Checking course access..."
                : unknown
                  ? "We could not confirm the result. Check this gift again before claiming."
                  : claimed
                    ? "Course gift claimed. Your subscription, AI credits, and access to other features are unchanged."
                    : current.code === "COURSE_GIFT_TRANSACTION_REQUIRED" &&
                        !inClaimWindow
                      ? "The claim window could not be confirmed or has ended. Check this gift again."
                      : recipientGiftMessage(current.code))}
        </Text>
        {usable && current.code === "SIGNED_OUT" && !unknown && (
          <PrimaryButton
            title="Sign in to review gift"
            textStyle={{ color: palette.accentText }}
            disabled={busy}
            onPress={onSignIn}
          />
        )}
        {canClaim && (
          <PrimaryButton
            title="Claim course gift"
            textStyle={{ color: palette.accentText }}
            disabled={busy}
            accessibilityState={{ busy }}
            onPress={() => void act(true)}
          />
        )}
        {canOpen && (
          <PrimaryButton
            title="Open course"
            textStyle={{ color: palette.accentText }}
            disabled={busy}
            onPress={() => onOpenCourse(current.courseId)}
          />
        )}
        {canRenew && (!renewalStarted || unknown) && (
          <PrimaryButton
            title={
              renewalStarted
                ? "Retry same replacement request"
                : "Request replacement invitation"
            }
            disabled={busy}
            accessibilityState={{ busy }}
            onPress={() => void renew()}
          />
        )}
        {usable && !renewalStarted && (
          <PrimaryButton
            title="Check gift again"
            textStyle={{ color: palette.accentText }}
            disabled={busy}
            accessibilityState={{ busy }}
            onPress={() => void act(false)}
          />
        )}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, minHeight: 44 }
});
