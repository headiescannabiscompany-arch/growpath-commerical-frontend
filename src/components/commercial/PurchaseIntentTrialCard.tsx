import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Link } from "expo-router";

import { submitPurchaseIntentTrialResponse } from "@/api/commercialWorkflows";
import { useOptionalAuth } from "@/auth/AuthContext";
import { purchaseIntentConceptById } from "@/config/commerceConceptTrials";
import { type ThemePalette, useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type Intent = "yes" | "maybe" | "no";

function formatPrice(value: unknown, currency: unknown) {
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0) return "the proposed price";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: String(currency || "USD")
    }).format(price);
  } catch {
    return `$${price.toFixed(2)}`;
  }
}

export default function PurchaseIntentTrialCard({ trial }: { trial: any }) {
  const auth = useOptionalAuth();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const concept = purchaseIntentConceptById(trial?.conceptAssetId);
  const trialId = String(trial?.id || trial?._id || "").trim();
  const [selected, setSelected] = useState<Intent | null>(trial?.viewerResponse || null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const inFlightRef = useRef(false);
  const price = formatPrice(trial?.candidatePrice, trial?.priceCurrency);
  const question = String(trial?.question || `Would you buy this hat for ${price}?`);

  async function answer(intent: Intent) {
    if (!trialId || inFlightRef.current) return;
    inFlightRef.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const result = await submitPurchaseIntentTrialResponse(trialId, intent);
      setSelected(result?.response || intent);
      setMessage(
        "Your answer was saved. You can change it any time while the trial is open."
      );
    } catch (err: any) {
      setError(err?.data?.message || err?.message || "Unable to save your answer.");
    } finally {
      inFlightRef.current = false;
      setSaving(false);
    }
  }

  if (!concept || trial?.trialType !== "purchase_intent_concept") return null;

  return (
    <View style={styles.card}>
      <Image
        source={concept.image}
        accessibilityLabel={concept.imageAlt}
        resizeMode="contain"
        style={styles.image}
      />
      <View style={styles.copy}>
        <Text style={styles.eyebrow}>Concept trial · Not for sale</Text>
        <Text accessibilityRole="header" aria-level={3} style={styles.title}>
          {trial?.conceptTitle || concept.title}
        </Text>
        <Text style={styles.question}>{question}</Text>
        <Text style={styles.disclosure}>
          This records purchase interest only. It does not reserve a hat, create an order,
          start checkout, or charge you. Available inventory: 0.
        </Text>
        {auth?.user ? (
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={`Purchase interest for ${trial?.conceptTitle || concept.title}`}
            style={styles.actions}
          >
            {(["yes", "maybe", "no"] as Intent[]).map((intent) => (
              <Pressable
                key={intent}
                accessibilityRole="radio"
                accessibilityLabel={`${intent} — ${question}`}
                accessibilityState={{ checked: selected === intent, disabled: saving }}
                disabled={saving}
                onPress={() => void answer(intent)}
                style={[
                  styles.answer,
                  selected === intent && styles.answerSelected,
                  saving && styles.disabled
                ]}
              >
                <Text style={styles.answerText}>
                  {intent.charAt(0).toUpperCase() + intent.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Link href="/login" asChild>
            <Pressable accessibilityRole="link" style={styles.answer}>
              <Text style={styles.answerText}>Sign in to answer</Text>
            </Pressable>
          </Link>
        )}
        {saving ? (
          <View accessibilityLiveRegion="polite" style={styles.statusRow}>
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.muted}>Saving your answer...</Text>
          </View>
        ) : null}
        {message ? (
          <Text
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            style={styles.success}
          >
            {message}
          </Text>
        ) : null}
        {error ? (
          <Text
            accessibilityLiveRegion="assertive"
            accessibilityRole="alert"
            style={styles.error}
          >
            {error}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    card: {
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 14,
      overflow: "hidden",
      padding: 14
    },
    image: { aspectRatio: 4 / 3, backgroundColor: "#050505", width: "100%" },
    copy: { gap: 10 },
    eyebrow: {
      color: palette.link,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    title: { color: palette.text, fontSize: 20, fontWeight: "900" },
    question: { color: palette.text, fontSize: 18, fontWeight: "800" },
    disclosure: { color: palette.textMuted, fontSize: 14, lineHeight: 20 },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    answer: {
      alignItems: "center",
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      minHeight: 44,
      minWidth: 88,
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 10
    },
    answerSelected: { backgroundColor: palette.accentSoft, borderColor: palette.accent },
    answerText: { color: palette.text, fontSize: 15, fontWeight: "800" },
    disabled: { opacity: 0.6 },
    statusRow: { alignItems: "center", flexDirection: "row", gap: 8 },
    muted: { color: palette.textMuted, fontSize: 13 },
    success: { color: palette.success, fontSize: 14, fontWeight: "700" },
    error: { color: palette.danger, fontSize: 14, fontWeight: "700" }
  });
}
