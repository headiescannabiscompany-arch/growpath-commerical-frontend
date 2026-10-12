import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  type AccountShopperContinuation,
  consumeAccountShopperContinuation,
  readAccountShopperContinuation
} from "@/api/shopperContinuation";
import {
  parsePublicProductReturnPath,
  parseShopperSignupReturnPath
} from "@/utils/authReturnPath";
import { useAppTheme } from "@/theme/appTheme";

// The parent keys this component by the settled account/session and route intent.
// This action returns to browsing only; it never activates a plan or purchases anything.
export default function ShopperReturnAction({
  sessionToken,
  plan,
  directPath
}: {
  sessionToken: string;
  plan: string;
  directPath?: string;
}) {
  const router = useRouter();
  const { palette } = useAppTheme();
  const [record, setRecord] = useState<AccountShopperContinuation | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const active = useRef(true);
  const inFlight = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const explicitPath = parseShopperSignupReturnPath(directPath);
  useEffect(() => {
    active.current = true;
    const request = new AbortController();
    controller.current = request;
    if (!explicitPath) {
      void readAccountShopperContinuation(sessionToken, request.signal)
        .then((result) => {
          if (active.current && !request.signal.aborted && result?.plan === plan)
            setRecord(result);
        })
        .catch(() => {
          /* Optional browsing recovery does not block checkout/onboarding. */
        });
    }
    return () => {
      active.current = false;
      request.abort();
      controller.current?.abort();
    };
  }, [sessionToken, plan, explicitPath]);

  async function returnToShopper() {
    if (!active.current || inFlight.current) return;
    if (explicitPath) {
      router.replace(explicitPath as any);
      return;
    }
    if (!record) return;
    inFlight.current = true;
    setBusy(true);
    setMessage("");
    const request = new AbortController();
    controller.current = request;
    try {
      const consumed = await consumeAccountShopperContinuation(
        record,
        sessionToken,
        request.signal
      );
      if (!active.current || request.signal.aborted) return;
      if (consumed) router.replace(consumed.path as any);
      else {
        setRecord(null);
        setMessage(
          "This saved return has expired or was already used. You can keep setting up your account."
        );
      }
    } catch {
      if (active.current && !request.signal.aborted) {
        setRecord(null);
        setMessage(
          "Unable to confirm the saved return. You can keep setting up your account."
        );
      }
    } finally {
      inFlight.current = false;
      if (active.current && !request.signal.aborted) setBusy(false);
    }
  }
  const path = explicitPath || record?.path;
  if (!path && !message) return null;
  const label =
    path && parsePublicProductReturnPath(path) ? "Return to product" : "Return to course";
  return (
    <View>
      {path ? (
        <>
          <Text style={{ color: palette.textMuted }}>
            You can return to browsing without starting checkout.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            disabled={busy}
            onPress={returnToShopper}
            style={{ paddingVertical: 12, opacity: busy ? 0.5 : 1 }}
          >
            <Text style={{ color: palette.link, fontWeight: "900" }}>
              {busy ? "Opening…" : label}
            </Text>
          </Pressable>
        </>
      ) : null}
      {message ? (
        <Text accessibilityRole="alert" style={{ color: palette.textMuted }}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}
