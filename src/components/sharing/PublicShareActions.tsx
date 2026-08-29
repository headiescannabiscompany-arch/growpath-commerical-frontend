import React, { useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import {
  buildPublicShareTargets,
  currentPublicUrl,
  sharePublicLink
} from "@/utils/publicLinks";

type Props = {
  title: string;
  path: string;
  heading?: string;
};

export default function PublicShareActions({ title, path, heading = "Share" }: Props) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [feedback, setFeedback] = useState("");
  const targets = useMemo(() => buildPublicShareTargets(title, path), [path, title]);

  async function openShareSheet() {
    try {
      const result = await sharePublicLink(title, path);
      setFeedback(
        result.method.includes("clipboard") ? "Link copied." : "Share options opened."
      );
    } catch (error: any) {
      setFeedback(error?.message || "Unable to open sharing.");
    }
  }

  async function copyLink() {
    try {
      const nav = (globalThis as any)?.navigator;
      if (typeof nav?.clipboard?.writeText !== "function") {
        await sharePublicLink(title, path);
        return;
      }
      await nav.clipboard.writeText(currentPublicUrl(path));
      setFeedback("Link copied.");
    } catch (error: any) {
      setFeedback(error?.message || "Unable to copy the link.");
    }
  }

  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" aria-level={3} style={styles.heading}>
        {heading}
      </Text>
      <Text style={styles.helper}>
        Share the GrowPath link so people can open the original, join GrowPath when
        needed, and return to the same record.
      </Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityLabel={`Share ${title}`}
          accessibilityRole="button"
          onPress={openShareSheet}
          style={styles.primary}
        >
          <Text style={styles.primaryText}>Share</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={`Copy link for ${title}`}
          accessibilityRole="button"
          onPress={copyLink}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>Copy Link</Text>
        </Pressable>
        {targets.map((target) => (
          <Pressable
            accessibilityLabel={`Share ${title} to ${target.label}`}
            accessibilityRole="link"
            key={target.key}
            onPress={() => Linking.openURL(target.href)}
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>{target.label}</Text>
          </Pressable>
        ))}
      </View>
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
    </View>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 16,
      gap: 10
    },
    heading: { color: palette.text, fontSize: 18, fontWeight: "800" },
    helper: { color: palette.textMuted, fontSize: 14, lineHeight: 20 },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    primary: {
      backgroundColor: palette.accent,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    primaryText: { color: palette.accentText, fontWeight: "800" },
    secondary: {
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    secondaryText: { color: palette.text, fontWeight: "700" },
    feedback: { color: palette.textMuted, fontSize: 13 }
  });
}
