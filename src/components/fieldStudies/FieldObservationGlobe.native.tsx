import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { FieldObservation } from "@/api/fieldStudies";

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
  const mapped = observations.filter(
    (observation) =>
      Number.isFinite(Number(observation.location?.latitude)) &&
      Number.isFinite(Number(observation.location?.longitude))
  ).length;

  return (
    <View
      accessibilityLabel={`${mapped} shared plant observations. Interactive globe available in the GrowPathAI web experience.`}
      style={[styles.panel, compact && styles.compactPanel]}
    >
      <Text style={styles.title}>{mapped} shared locations</Text>
      <Text style={styles.body}>
        The interactive 3D globe is currently available on the GrowPathAI website. The
        complete accessible observation list remains available below.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    alignItems: "center",
    backgroundColor: "#DBEAFE",
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 280,
    padding: 24
  },
  compactPanel: {
    minHeight: 220,
    padding: 16
  },
  title: { color: "#14532D", fontSize: 22, fontWeight: "800" },
  body: {
    color: "#334155",
    lineHeight: 21,
    marginTop: 8,
    maxWidth: 520,
    textAlign: "center"
  }
});
