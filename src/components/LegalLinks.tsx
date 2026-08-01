import React, { useMemo } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { config } from "@/config/config";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";

type LegalLink = {
  label: string;
  url: string;
};

const LINKS: LegalLink[] = [
  { label: "Privacy", url: config.privacyUrl },
  { label: "Terms", url: config.termsUrl },
  { label: "Support", url: config.supportUrl },
  { label: "Delete account", url: config.deleteAccountUrl }
];

async function openLegalUrl(url: string) {
  if (!url) return;
  await Linking.openURL(url);
}

export default function LegalLinks() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createLegalLinksStyles(palette), [palette]);

  return (
    <View style={styles.row} accessibilityLabel="Legal and support links">
      {LINKS.map((link, index) => (
        <React.Fragment key={link.label}>
          {index > 0 ? <Text style={styles.separator}>|</Text> : null}
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Open ${link.label}`}
            onPress={() => openLegalUrl(link.url)}
            hitSlop={8}
          >
            <Text style={styles.link}>{link.label}</Text>
          </Pressable>
        </React.Fragment>
      ))}
    </View>
  );
}

export function createLegalLinksStyles(palette: ThemePalette) {
  return StyleSheet.create({
    row: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      justifyContent: "center",
      marginTop: 14
    },
    link: {
      color: palette.link,
      fontSize: 13,
      fontWeight: "700",
      textDecorationLine: "underline"
    },
    separator: {
      color: palette.textMuted,
      fontSize: 13,
      fontWeight: "700"
    }
  });
}
