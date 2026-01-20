import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import ScreenContainer from "../components/ScreenContainer.js";
import Card from "../components/Card.js";
import { colors, spacing } from "../theme/theme.js";
import { useNavigation } from "@react-navigation/native";

const TOOLS = [
  { id: "vpd", title: "VPD Calculator", screen: "VPDCalculator" },
  { id: "light", title: "Light Calculator", screen: "LightCalculator" },
  { id: "nutrient", title: "Nutrient Calculator", screen: "NutrientCalculator" },
  { id: "watering", title: "Watering Scheduler", screen: "WateringScheduler" },
  { id: "schedule", title: "Schedule Calculator", screen: "ScheduleCalculator" },
  { id: "ph_ec", title: "pH/EC Calculator", screen: "PHECCalculator" },
  { id: "growth", title: "Growth Tracker", screen: "GrowthTracker" },
  { id: "pest", title: "Pest & Disease Identifier", screen: "PestDiseaseIdentifier" },
  { id: "harvest", title: "Harvest Estimator", screen: "HarvestEstimator" }
];

export default function ToolsScreen() {
  const navigation = useNavigation();
  return (
    <ScreenContainer>
      <Card style={styles.card}>
        <Text style={styles.title}>Single-User Tools</Text>
        {TOOLS.map((tool) => (
          <TouchableOpacity
            key={tool.id}
            style={styles.toolButton}
            onPress={() => navigation.navigate(tool.screen)}
          >
            <Text style={styles.toolText}>{tool.title}</Text>
          </TouchableOpacity>
        ))}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: spacing(2),
    padding: spacing(3),
    alignItems: "stretch"
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: spacing(2),
    color: colors.primary
  },
  toolButton: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing(2),
    marginTop: spacing(1),
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border
  },
  toolText: {
    fontSize: 16,
    color: colors.textPrimary
  }
});
