import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { config } from "@/config/config";

type LegalLink = {
  label: string;
  url: string;
};

const LINKS: LegalLink[] = [
  { label: "Privacy", url: config.privacyUrl },
  { label: "Terms", url: config.termsUrl },
  { label: "Support", url: config.supportUrl }
];

async function openLegalUrl(url: string) {
  if (!url) return;
  await Linking.openURL(url);
}

export default function LegalLinks() {
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

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    marginTop: 14
  },
  link: {
    color: "#1d4ed8",
    fontSize: 13,
    fontWeight: "700",
    textDecorationLine: "underline"
  },
  separator: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "700"
  }
});
