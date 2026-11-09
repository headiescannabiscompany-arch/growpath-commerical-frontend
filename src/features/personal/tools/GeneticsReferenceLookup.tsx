import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ApiError, apiRequest } from "@/api/apiRequest";
import { useAuth } from "@/auth/AuthContext";
import { useAppTheme } from "@/theme/appTheme";

const referenceId = "research:stack-2023-carmagnola-uso31-f2";

type Reference = {
  id: string;
  name: string;
  scope: string;
  sourceUrl: string;
  sourceAttribution: string;
  licenseName: string;
  licenseUrl: string;
  adaptation: string;
  parentLabels: string[];
};

export default function GeneticsReferenceLookup() {
  const { isHydrating, meStatus, user } = useAuth();
  if (
    process.env.EXPO_PUBLIC_GENETICS_REFERENCE_LOOKUP_ENABLED !== "true" ||
    isHydrating ||
    meStatus !== "ready" ||
    !user?.id ||
    user.emailVerified !== true ||
    user.cannabisEligible !== true ||
    user.cannabisVisibility !== "show" ||
    user.parentalLockEnabled !== false
  ) {
    return null;
  }

  return <ReferencePreview key={user.id} />;
}

function ReferencePreview() {
  const { palette } = useAppTheme();
  const [reference, setReference] = useState<Reference | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "unavailable">("idle");
  const pending = useRef<AbortController | null>(null);

  useEffect(() => () => pending.current?.abort(), []);

  async function showReference() {
    if (pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setStatus("loading");

    try {
      const response = await apiRequest<{ reference: Reference }>(
        `/api/tools/genetics-inventory/reference/${encodeURIComponent(referenceId)}`,
        {
          signal: controller.signal,
          cache: "no-store",
          notifyTransport: false,
          notifyTokenBalance: false
        }
      );
      if (controller.signal.aborted) return;
      if (response.reference?.id !== referenceId) throw new Error("Reference mismatch");
      setReference(response.reference);
      setStatus("idle");
    } catch (error) {
      if (controller.signal.aborted) return;
      const unavailable =
        error instanceof ApiError && [401, 403, 404].includes(error.status ?? 0);
      setStatus(unavailable ? "unavailable" : "error");
    } finally {
      pending.current = null;
    }
  }

  return (
    <View style={[styles.card, { borderColor: palette.border }]}>
      <Text accessibilityRole="header" style={[styles.label, { color: palette.text }]}>
        Lineage reference
      </Text>
      {reference ? (
        <>
          <Text style={{ color: palette.textMuted }}>
            Copy the citation into Provenance and verification notes if relevant.
            Verify your own plant’s seed or clone records separately.
          </Text>
          <Text selectable style={{ color: palette.text }}>
            {[
              reference.name,
              reference.scope,
              `Reference ${reference.id}`,
              `Experimental parent labels: ${reference.parentLabels.join(" and ")}`,
              reference.sourceAttribution,
              reference.sourceUrl,
              `${reference.licenseName} · ${reference.licenseUrl}`,
              reference.adaptation
            ].join("\n")}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setReference(null)}
            style={styles.action}
          >
            <Text style={[styles.label, { color: palette.text }]}>Close reference</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={{ color: palette.textMuted }}>
            Preview a published example of a documented cross.
          </Text>
          {status !== "unavailable" && (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: status === "loading", disabled: status === "loading" }}
              disabled={status === "loading"}
              onPress={() => void showReference()}
              style={styles.action}
            >
              <Text style={[styles.label, { color: palette.text }]}>
                {status === "loading"
                  ? "Loading reference…"
                  : status === "error"
                    ? "Retry lookup"
                    : "Show research reference"}
              </Text>
            </Pressable>
          )}
          {status === "error" || status === "unavailable" ? (
            <Text accessibilityLiveRegion="polite" style={{ color: palette.text }}>
              {status === "error"
                ? "Couldn’t load the reference. Try again."
                : "The reference is currently unavailable."}
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, borderWidth: 1, borderRadius: 8, gap: 8 },
  action: { minHeight: 44, justifyContent: "center" },
  label: { fontWeight: "700" }
});
