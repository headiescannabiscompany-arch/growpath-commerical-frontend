import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "../theme/theme";

export default function GrowPlantSelector({
  grows = [],
  selectedGrowId,
  onSelectGrow,
  selectedPlantIds = [],
  onSelectPlants,
  loading = false,
  label = "Link to a Grow (optional)"
}) {
  // Reset plant selection if grow changes (handled by parent usually, but safety check)
  // Actually, parent should handle logic. This is a dumb component.

  // Helper to check if a plant is selected
  const isPlantSelected = (id) => selectedPlantIds.includes(id);

  // Find selected grow object
  const activeGrow = grows.find((g) => g._id === selectedGrowId);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {loading ? (
        <Text style={styles.helperText}>Loading your grows…</Text>
      ) : grows.length === 0 ? (
        <Text style={styles.helperText}>
          No grows found. Create a grow to link items to it.
        </Text>
      ) : (
        <View style={styles.pillRow}>
          <TouchableOpacity
            style={[styles.pill, !selectedGrowId && styles.pillActive]}
            onPress={() => {
              if (onSelectGrow) onSelectGrow(null);
              if (onSelectPlants) onSelectPlants([]);
            }}
          >
            <Text style={[styles.pillText, !selectedGrowId && styles.pillTextActive]}>
              No Grow
            </Text>
          </TouchableOpacity>
          {grows.map((grow) => (
            <TouchableOpacity
              key={grow._id}
              style={[styles.pill, selectedGrowId === grow._id && styles.pillActive]}
              onPress={() => {
                if (onSelectGrow) {
                  // Toggle off if same, or switch
                  const next = selectedGrowId === grow._id ? null : grow._id;
                  onSelectGrow(next);
                  // Clear plants if grow changes/clears
                  if (onSelectPlants) onSelectPlants([]);
                }
              }}
            >
              <Text
                style={[
                  styles.pillText,
                  selectedGrowId === grow._id && styles.pillTextActive
                ]}
              >
                {grow.name || grow.title || "Grow"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {selectedGrowId && activeGrow ? (
        <>
          <Text style={[styles.label, { marginTop: 10 }]}>Attach a plant (optional)</Text>
          {(() => {
            if (!Array.isArray(activeGrow.plants) || activeGrow.plants.length === 0) {
              return (
                <Text style={styles.helperText}>
                  This grow does not have any plants yet.
                </Text>
              );
            }
            return (
              <View style={styles.pillRow}>
                <TouchableOpacity
                  style={[
                    styles.pill,
                    selectedPlantIds.length === 0 && styles.pillActive
                  ]}
                  onPress={() => {
                    if (onSelectPlants) onSelectPlants([]);
                  }}
                >
                  <Text
                    style={[
                      styles.pillText,
                      selectedPlantIds.length === 0 && styles.pillTextActive
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
                      style={[styles.pill, isActive && styles.pillActive]}
                      onPress={() => {
                        if (onSelectPlants) {
                          if (isActive) {
                            onSelectPlants(selectedPlantIds.filter((pid) => pid !== id));
                          } else {
                            onSelectPlants([...selectedPlantIds, id]);
                          }
                        }
                      }}
                    >
                      <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
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
    borderRadius: 12
  },
  label: {
    fontWeight: "600",
    marginBottom: 5,
    color: "#333"
  },
  helperText: {
    color: "#666",
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
    marginRight: 8,
    marginBottom: 8
  },
  pillActive: {
    backgroundColor: colors.accent || "#2ecc71",
    borderColor: colors.accent || "#2ecc71"
  },
  pillText: {
    color: "#333",
    fontWeight: "600"
  },
  pillTextActive: {
    color: "#fff"
  }
});
