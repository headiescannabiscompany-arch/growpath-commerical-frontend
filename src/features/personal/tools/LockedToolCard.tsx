import React, { useMemo } from "react";
import { Href, Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { type ThemePalette, useAppTheme } from "@/theme/appTheme";

type LockedToolCardProps = {
  title: string;
  capability: string;
  description?: string;
  upgradeHref?: string;
};

export default function LockedToolCard({
  title,
  capability,
  description = "Upgrade or enable this capability to use the tool.",
  upgradeHref = "/subscribe"
}: LockedToolCardProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createLockedToolCardStyles(palette), [palette]);

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Locked</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <Text style={styles.capability}>Required capability: {capability}</Text>
      <Link href={upgradeHref as Href} style={styles.link} asChild>
        <Text>View upgrade options</Text>
      </Link>
    </View>
  );
}

export function createLockedToolCardStyles(palette: ThemePalette) {
  return StyleSheet.create({
    card: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.danger,
      borderRadius: 8,
      borderWidth: 1,
      gap: 7,
      padding: 16
    },
    eyebrow: {
      color: palette.danger,
      fontSize: 12,
      fontWeight: "800",
      textTransform: "uppercase"
    },
    title: { color: palette.text, fontSize: 17, fontWeight: "800" },
    description: { color: palette.textSoft, lineHeight: 20 },
    capability: { color: palette.danger, fontSize: 12, fontWeight: "700" },
    link: { color: palette.link, fontWeight: "800", marginTop: 4 }
  });
}
