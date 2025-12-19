import React, { useEffect, useState } from "react";
import { Text, FlatList, TouchableOpacity, StyleSheet, View, Alert } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { getTemplate, applyTemplateToPlant } from "../api/templates";
import { getPlants } from "../api/plants";

export default function TemplateDetailScreen({ route, navigation }) {
  const { templateId } = route.params;
  const [template, setTemplate] = useState(null);
  const [plants, setPlants] = useState([]);
  const [selectingPlant, setSelectingPlant] = useState(false);

  async function load() {
    const [tRes, pRes] = await Promise.all([getTemplate(templateId), getPlants()]);
    const templateData = tRes?.data ?? tRes;
    const plantList = pRes?.data ?? pRes ?? [];
    setTemplate(templateData);
    setPlants(Array.isArray(plantList) ? plantList : []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleApplyToPlant(plantId) {
    await applyTemplateToPlant(templateId, plantId);
    Alert.alert("Applied", "Template linked to plant.");
    setSelectingPlant(false);
  }

  if (!template) {
    return (
      <ScreenContainer>
        <Text>Loading…</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text style={styles.header}>{template.title}</Text>
      <Text style={styles.meta}>{template.strain || "Any strain"} • {template.growMedium || "Any medium"}</Text>
      <Text style={styles.meta}>{template.difficulty} • {template.durationDays} days</Text>
      <Text style={styles.desc}>{template.description}</Text>

      <TouchableOpacity style={styles.applyBtn} onPress={() => setSelectingPlant(true)}>
        <Text style={styles.applyText}>Apply to a Plant</Text>
      </TouchableOpacity>

      {selectingPlant && (
        <View style={styles.plantPicker}>
          <Text style={styles.section}>Choose a plant</Text>
          {plants.map((p) => (
            <TouchableOpacity key={p._id} style={styles.plantRow} onPress={() => handleApplyToPlant(p._id)}>
              <Text style={styles.plantName}>{p.name}</Text>
              <Text style={styles.plantStrain}>{p.strain}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.section}>Schedule</Text>

      <FlatList
        data={[...(template.steps || [])].sort((a, b) => a.day - b.day)}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={styles.stepCard}>
            <Text style={styles.stepDay}>Day {item.day}</Text>
            <Text style={styles.stepLabel}>{item.label}</Text>
            <Text style={styles.stepMeta}>{item.stage} • {item.actionType}</Text>
            {item.nutrients ? <Text style={styles.stepNutes}>Nutrients: {item.nutrients}</Text> : null}
            {item.details ? <Text style={styles.stepDetails}>{item.details}</Text> : null}
          </View>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  meta: { color: "#777", fontSize: 13 },
  desc: { marginTop: 8, marginBottom: 16 },
  applyBtn: { backgroundColor: "#2ecc71", padding: 10, borderRadius: 8, marginBottom: 16 },
  applyText: { color: "white", textAlign: "center", fontWeight: "700" },
  plantPicker: { backgroundColor: "#f5f5f5", padding: 10, borderRadius: 8, marginBottom: 16 },
  plantRow: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#ddd" },
  plantName: { fontWeight: "700" },
  plantStrain: { fontSize: 12, color: "#777" },
  section: { fontSize: 18, fontWeight: "700", marginVertical: 10 },
  stepCard: { backgroundColor: "white", padding: 10, borderRadius: 8, marginBottom: 8 },
  stepDay: { fontWeight: "700" },
  stepLabel: { fontSize: 14, marginTop: 2 },
  stepMeta: { fontSize: 12, color: "#777", marginTop: 2 },
  stepNutes: { fontSize: 12, color: "#27ae60", marginTop: 2 },
  stepDetails: { fontSize: 12, marginTop: 4 },
});
