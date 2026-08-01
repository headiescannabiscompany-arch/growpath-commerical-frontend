import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

const basis = {
  nutrient: {
    title: "Nutrient mix science and evidence",
    model:
      "Uses entered guaranteed analysis, standard label N-P2O5-K2O interpretation, elemental P/K conversion, batch volume, density, nutrient form, and release timing.",
    evidence:
      "Best evidence: verified product labels, manufacturer documents, water analysis, measured density, calibrated pH/EC readings, and crop response records.",
    limit:
      "Label math supports composition and planning. It does not prove product superiority, plant uptake, compatibility, or crop response. Unknown values remain assumptions and should be shown as such."
  },
  soil: {
    title: "Soil mix science and evidence",
    model:
      "Models physical structure, water holding and drainage, aeration durability, organic matter, buffering/CEC context, biology, nutrient forms, and fast/medium/slow release timing.",
    evidence:
      "Best evidence: verified ingredient labels, volume and density measurements, irrigation-water analysis, soil/substrate lab tests, compost analysis, crop identity, and prior run outcomes.",
    limit:
      "Compost, biology, mineralization, long-term release, and plant availability remain uncertain without testing. Lab and measured grow evidence take precedence over presets."
  }
} as const;

export default function MixBuilderScienceBasis({
  variant
}: {
  variant: keyof typeof basis;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createMixBuilderScienceBasisStyles(palette), [palette]);
  const content = basis[variant];
  return (
    <View style={styles.card} accessibilityLabel={`${content.title} basis`}>
      <Text style={styles.title}>{content.title}</Text>
      <Text style={styles.line}>{content.model}</Text>
      <Text style={styles.line}>{content.evidence}</Text>
      <Text style={styles.limit}>{content.limit}</Text>
    </View>
  );
}

export function createMixBuilderScienceBasisStyles(palette: ThemePalette) {
  return StyleSheet.create({
    card: {
      borderWidth: 1,
      borderColor: palette.borderSoft,
      borderRadius: radius.card,
      backgroundColor: palette.surfaceMuted,
      padding: 12,
      gap: 6
    },
    title: { color: palette.text, fontWeight: "800", fontSize: 15 },
    line: { color: palette.textMuted, lineHeight: 19 },
    limit: { color: palette.warning, lineHeight: 19, fontWeight: "700" }
  });
}
