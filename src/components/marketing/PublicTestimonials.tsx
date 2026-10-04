import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { getPublicTestimonials, type PublicTestimonial } from "@/api/testimonials";
import { useAppTheme } from "@/theme/appTheme";

/** Intentionally dynamic: approved testimonials are never copied into a static export. */
export default function PublicTestimonials() {
  const { palette } = useAppTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        section: { gap: 12 },
        heading: { color: palette.text, fontSize: 22, fontWeight: "700" },
        card: {
          backgroundColor: palette.card,
          borderColor: palette.border,
          borderWidth: 1,
          borderRadius: 12,
          padding: 16,
          gap: 12
        },
        text: { color: palette.textMuted, fontSize: 16, lineHeight: 24 },
        name: { color: palette.text, fontSize: 16, fontWeight: "700" },
        button: {
          borderColor: palette.border,
          borderWidth: 1,
          borderRadius: 8,
          minHeight: 44,
          padding: 12
        }
      }),
    [palette]
  );
  const [rows, setRows] = useState<PublicTestimonial[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const mounted = useRef(false);
  const operation = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const load = useCallback(async () => {
    if (!mounted.current || operation.current) return;
    const controller = new AbortController();
    operation.current = controller;
    const request = ++generation.current;
    setRows([]);
    setBusy(true);
    setFailed(false);
    try {
      const result = await getPublicTestimonials(controller.signal);
      if (mounted.current && request === generation.current) setRows(result);
    } catch {
      if (mounted.current && request === generation.current) {
        setRows([]);
        setFailed(true);
      }
    } finally {
      if (operation.current === controller) operation.current = null;
      if (mounted.current && request === generation.current) setBusy(false);
    }
  }, []);
  const invalidateRead = useCallback(() => {
    generation.current++;
    operation.current?.abort();
    operation.current = null;
  }, []);
  useEffect(() => {
    mounted.current = true;
    void load();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void load();
      else {
        invalidateRead();
        setRows([]);
        setBusy(false);
      }
    });
    return () => {
      mounted.current = false;
      invalidateRead();
      subscription.remove();
    };
  }, [load, invalidateRead]);
  if (!rows.length && !failed) return null;
  const shownGeneration = generation.current;
  return (
    <View style={styles.section}>
      {rows.length ? (
        <Text accessibilityRole="header" aria-level={2} style={styles.heading}>
          Feedback from growers
        </Text>
      ) : null}
      {failed ? (
        <Text style={styles.text}>Feedback is temporarily unavailable.</Text>
      ) : null}
      {rows.map((row) => (
        <View key={row.publicId} style={styles.card}>
          <Text style={styles.text}>{row.quote}</Text>
          <Text style={styles.name}>{row.publicName}</Text>
          {row.photo ? (
            <Image
              source={{ uri: row.photo.url }}
              accessibilityLabel={row.photo.alt}
              alt={row.photo.alt}
              style={{ width: 180, height: 180, maxWidth: "100%" }}
              resizeMode="contain"
              onError={() => {
                if (!mounted.current || shownGeneration !== generation.current) return;
                // A denied/deleted photo may reflect withdrawn eligibility. Hide the entire quote,
                // not just its photo, and require a fresh public-list read rather than stale proof.
                generation.current++;
                setRows([]);
                setFailed(true);
              }}
            />
          ) : null}
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Refresh public feedback"
        disabled={busy}
        onPress={() => void load()}
        style={styles.button}
      >
        <Text style={styles.text}>{failed ? "Retry feedback" : "Refresh feedback"}</Text>
      </Pressable>
    </View>
  );
}
