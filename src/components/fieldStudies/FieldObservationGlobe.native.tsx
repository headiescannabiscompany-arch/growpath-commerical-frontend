import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { FieldObservation } from "@/api/fieldStudies";
import { useAppTheme } from "@/theme/appTheme";

export type FieldObservationViewport = {
  west: number;
  south: number;
  east: number;
  north: number;
};

type Props = {
  observations: FieldObservation[];
  selectedObservationId?: string;
  onSelectObservations: (observationIds: string[]) => void;
  onViewportChange: (viewport: FieldObservationViewport | null) => void;
  compact?: boolean;
};

export default function FieldObservationGlobe({ observations, compact = false }: Props) {
  const { palette } = useAppTheme();
  const mapped = observations.filter(
    (observation) =>
      Number.isFinite(Number(observation.location?.latitude)) &&
      Number.isFinite(Number(observation.location?.longitude))
  ).length;

  return (
    <View
      accessibilityLabel={`${mapped} shared plant observations. Interactive globe available in the GrowPathAI web experience.`}
      style={[
        styles.panel,
        {
          backgroundColor: palette.surfaceMuted,
          borderColor: palette.border
        },
        compact && styles.compactPanel
      ]}
    >
      <Text style={[styles.title, { color: palette.accent }]}>
        Discovery Nature preview
      </Text>
      <Text style={[styles.count, { color: palette.text }]}>
        {mapped} shared locations
      </Text>
      <Text style={[styles.body, { color: palette.textMuted }]}>
        Open the full globe in the GrowPathAI web experience to explore opted-in
        locations, mapped findings, and invasive species context.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 280,
    padding: 24
  },
  compactPanel: {
    minHeight: 220,
    padding: 16
  },
  title: {
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.2,
    textTransform: "uppercase"
  },
  count: { fontSize: 26, fontWeight: "900", marginTop: 8 },
  body: {
    lineHeight: 21,
    marginTop: 8,
    maxWidth: 520,
    textAlign: "center"
  }
});
