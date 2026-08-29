import { Link } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { submitProductPurchaseIntent } from "@/api/products";
import { useOptionalAuth } from "@/auth/AuthContext";
import { type ThemePalette, useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type Intent = "yes" | "maybe" | "no";

export default function ProductPurchaseIntentControl({
  product,
  compact = false
}: {
  product: any;
  compact?: boolean;
}) {
  const auth = useOptionalAuth();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const productId = String(product?.id || product?._id || "").trim();
  const target = Number(product?.purchaseIntentTarget || 25);
  const initialSummary = product?.purchaseIntentSummary || {
    yes: 0,
    maybe: 0,
    no: 0,
    total: 0
  };
  const [summary, setSummary] = useState(initialSummary);
  const [selected, setSelected] = useState<Intent | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  async function answer(intent: Intent) {
    if (!productId || inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const result = await submitProductPurchaseIntent(productId, intent);
      setSelected(result?.response || intent);
      if (result?.summary) setSummary(result.summary);
      setMessage("Saved — you can change your answer while interest is open.");
    } catch (err: any) {
      setError(err?.data?.message || err?.message || "Unable to save your answer.");
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  if (!product?.purchaseIntentEnabled) return null;

  return (
    <View style={[styles.panel, compact && styles.compactPanel]}>
      <Text style={styles.eyebrow}>25-customer production goal</Text>
      {!compact ? (
        <Text style={styles.disclosure}>
          Would you buy this hat at the displayed price when it becomes available? This
          records interest only. It does not reserve a hat, create an order, start
          checkout, or charge you.
        </Text>
      ) : (
        <Text style={styles.compactCopy}>Opt in to buy if this design is produced.</Text>
      )}
      <Text style={styles.progress}>
        {Number(summary?.yes || 0)} yes · goal {target}
      </Text>
      {auth?.user ? (
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={`Purchase interest for ${product?.name || "product"}`}
          style={styles.actions}
        >
          {(["yes", "maybe", "no"] as Intent[]).map((intent) => (
            <Pressable
              key={intent}
              accessibilityRole="radio"
              accessibilityLabel={`${intent} — purchase interest for ${product?.name || "product"}`}
              accessibilityState={{ checked: selected === intent, disabled: saving }}
              disabled={saving}
              onPress={() => void answer(intent)}
              style={[
                styles.answer,
                compact && styles.compactAnswer,
                selected === intent && styles.selected,
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
            <Text style={styles.answerText}>Sign in to opt in</Text>
          </Pressable>
        </Link>
      )}
      {saving ? (
        <ActivityIndicator accessibilityLabel="Saving interest" color={palette.accent} />
      ) : null}
      {message ? (
        <Text accessibilityLiveRegion="polite" style={styles.success}>
          {message}
        </Text>
      ) : null}
      {error ? (
        <Text accessibilityLiveRegion="assertive" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    panel: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 9,
      padding: 14
    },
    compactPanel: { borderWidth: 0, borderTopWidth: 1, borderRadius: 0, padding: 10 },
    eyebrow: {
      color: palette.link,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    disclosure: { color: palette.textMuted, fontSize: 14, lineHeight: 20 },
    compactCopy: { color: palette.textMuted, fontSize: 12, lineHeight: 17 },
    progress: { color: palette.text, fontSize: 13, fontWeight: "800" },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    answer: {
      alignItems: "center",
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 42,
      minWidth: 76,
      paddingHorizontal: 13,
      paddingVertical: 8
    },
    compactAnswer: {
      minHeight: 36,
      minWidth: 66,
      paddingHorizontal: 9,
      paddingVertical: 6
    },
    selected: { backgroundColor: palette.surface, borderColor: palette.accent },
    answerText: { color: palette.text, fontSize: 13, fontWeight: "800" },
    disabled: { opacity: 0.6 },
    success: { color: palette.success, fontSize: 12, fontWeight: "700" },
    error: { color: palette.danger, fontSize: 12, fontWeight: "700" }
  });
}
