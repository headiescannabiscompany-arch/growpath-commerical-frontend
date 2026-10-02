import React, { useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { useAppTheme } from "@/theme/appTheme";

/** Readiness and state isolation only; current API authorization still decides access. */
export default function VideoReadinessBoundary({
  children,
  detail = false
}: {
  children: React.ReactNode;
  detail?: boolean;
}) {
  const auth = useAuth();
  const access = useEntitlements();
  const { palette } = useAppTheme();
  const retryPending = useRef(false);
  const [retrying, setRetrying] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);
  const unresolved = auth.isHydrating || access.ready === false;
  const failed = !auth.isHydrating && unresolved && Boolean(access.bootstrapError);

  async function retryAccess() {
    if (retryPending.current) return;
    retryPending.current = true;
    setRetrying(true);
    setRetryFailed(false);
    try {
      await auth.retryMe();
    } catch {
      setRetryFailed(true);
    } finally {
      retryPending.current = false;
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
    <AppPage
      routeKey={detail ? "video-detail" : "videos"}
      backFallbackHref={detail ? "/videos" : undefined}
      header={
        <Text
          accessibilityRole="header"
          aria-level={1}
          style={{ color: palette.text, fontSize: 28, fontWeight: "900" }}
        >
          {detail ? "Video" : "Videos"}
        </Text>
      }
    >
      <AppCard>
        <Text style={{ color: palette.text }}>
          {failed ? "Video access check unavailable" : "Checking video access"}
        </Text>
        {failed ? (
          <>
            <Text style={{ color: palette.textMuted }}>
              {retryFailed
                ? "The check failed. Please try again."
                : "Your access could not be checked. This does not mean access was denied."}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry video access"
              disabled={retrying}
              accessibilityState={{ disabled: retrying }}
              onPress={() => void retryAccess()}
              style={{
                padding: 12,
                backgroundColor: palette.accent,
                borderRadius: 8,
                alignSelf: "flex-start"
              }}
            >
              <Text style={{ color: palette.accentText }}>
                {retrying ? "Checking…" : "Retry"}
              </Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator
            accessibilityLabel="Checking video access"
            color={palette.accent}
          />
        )}
      </AppCard>
    </AppPage>
  );
}
