import React, { useState } from "react";
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { pinkMagicFamilyTree as tree } from "@/knowledge/pinkMagicFamilyTree";
import { useAppTheme } from "@/theme/appTheme";

export default function PinkMagicFamilyTree() {
  const [open, setOpen] = useState(false);
  const { palette } = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>
        Crop reference: {tree.cultivar}
      </Text>
      <Text style={{ color: palette.textSoft }}>Read-only cultivar history</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={[styles.button, { backgroundColor: palette.accent }]}
      >
        <Text style={[styles.bold, { color: palette.accentText }]}>
          {open ? "Hide family tree" : "Show family tree"}
        </Text>
      </Pressable>
      {open ? (
        <View style={styles.details} testID="pink-magic-family-tree">
          <View style={[styles.node, { backgroundColor: palette.accentSoft }]}>
            <Text style={[styles.bold, { color: palette.text }]}>{tree.cultivar}</Text>
            <Text style={{ color: palette.text }}>{tree.denomination}</Text>
            <Text style={{ color: palette.textSoft }}>{tree.breeder}</Text>
          </View>
          <View style={[styles.branch, { borderColor: palette.border }]}>
            <Text style={[styles.bold, { color: palette.textSoft }]}>{tree.relationship}</Text>
            <View style={[styles.node, { backgroundColor: palette.surfaceMuted }]}>
              <Text style={{ color: palette.text }}>{tree.sourceStock}</Text>
              <Text style={[styles.bold, { color: palette.text }]}>{tree.endpoint}</Text>
            </View>
          </View>
          <Text selectable style={{ color: palette.textSoft }}>{tree.limit}</Text>
          <Text accessibilityRole="header" style={[styles.bold, { color: palette.text }]}>
            Sources
          </Text>
          {tree.sources.map(({ label, url }) => (
            <Link key={url} href={url} target="_blank" style={[styles.link, { color: palette.link }]}>
              {label}
            </Link>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: "stretch", borderRadius: 12, borderWidth: 1, gap: 8, padding: 14 },
  title: { fontSize: 17, fontWeight: "700" },
  bold: { fontWeight: "700" },
  button: { alignSelf: "flex-start", borderRadius: 8, justifyContent: "center", minHeight: 44, paddingHorizontal: 12 },
  details: { gap: 10 },
  node: { borderRadius: 8, gap: 4, padding: 10 },
  branch: { borderLeftWidth: 2, gap: 6, marginLeft: 10, paddingLeft: 10 },
  link: { paddingVertical: 12, textDecorationLine: "underline" }
});
