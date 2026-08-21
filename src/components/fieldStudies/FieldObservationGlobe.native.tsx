import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { FieldObservation } from "@/api/fieldStudies";
import { publicObservationCoordinates } from "@/features/fieldStudies/publicObservation";
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

function observationId(observation: FieldObservation) {
  return String(observation.id || observation._id || "");
}

function observationName(observation: FieldObservation) {
  return String(
    observation.identity?.commonName || observation.title || "Shared plant finding"
  );
}

function observationRegion(observation: FieldObservation) {
  return String(
    observation.observationContext?.region ||
      observation.location?.label ||
      "Approximate shared location"
  );
}

export default function FieldObservationGlobe({
  observations,
  selectedObservationId,
  onSelectObservations,
  compact = false
}: Props) {
  const { palette } = useAppTheme();
  const mapped = observations.filter(
    (observation) =>
      Boolean(observationId(observation)) &&
      Boolean(publicObservationCoordinates(observation))
  );
  const visible = mapped.slice(0, compact ? 3 : 8);

  return (
    <View
      accessibilityLabel={`${mapped.length} mapped shared plant observations.`}
      style={[
        styles.panel,
        { backgroundColor: palette.accentSoft },
        compact && styles.compactPanel
      ]}
    >
      <Text style={[styles.title, { color: palette.text }]}>
        {mapped.length} mapped shared locations
      </Text>
      <Text style={[styles.body, { color: palette.textMuted }]}>
        {compact
          ? "Open Nature to explore these shared findings."
          : "Select a mapped finding to open its public photos, identity, and review details."}
      </Text>
      {visible.length ? (
        <View style={styles.locationList}>
          {visible.map((observation) => {
            const id = observationId(observation);
            const selected = id === selectedObservationId;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={id}
                onPress={() => onSelectObservations([id])}
                style={[
                  styles.locationRow,
                  { backgroundColor: palette.surface, borderColor: palette.border },
                  selected && { borderColor: palette.accent }
                ]}
              >
                <Text style={[styles.locationTitle, { color: palette.text }]}>
                  {observationName(observation)}
                </Text>
                <Text style={[styles.locationMeta, { color: palette.textMuted }]}>
                  {observationRegion(observation)} ·{" "}
                  {observation.location?.precision || "approximate"}
                </Text>
              </Pressable>
            );
          })}
          {mapped.length > visible.length ? (
            <Text style={[styles.more, { color: palette.textMuted }]}>
              {mapped.length - visible.length} more mapped findings in the list below
            </Text>
          ) : null}
        </View>
      ) : (
        <Text style={[styles.empty, { color: palette.textMuted }]}>
          No public mapped findings match these filters yet.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 280,
    padding: 24
  },
  compactPanel: {
    minHeight: 220,
    padding: 16
  },
  title: { fontSize: 22, fontWeight: "800" },
  body: {
    lineHeight: 21,
    marginTop: 8,
    maxWidth: 520
  },
  locationList: { gap: 8, marginTop: 16, width: "100%" },
  locationRow: { borderRadius: 12, borderWidth: 1, padding: 12 },
  locationTitle: { fontSize: 16, fontWeight: "800" },
  locationMeta: { fontSize: 13, lineHeight: 18, marginTop: 3 },
  more: { fontSize: 13, marginTop: 2 },
  empty: { fontSize: 14, marginTop: 16 }
});
