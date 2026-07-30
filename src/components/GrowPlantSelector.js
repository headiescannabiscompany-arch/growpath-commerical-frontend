import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { radius } from "../theme/theme";
import { useAppTheme } from "@/theme/appTheme";

export default function GrowPlantSelector({
  grows = [],
  selectedGrowId,
  onSelectGrow,
  selectedPlantIds = [],
  onSelectPlants,
  loading = false,
  label = "Link to a Grow (optional)"
}) {
  const { palette } = useAppTheme();
  const isPlantSelected = (id) => selectedPlantIds.includes(id);
  const activeGrow = grows.find((g) => g._id === selectedGrowId);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.surface, borderColor: palette.border }
      ]}
    >
      <Text style={[styles.label, { color: palette.text }]}>{label}</Text>

      {loading ? (
        <Text style={[styles.helperText, { color: palette.textMuted }]}>
          Loading your grows...
        </Text>
      ) : grows.length === 0 ? (
        <Text style={[styles.helperText, { color: palette.textMuted }]}>
          No grows found. Create a grow to link items to it.
        </Text>
      ) : (
        <View style={styles.pillRow}>
          <TouchableOpacity
            style={[
              styles.pill,
              { backgroundColor: palette.surfaceMuted, borderColor: palette.border },
              !selectedGrowId && {
                backgroundColor: palette.accent,
                borderColor: palette.accent
              }
            ]}
            onPress={() => {
              onSelectGrow?.(null);
              onSelectPlants?.([]);
            }}
          >
            <Text
              style={[
                styles.pillText,
                { color: palette.text },
                !selectedGrowId && { color: palette.accentText }
              ]}
            >
              No Grow
            </Text>
          </TouchableOpacity>
          {grows.map((grow) => {
            const isSelected = selectedGrowId === grow._id;
            return (
              <TouchableOpacity
                key={grow._id}
                style={[
                  styles.pill,
                  { backgroundColor: palette.surfaceMuted, borderColor: palette.border },
                  isSelected && {
                    backgroundColor: palette.accent,
                    borderColor: palette.accent
                  }
                ]}
                onPress={() => {
                  const next = isSelected ? null : grow._id;
                  onSelectGrow?.(next);
                  onSelectPlants?.([]);
                }}
              >
                <Text
                  style={[
                    styles.pillText,
                    { color: palette.text },
                    isSelected && { color: palette.accentText }
                  ]}
                >
                  {grow.name || grow.title || "Grow"}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {selectedGrowId && activeGrow ? (
        <>
          <Text style={[styles.label, { color: palette.text, marginTop: 10 }]}>
            Attach a plant (optional)
          </Text>
          {(() => {
            if (!Array.isArray(activeGrow.plants) || activeGrow.plants.length === 0) {
              return (
                <Text style={[styles.helperText, { color: palette.textMuted }]}>
                  This grow does not have any plants yet.
                </Text>
              );
            }
            return (
              <View style={styles.pillRow}>
                <TouchableOpacity
                  style={[
                    styles.pill,
                    {
                      backgroundColor: palette.surfaceMuted,
                      borderColor: palette.border
                    },
                    selectedPlantIds.length === 0 && {
                      backgroundColor: palette.accent,
                      borderColor: palette.accent
                    }
                  ]}
                  onPress={() => {
                    onSelectPlants?.([]);
                  }}
                >
                  <Text
                    style={[
                      styles.pillText,
                      { color: palette.text },
                      selectedPlantIds.length === 0 && { color: palette.accentText }
                    ]}
                  >
                    Entire Grow
                  </Text>
                </TouchableOpacity>
                {activeGrow.plants.map((plant) => {
                  const id = plant._id || plant.id;
                  const isActive = isPlantSelected(id);
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[
                        styles.pill,
                        {
                          backgroundColor: palette.surfaceMuted,
                          borderColor: palette.border
                        },
                        isActive && {
                          backgroundColor: palette.accent,
                          borderColor: palette.accent
                        }
                      ]}
                      onPress={() => {
                        if (isActive) {
                          onSelectPlants?.(selectedPlantIds.filter((pid) => pid !== id));
                        } else {
                          onSelectPlants?.([...selectedPlantIds, id]);
                        }
                      }}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          { color: palette.text },
                          isActive && { color: palette.accentText }
                        ]}
                      >
                        {plant.name || plant.strain || "Plant"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })()}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#f7f7f7",
    borderRadius: radius.card,
    borderWidth: 1
  },
  label: {
    fontWeight: "600",
    marginBottom: 5
  },
  helperText: {
    marginTop: 4,
    fontSize: 13
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8
  },
  pillText: {
    fontWeight: "600"
  }
});
