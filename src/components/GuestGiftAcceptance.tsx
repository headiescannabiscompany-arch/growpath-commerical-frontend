import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { ApiError } from "@/api/apiRequest";
import { acceptGuestGift, type GuestGiftKind } from "@/api/guestGiftAcceptance";
import { useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { finishGuestClaimContinuation } from "@/utils/complimentaryClaimTokenStore";

type Props = {
  kind: GuestGiftKind;
  token: string;
  claimPath: string;
  afterPaidPeriod?: boolean;
  onAcceptForInvitedAddress?: () => void;
};

export default function GuestGiftAcceptance({
  kind,
  token,
  claimPath,
  afterPaidPeriod,
  onAcceptForInvitedAddress
}: Props) {
  const { palette } = useAppTheme();
  const router = useRouter();
  const [status, setStatus] = useState<"ready" | "sending" | "accepted" | "unavailable">(
    "ready"
  );
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function accept() {
    if (inFlight.current || status !== "ready") return;
    inFlight.current = true;
    setStatus("sending");
    setError("");
    try {
      await acceptGuestGift(kind, token);
      if (!mounted.current) return;
      if (kind === "complimentary") finishGuestClaimContinuation(token);
      setStatus("accepted");
      onAcceptForInvitedAddress?.();
    } catch (cause) {
      if (!mounted.current) return;
      if (
        cause instanceof ApiError &&
        [
          "COMPLIMENTARY_CLAIM_INVALID",
          "COMPLIMENTARY_ALREADY_CLAIMED",
          "GIFT_CLAIM_INVALID",
          "GIFT_ALREADY_CLAIMED"
        ].includes(cause.code)
      ) {
        setStatus("unavailable");
        setError(
          "This invitation is no longer available. If you already accepted it, you can sign in to check your access."
        );
      } else {
        setStatus("ready");
        setError("We couldn’t confirm your acceptance. You can safely try again.");
      }
    } finally {
      inFlight.current = false;
    }
  }

  const acceptLabel = onAcceptForInvitedAddress
    ? "Accept for the invited address"
    : "Accept my gift";
  const accepted = status === "accepted";
  const ordinaryAccount = accepted || status === "unavailable";
  const button = {
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: "center" as const,
    borderRadius: radius.card
  };
  return (
    <View style={{ gap: 10 }}>
      {status === "ready" && !error ? (
        <Text style={{ color: palette.text }}>
          {onAcceptForInvitedAddress
            ? "This accepts the invitation for its recipient and keeps your current account open."
            : "You can accept now and set up your account later."}
        </Text>
      ) : null}
      {accepted ? (
        <View accessibilityLiveRegion="polite" style={{ gap: 6 }}>
          <Text style={{ color: palette.success, fontWeight: "700" }}>
            Gift accepted for the invited email address.
          </Text>
          <Text style={{ color: palette.text }}>
            {afterPaidPeriod
              ? "The invited account’s paid subscription and renewal settings stay as they are. Its owner can review renewal in Billing and reopen this invitation to schedule the gift."
              : "Eligible access can start automatically for a verified account. New to GrowPathAI? Create a free account with the invited email address and verify it."}
          </Text>
        </View>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={{ color: palette.danger }}>
          {error}
        </Text>
      ) : null}
      {!ordinaryAccount ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={acceptLabel}
          disabled={status === "sending"}
          onPress={accept}
          style={[button, { backgroundColor: palette.accent }]}
        >
          <Text style={{ color: palette.accentText, fontWeight: "700" }}>
            {status === "sending" ? "Accepting…" : acceptLabel}
          </Text>
        </Pressable>
      ) : null}
      {status !== "sending" && !onAcceptForInvitedAddress ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {status !== "unavailable" ? (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.push({
                  pathname: "/register",
                  params: ordinaryAccount ? { plan: "free" } : { next: claimPath }
                } as any)
              }
              style={button}
            >
              <Text style={{ color: palette.link }}>Create a free account</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push(
                ordinaryAccount
                  ? "/login"
                  : ({ pathname: "/login", params: { next: claimPath } } as any)
              )
            }
            style={button}
          >
            <Text style={{ color: palette.link }}>Sign in</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
