import React, { useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useAuth } from "@/auth/AuthContext";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useEntitlements } from "@/entitlements";
import { useAppTheme } from "@/theme/appTheme";

/** Resolve access before mounting readers; this never grants a capability. */
export default function ForumReadinessBoundary({
  children,
  showBack = false
}: {
  children: React.ReactNode;
  showBack?: boolean;
}) {
  const auth = useAuth();
  const access = useEntitlements();
  const { palette } = useAppTheme();
  const pending = useRef(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState(false);
  const unresolved = auth.isHydrating || access.ready === false;
  const failed = !auth.isHydrating && unresolved && Boolean(access.bootstrapError);

  async function retry() {
    if (pending.current) return;
    pending.current = true;
    setRetrying(true);
    setRetryError(false);
    try {
      await auth.retryMe();
    } catch {
      setRetryError(true);
    } finally {
      pending.current = false;
      setRetrying(false);
    }
  }

  if (!unresolved) {
    const scope = JSON.stringify([
      auth.user?.id || auth.user?._id || "",
      auth.token,
      auth.isAuthed,
      access.mode,
      access.facilityId
    ]);
    return <React.Fragment key={scope}>{children}</React.Fragment>;
  }

  return (
    <ScreenBoundary showBack={showBack} backFallbackHref="/forum">
      <View style={{ padding: 16, gap: 12 }}>
        <Text
          accessibilityRole="header"
          aria-level={1}
          style={{ color: palette.text, fontSize: 22, fontWeight: "800" }}
        >
          {failed ? "Forum access check unavailable" : "Checking Forum access"}
        </Text>
        {failed ? (
          <>
            <Text style={{ color: palette.textMuted }}>
              Your access could not be checked. This does not mean access was denied.
            </Text>
            {retryError ? (
              <Text style={{ color: palette.textMuted }}>
                The check failed. Please try again.
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry Forum access"
              disabled={retrying}
              accessibilityState={{ disabled: retrying }}
              onPress={() => void retry()}
              style={{
                alignSelf: "flex-start",
                padding: 12,
                borderRadius: 8,
                backgroundColor: palette.accent
              }}
            >
              <Text style={{ color: palette.accentText }}>
                {retrying ? "Checking…" : "Retry"}
              </Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator
            accessibilityLabel="Checking Forum access"
            color={palette.accent}
          />
        )}
      </View>
    </ScreenBoundary>
  );
}
