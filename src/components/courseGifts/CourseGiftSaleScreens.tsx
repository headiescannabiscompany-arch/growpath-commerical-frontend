import React, { useEffect, useRef, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import AppCard from "@/components/layout/AppCard";
import PrimaryButton from "@/components/PrimaryButton";
import { useAppTheme } from "@/theme/appTheme";
import { createInternalCourseGiftHttpClient } from "@/api/courseGiftHttp";
import { createInternalCourseGiftSaleSession } from "@/utils/courseGiftSaleSession";
import type { CreatorGiftReview, GiftSaleQuote } from "@/api/courseGiftSaleContract";
import {
  buyerGiftMessage,
  normalizedGiftEmail,
  type GiftBuyerStatus
} from "./courseGiftPresentation";
import { CourseGiftBuyerPanel } from "./CourseGiftPanels";

type Session = ReturnType<typeof createInternalCourseGiftSaleSession>;
type ClientOptions = Parameters<typeof createInternalCourseGiftHttpClient>[0];
export function createInternalCourseGiftSaleHttpSession(
  options: ClientOptions & {
    courseId: string;
    attemptId: string;
    newRequestId: () => string;
  }
) {
  const client = createInternalCourseGiftHttpClient(options);
  return createInternalCourseGiftSaleSession({ ...options, client });
}

// Reached only through the explicit internal boundary; the shipped course outlets
// remain inert. This web-only screen is not an availability/capability flag.
export function InternalCourseGiftSaleScreen(props: {
  mode: "creator" | "buyer";
  session: Session;
  onNavigateToCheckout: (url: string) => void;
}) {
  if (Platform.OS !== "web") return null;
  // The internal authenticated host replaces this session on scope changes.
  // Even if it rerenders with the old object, never keep its private form visible.
  try {
    props.session.assertCurrent();
  } catch {
    return null;
  }
  return (
    <SaleScreen
      key={JSON.stringify([
        props.mode,
        props.session.scope,
        props.session.courseId,
        props.session.attemptId
      ])}
      {...props}
    />
  );
}

function Check({
  label,
  checked,
  disabled,
  onChange
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  const { palette } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked, disabled }}
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onChange}
      style={{
        padding: 12,
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: 8
      }}
    >
      <Text style={{ color: palette.text }}>
        {checked ? "[x]" : "[ ]"} {label}
      </Text>
    </Pressable>
  );
}

function SaleScreen({
  mode,
  session,
  onNavigateToCheckout
}: {
  mode: "creator" | "buyer";
  session: Session;
  onNavigateToCheckout: (url: string) => void;
}) {
  const { palette } = useAppTheme();
  const [creator, setCreator] = useState<CreatorGiftReview | null>(null);
  const [quote, setQuote] = useState<GiftSaleQuote | null>(null);
  const [email, setEmail] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [revoke, setRevoke] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [recovery, setRecovery] = useState(() => session.recovery());
  const [retrying, setRetrying] = useState(false);
  const [buyerStatus, setBuyerStatus] = useState<GiftBuyerStatus | null>(null);
  const alive = useRef(true),
    flight = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const current = () => {
    session.assertCurrent();
    if (!alive.current) throw new Error("Inactive gift screen");
  };
  async function act(work: () => Promise<void>) {
    if (flight.current) return;
    flight.current = true;
    setBusy(true);
    setMessage("");
    try {
      current();
      await work();
    } catch {
      if (alive.current)
        setMessage(
          "We could not confirm the result. Review the current state before trying again. No plan or credits were changed."
        );
    } finally {
      if (alive.current) {
        flight.current = false;
        setBusy(false);
        try {
          setRecovery(session.recovery());
        } catch {
          /* Host removes stale form. */
        }
      }
    }
  }
  const body = { color: palette.text };
  return (
    <View style={{ gap: 16 }}>
      <AppCard
        title={mode === "creator" ? "Course gift permissions" : "Review a course gift"}
        titleLevel={2}
      >
        <View style={{ gap: 12 }}>
          <Text style={body}>
            Course gifting is not released. These controls are prepared for internal
            checks only.
          </Text>
          {mode === "creator" ? (
            <>
              {recovery.creatorPending && (
                <Text style={body}>
                  A consent save needs confirmation. Review current terms, then explicitly
                  retry the same saved request. Reloading never opts you in.
                </Text>
              )}
              {recovery.creatorPending && !session.reloadSaved() && (
                <Text style={body}>
                  Reload recovery was not saved. Keep this page open; do not start a new
                  consent request.
                </Text>
              )}
              {recovery.creatorBlocked && (
                <Text style={body}>
                  Saved recovery is expired or unavailable. You can review current
                  permission, but need support to resolve this attempt before another
                  consent change.
                </Text>
              )}
              <Text style={body}>
                Your permission applies to this course only. It does not enable live
                payments, connect payouts or change your subscription, AI credits, or
                access to other features.
              </Text>
              <PrimaryButton
                title="Review current gift permission"
                disabled={busy}
                onPress={() =>
                  void act(async () => {
                    setCreator(null);
                    setAccepted(false);
                    setRevoke(false);
                    const result = await session.reviewCreator();
                    current();
                    setCreator(result);
                  })
                }
              />
              {creator && (
                <>
                  <Text style={body}>
                    {creator.consent?.enabled
                      ? creator.matchesPolicy
                        ? "Your saved consent matches the current terms. Payment readiness is checked separately."
                        : "Saved consent exists, but does not match current approved terms. You can still revoke it."
                      : "No active gift consent is saved for this course."}
                  </Text>
                  {creator.policy ? (
                    <>
                      <Text style={body}>Terms version: {creator.policy.version}</Text>
                      <Text style={body}>{creator.policy.creatorTermsText}</Text>
                    </>
                  ) : (
                    <Text style={body}>
                      Approved gift terms are unavailable. New consent cannot be saved.
                    </Text>
                  )}
                  {creator.canAccept &&
                    (!creator.matchesPolicy || recovery.creatorPending) && (
                      <>
                        <Check
                          label="I agree to these gift terms for this course"
                          checked={accepted}
                          disabled={busy}
                          onChange={() => setAccepted(!accepted)}
                        />
                        <PrimaryButton
                          title={
                            recovery.creatorPending
                              ? "Retry same consent request"
                              : "Save gift consent"
                          }
                          disabled={busy || !accepted}
                          onPress={() =>
                            void act(async () => {
                              setCreator(null);
                              setAccepted(false);
                              setRevoke(false);
                              let result;
                              try {
                                result = await session.acceptCreator(accepted);
                              } finally {
                                if (alive.current && !session.reloadSaved())
                                  setMessage(
                                    "Reload recovery was not saved. Keep this page open and review the same consent request."
                                  );
                              }
                              current();
                              setMessage(
                                result.enabled
                                  ? "Consent saved. Review current permission to see its status. Live gifting remains disabled."
                                  : "This saved attempt is no longer active. Review current permission; it was not re-enabled."
                              );
                            })
                          }
                        />
                      </>
                    )}
                  {creator.consent?.enabled &&
                    !recovery.creatorPending &&
                    !recovery.creatorBlocked && (
                      <>
                        <Text style={body}>
                          Withdrawing gift consent stops new eligible gift sales. It does
                          not erase existing payments, delivery obligations, recipient
                          rights or financial records.
                        </Text>
                        <Check
                          label="I want to revoke gift consent for this course"
                          checked={revoke}
                          disabled={busy}
                          onChange={() => setRevoke(!revoke)}
                        />
                        <PrimaryButton
                          title="Revoke gift consent"
                          disabled={busy || !revoke}
                          onPress={() =>
                            void act(async () => {
                              setCreator(null);
                              setAccepted(false);
                              setRevoke(false);
                              await session.revokeCreator(revoke);
                              current();
                              setMessage(
                                "Consent revoked. Unpaid gift checkout links are queued to close. This does not refund existing payments or remove learner access."
                              );
                            })
                          }
                        />
                      </>
                    )}
                </>
              )}
            </>
          ) : (
            !quote &&
            (!recovery.buyerPending || (retrying && recovery.canReviewRetry)) && (
              <>
                <Text style={body}>
                  {retrying
                    ? "Re-enter the original recipient. Only an unchanged server review can retry the original reservation. A failed status read does not prove no payment exists."
                    : "Enter the recipient to request the current price and approved terms. Reviewing does not reserve, pay or enroll anyone."}
                </Text>
                <TextInput
                  accessibilityLabel="Gift recipient email"
                  value={email}
                  editable={!busy}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  keyboardType="email-address"
                  maxLength={320}
                  style={{
                    color: palette.text,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: palette.border
                  }}
                />
                <PrimaryButton
                  title={
                    retrying
                      ? "Review original recipient for retry"
                      : "Get current gift review"
                  }
                  disabled={busy || !normalizedGiftEmail(email)}
                  onPress={() =>
                    void act(async () => {
                      const result = await session.reviewBuyer(email);
                      current();
                      setQuote(result);
                    })
                  }
                />
              </>
            )
          )}
          <Text style={body}>For gift support, contact support@growpathai.com.</Text>
          {message ? (
            <Text accessibilityLiveRegion="polite" style={body}>
              {message}
            </Text>
          ) : null}
        </View>
      </AppCard>
      {mode === "buyer" && recovery.buyerPending && !quote && (
        <AppCard title="Recover this gift attempt" titleLevel={2}>
          <View testID="course-gift-recovery-content" style={{ gap: 12 }}>
            <Text style={body}>
              {buyerStatus
                ? buyerGiftMessage(buyerStatus)
                : "Check the original attempt. Reloading does not reserve, pay or enroll anyone."}
            </Text>
            {recovery.buyerBlocked && (
              <Text style={body}>
                Recovery details are expired or unavailable. Check status if possible; do
                not start another payment. Contact support if this cannot be resolved.
              </Text>
            )}
            <PrimaryButton
              title="Check gift payment status"
              disabled={busy}
              onPress={() =>
                void act(async () => {
                  setBuyerStatus(null);
                  setRetrying(false);
                  const result = await session.readBuyerStatus();
                  current();
                  setBuyerStatus(result);
                })
              }
            />
            {recovery.canReviewRetry && !retrying && (
              <PrimaryButton
                title="Review same reservation for retry"
                disabled={busy}
                onPress={() => {
                  setEmail("");
                  setRetrying(true);
                  setBuyerStatus(null);
                }}
              />
            )}
            {buyerStatus &&
              !buyerStatus.paymentRecorded &&
              ["reserved", "open", "creation_unknown"].includes(
                buyerStatus.checkoutStatus
              ) && (
                <PrimaryButton
                  title="Open secure checkout"
                  disabled={busy}
                  onPress={() =>
                    void act(async () => {
                      setBuyerStatus(null);
                      const url = await session.openCheckout();
                      current();
                      onNavigateToCheckout(url);
                    })
                  }
                />
              )}
          </View>
        </AppCard>
      )}
      {mode === "buyer" && quote && (
        <CourseGiftBuyerPanel
          scopeKey={session.scope}
          availability="ready"
          quote={quote}
          reviewedRecipient={quote.recipientEmail}
          onEditRecipient={() => {
            setQuote(null);
            setMessage("");
          }}
          onCheckout={async (request) => {
            current();
            try {
              const result = await session.reserveBuyer(request);
              current();
              setBuyerStatus(result);
              return result;
            } finally {
              if (alive.current) {
                setQuote(null);
                setRetrying(false);
                try {
                  setRecovery(session.recovery());
                } catch {
                  /* Unmounted by host. */
                }
                if (!session.reloadSaved())
                  setMessage(
                    "Reload recovery was not saved. Keep this page open and check the same attempt; do not start another gift payment."
                  );
              }
            }
          }}
          onRefresh={() => {
            current();
            return session.readBuyerStatus();
          }}
          onOpenCheckout={async () => {
            current();
            const url = await session.openCheckout();
            current();
            onNavigateToCheckout(url);
          }}
        />
      )}
    </View>
  );
}
