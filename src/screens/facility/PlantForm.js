import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet
} from "react-native";

const STAGES = ["Seedling", "Vegetative", "Flowering", "Harvest", "Cured"];

/**
 * @typedef {Object} PlantData
 * @property {string} name
 * @property {string} strain
 * @property {string} stage
 * @property {string} growMedium
 * @property {string} notes
 */

const defaultPlantData = {
  name: "",
  strain: "",
  stage: STAGES[0],
  growMedium: "Soil",
  notes: ""
};

/**
 * @param {{ visible: boolean, onClose: () => void, onSave: (data: PlantData) => void, initialData?: PlantData }} props
 */
export default function PlantForm({
  visible,
  onClose,
  onSave,
  initialData = defaultPlantData
}) {
  const safeData = {
    name: initialData.name || "",
    strain: initialData.strain || "",
    stage: initialData.stage || STAGES[0],
    growMedium: initialData.growMedium || "Soil",
    notes: initialData.notes || ""
  };
  const [name, setName] = useState(safeData.name);
  const [strain, setStrain] = useState(safeData.strain);
  const [stage, setStage] = useState(safeData.stage);
  const [growMedium, setGrowMedium] = useState(safeData.growMedium);
  const [notes, setNotes] = useState(safeData.notes);

  function handleSave() {
    if (!name.trim()) return;
    onSave({ name, strain, stage, growMedium, notes });
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView style={styles.container}>
        <View style={styles.headerSection}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.headerButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.header}>Plant Details</Text>
          <TouchableOpacity onPress={handleSave} disabled={!name.trim()}>
            <Text style={[styles.headerButton, !name.trim() && styles.disabled]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Plant name"
        />
        <Text style={styles.label}>Strain</Text>
        <TextInput
          style={styles.input}
          value={strain}
          onChangeText={setStrain}
          placeholder="Strain"
        />
        <Text style={styles.label}>Stage</Text>
        {STAGES.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.stageBtn, stage === s && styles.stageBtnActive]}
            onPress={() => setStage(s)}
          >
            <Text style={[styles.stageText, stage === s && styles.stageTextActive]}>
              {s}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.label}>Grow Medium</Text>
        <TextInput
          style={styles.input}
          value={growMedium}
          onChangeText={setGrowMedium}
          placeholder="Grow medium"
        />
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={styles.input}
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes"
          multiline
        />
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f9fafb"
  },
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginBottom: 16
  },
  header: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937"
  },
  headerButton: {
    fontSize: 16,
    color: "#0ea5e9",
    fontWeight: "700"
  },
  disabled: {
    color: "#d1d5db",
    opacity: 0.5
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#fff",
    color: "#1f2937"
  },
  stageBtn: {
    padding: 10,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
    marginTop: 8,
    marginBottom: 4
  },
  stageBtnActive: {
    backgroundColor: "#0ea5e9"
  },
  stageText: {
    color: "#1f2937",
    fontWeight: "700"
  },
  stageTextActive: {
    color: "#fff",
    fontWeight: "700"
  }
});
