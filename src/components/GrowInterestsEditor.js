import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { INTEREST_TIERS } from "../config/interests";
import { updateGrowInterests } from "../api/users";
import { colors } from "../theme/theme";

export default function GrowInterestsEditor({ initialInterests = {}, onSave }) {
  const [interests, setInterests] = useState(initialInterests);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTier, setActiveTier] = useState(null);

  useEffect(() => {
    setInterests(initialInterests || {});
  }, [initialInterests]);

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        setInterests(initialInterests || {});
        setExpanded(false);
      };
    }, [initialInterests])
  );

  const toggleInterest = (tierId, option) => {
    setInterests((prev) => {
      const currentList = prev[tierId] || [];
      if (currentList.includes(option)) {
        return { ...prev, [tierId]: currentList.filter((i) => i !== option) };
      } else {
        return { ...prev, [tierId]: [...currentList, option] };
      }
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateGrowInterests(interests);
      if (onSave) onSave(interests);
      Alert.alert("Success", "Grow interests updated.");
      setExpanded(false);
    } catch (err) {
      Alert.alert("Error", "Failed to update interests.");
    } finally {
      setSaving(false);
    }
  };

  if (!expanded) {
    return (
      <TouchableOpacity
        style={styles.expandButton}
        onPress={() => setExpanded(true)}
      >
        <Text style={styles.expandText}>Manage Grow Interests</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Grow Interests</Text>
        <TouchableOpacity onPress={() => setExpanded(false)}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>
        Select the topics that matter to you. This customizes your feed, AI advice, and recommendations.
      </Text>

      {INTEREST_TIERS.map((tier) => {
        const isTierOpen = activeTier === tier.id;
        const selectedCount = (interests[tier.id] || []).length;
        
        return (
          <View key={tier.id} style={styles.tierContainer}>
            <TouchableOpacity
              style={styles.tierHeader}
              onPress={() => setActiveTier(isTierOpen ? null : tier.id)}
            >
              <Text style={styles.tierTitle}>{tier.label}</Text>
              <View style={styles.tierBadge}>
                <Text style={styles.tierBadgeText}>{selectedCount}</Text>
              </View>
            </TouchableOpacity>
            
            {isTierOpen && (
              <View style={styles.optionsGrid}>
                {tier.options.map((option) => {
                  const isSelected = (interests[tier.id] || []).includes(option);
                  return (
                    <TouchableOpacity
                      key={option}
                      style={[styles.pill, isSelected && styles.pillActive]}
                      onPress={() => toggleInterest(tier.id, option)}
                    >
                      <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}

      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.saveButtonText}>Save Interests</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  expandButton: {
    backgroundColor: "#F0FDF4",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#10B981"
  },
  expandText: {
    color: "#10B981",
    fontWeight: "700",
    fontSize: 16
  },
  container: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#eee"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333"
  },
  closeText: {
    color: "#888",
    fontSize: 14
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
    lineHeight: 20
  },
  tierContainer: {
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    paddingBottom: 8
  },
  tierHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10
  },
  tierTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#444"
  },
  tierBadge: {
    backgroundColor: "#eee",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  tierBadgeText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600"
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
    marginBottom: 8
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#eee"
  },
  pillActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981"
  },
  pillText: {
    fontSize: 14,
    color: "#555"
  },
  pillTextActive: {
    color: "white",
    fontWeight: "600"
  },
  saveButton: {
    backgroundColor: "#10B981",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16
  },
  saveButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 16
  }
});
