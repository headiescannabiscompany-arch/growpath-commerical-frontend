import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  ScrollView
} from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import { colors, spacing, radius } from "../theme/theme";
import { createGrow, listGrows } from "../api/grows";

export default function GrowLogsScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [grows, setGrows] = useState([]);
  const [newName, setNewName] = useState("");
  const [strain, setStrain] = useState("");
  const [breeder, setBreeder] = useState("");
  const [stage, setStage] = useState("");

  // Advanced environment options
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Light
  const [lightPPFD, setLightPPFD] = useState("");
  const [lightDLI, setLightDLI] = useState("");
  const [lightModel, setLightModel] = useState("");
  const [lightDistance, setLightDistance] = useState("");
  const [lightSpectrum, setLightSpectrum] = useState("");

  // Water
  const [waterSource, setWaterSource] = useState("");
  const [waterTreatment, setWaterTreatment] = useState("");
  const [waterPH, setWaterPH] = useState("");
  const [waterPPM, setWaterPPM] = useState("");

  // Air
  const [temperature, setTemperature] = useState("");
  const [humidity, setHumidity] = useState("");
  const [airflow, setAirflow] = useState("");

  // Nutrients
  const [nutrientBrand, setNutrientBrand] = useState("");
  const [nutrientStrength, setNutrientStrength] = useState("");
  const [feedingSchedule, setFeedingSchedule] = useState("");

  // Substrate
  const [substrateType, setSubstrateType] = useState("");
  const [substratePH, setSubstratePH] = useState("");

  async function loadGrows() {
    try {
      setLoading(true);
      const data = await listGrows();
      setGrows(data);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGrows();
  }, []);

  async function handleAddGrow() {
    if (!newName.trim()) return Alert.alert("Missing name");

    try {
      const growData = {
        name: newName,
        strain,
        breeder,
        stage,
        environment: {
          light: {
            ppfd: lightPPFD,
            dli: lightDLI,
            model: lightModel,
            distance: lightDistance,
            spectrum: lightSpectrum
          },
          water: {
            source: waterSource,
            treatment: waterTreatment,
            ph: waterPH,
            ppm: waterPPM
          },
          air: {
            temperature,
            humidity,
            airflow
          },
          nutrients: {
            brand: nutrientBrand,
            strength: nutrientStrength,
            schedule: feedingSchedule
          },
          substrate: {
            type: substrateType,
            ph: substratePH
          }
        }
      };

      const grow = await createGrow(growData);
      setGrows([grow, ...grows]);

      // Reset all fields
      setNewName("");
      setStrain("");
      setBreeder("");
      setStage("");
      setLightPPFD("");
      setLightDLI("");
      setLightModel("");
      setLightDistance("");
      setLightSpectrum("");
      setWaterSource("");
      setWaterTreatment("");
      setWaterPH("");
      setWaterPPM("");
      setTemperature("");
      setHumidity("");
      setAirflow("");
      setNutrientBrand("");
      setNutrientStrength("");
      setFeedingSchedule("");
      setSubstrateType("");
      setSubstratePH("");
      setShowAdvanced(false);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  }

  function openGrow(grow) {
    navigation.navigate("GrowJournal", { grow });
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.title}>Your Plants</Text>

      {/* Add new grow */}
      <Card style={{ marginBottom: spacing(6) }}>
        <Text style={styles.label}>Start a New Grow</Text>

        <TextInput
          value={newName}
          onChangeText={setNewName}
          placeholder="Grow Name (required)"
          style={styles.input}
          placeholderTextColor={colors.textSoft}
        />

        {/* Genetics Section */}
        <View style={styles.geneticsSection}>
          <Text style={styles.sectionTitle}>🧬 Plant Genetics</Text>

          <Text style={styles.fieldLabel}>Strain</Text>
          <TextInput
            value={strain}
            onChangeText={setStrain}
            placeholder="Blueberry Muffin, Gelato #33, etc."
            style={styles.input}
            placeholderTextColor={colors.textSoft}
          />

          <Text style={styles.fieldLabel}>Breeder</Text>
          <TextInput
            value={breeder}
            onChangeText={setBreeder}
            placeholder="Barney's Farm, Mephisto, etc."
            style={styles.input}
            placeholderTextColor={colors.textSoft}
          />
        </View>

        <Text style={styles.fieldLabel}>Growth Stage</Text>
        <TextInput
          value={stage}
          onChangeText={setStage}
          placeholder="Seedling, Veg, Flower, etc."
          style={styles.input}
          placeholderTextColor={colors.textSoft}
        />

        {/* Advanced Environment Toggle */}
        <TouchableOpacity
          onPress={() => setShowAdvanced(!showAdvanced)}
          style={styles.advancedToggle}
        >
          <Text style={styles.advancedToggleText}>
            {showAdvanced ? "▼" : "▶"} Advanced Environment Setup (optional)
          </Text>
        </TouchableOpacity>

        {showAdvanced && (
          <View style={styles.advancedSection}>
            {/* Light Section */}
            <View style={styles.envSection}>
              <Text style={styles.envSectionTitle}>💡 Lighting</Text>

              <Text style={styles.fieldLabel}>PPFD (μmol/m²/s)</Text>
              <TextInput
                value={lightPPFD}
                onChangeText={setLightPPFD}
                placeholder="e.g., 600"
                style={styles.input}
                placeholderTextColor={colors.textSoft}
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>DLI (Daily Light Integral)</Text>
              <TextInput
                value={lightDLI}
                onChangeText={setLightDLI}
                placeholder="e.g., 40"
                style={styles.input}
                placeholderTextColor={colors.textSoft}
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Light Model</Text>
              <TextInput
                value={lightModel}
                onChangeText={setLightModel}
                placeholder="Spider Farmer SF-4000, etc."
                style={styles.input}
                placeholderTextColor={colors.textSoft}
              />

              <Text style={styles.fieldLabel}>Distance from Canopy</Text>
              <TextInput
                value={lightDistance}
                onChangeText={setLightDistance}
                placeholder="18 inches, 45cm, etc."
                style={styles.input}
                placeholderTextColor={colors.textSoft}
              />

              <Text style={styles.fieldLabel}>Light Spectrum</Text>
              <TextInput
                value={lightSpectrum}
                onChangeText={setLightSpectrum}
                placeholder="Full spectrum, 3500K, etc."
                style={styles.input}
                placeholderTextColor={colors.textSoft}
              />
            </View>

            {/* Water Section */}
            <View style={styles.envSection}>
              <Text style={styles.envSectionTitle}>💧 Water</Text>

              <Text style={styles.fieldLabel}>Water Source</Text>
              <TextInput
                value={waterSource}
                onChangeText={setWaterSource}
                placeholder="Tap, Well, RO, Spring, etc."
                style={styles.input}
                placeholderTextColor={colors.textSoft}
              />

              <Text style={styles.fieldLabel}>Water Treatment</Text>
              <TextInput
                value={waterTreatment}
                onChangeText={setWaterTreatment}
                placeholder="Straight, Bubbled 24h, RO filtered, etc."
                style={styles.input}
                placeholderTextColor={colors.textSoft}
              />

              <Text style={styles.fieldLabel}>Water pH</Text>
              <TextInput
                value={waterPH}
                onChangeText={setWaterPH}
                placeholder="e.g., 6.5"
                style={styles.input}
                placeholderTextColor={colors.textSoft}
                keyboardType="decimal-pad"
              />

              <Text style={styles.fieldLabel}>Water PPM/EC</Text>
              <TextInput
                value={waterPPM}
                onChangeText={setWaterPPM}
                placeholder="e.g., 250 ppm or 0.5 EC"
                style={styles.input}
                placeholderTextColor={colors.textSoft}
              />
            </View>

            {/* Air Section */}
            <View style={styles.envSection}>
              <Text style={styles.envSectionTitle}>🌬️ Air & Climate</Text>

              <Text style={styles.fieldLabel}>Temperature</Text>
              <TextInput
                value={temperature}
                onChangeText={setTemperature}
                placeholder="e.g., 75°F or 24°C"
                style={styles.input}
                placeholderTextColor={colors.textSoft}
              />

              <Text style={styles.fieldLabel}>Humidity (%)</Text>
              <TextInput
                value={humidity}
                onChangeText={setHumidity}
                placeholder="e.g., 60%"
                style={styles.input}
                placeholderTextColor={colors.textSoft}
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Airflow Quality</Text>
              <TextInput
                value={airflow}
                onChangeText={setAirflow}
                placeholder="Excellent, Good, Poor, etc."
                style={styles.input}
                placeholderTextColor={colors.textSoft}
              />
            </View>

            {/* Nutrients Section */}
            <View style={styles.envSection}>
              <Text style={styles.envSectionTitle}>🧪 Nutrients</Text>

              <Text style={styles.fieldLabel}>Nutrient Brand/Line</Text>
              <TextInput
                value={nutrientBrand}
                onChangeText={setNutrientBrand}
                placeholder="Fox Farm Trio, General Hydroponics, etc."
                style={styles.input}
                placeholderTextColor={colors.textSoft}
              />

              <Text style={styles.fieldLabel}>Feeding Strength</Text>
              <TextInput
                value={nutrientStrength}
                onChangeText={setNutrientStrength}
                placeholder="1/2 strength, Full strength, etc."
                style={styles.input}
                placeholderTextColor={colors.textSoft}
              />

              <Text style={styles.fieldLabel}>Feeding Schedule</Text>
              <TextInput
                value={feedingSchedule}
                onChangeText={setFeedingSchedule}
                placeholder="Every watering, Feed-Water-Water, etc."
                style={styles.input}
                placeholderTextColor={colors.textSoft}
              />
            </View>

            {/* Substrate Section */}
            <View style={styles.envSection}>
              <Text style={styles.envSectionTitle}>🌱 Growing Medium</Text>

              <Text style={styles.fieldLabel}>Substrate Type</Text>
              <TextInput
                value={substrateType}
                onChangeText={setSubstrateType}
                placeholder="Coco coir, Soil, Hydro, etc."
                style={styles.input}
                placeholderTextColor={colors.textSoft}
              />

              <Text style={styles.fieldLabel}>Substrate pH</Text>
              <TextInput
                value={substratePH}
                onChangeText={setSubstratePH}
                placeholder="e.g., 6.0"
                style={styles.input}
                placeholderTextColor={colors.textSoft}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        )}

        <PrimaryButton title="Create Grow" onPress={handleAddGrow} />
      </Card>

      <Text style={styles.label}>Your Grows</Text>

      {grows.length === 0 ? (
        <View style={{ alignItems: "center", marginTop: 40 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 10 }}>
            No grow logs yet.
          </Text>
          <Text
            style={{ fontSize: 15, color: "#444", textAlign: "center", marginBottom: 18 }}
          >
            Start a log when you want to track your plant’s journey.{"\n"}
            Sometimes, observation is enough—logging is here when you need it.
          </Text>
          <PrimaryButton title="Create your first grow" onPress={handleAddGrow} />
        </View>
      ) : (
        <FlatList
          data={grows}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingBottom: 80 }}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => openGrow(item)}>
              <Card style={{ marginBottom: spacing(4) }}>
                <Text style={styles.growName}>{item.name}</Text>
                <Text style={styles.sub}>{item.strain}</Text>
                <Text style={styles.sub}>{item.stage}</Text>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: spacing(6),
    color: colors.text
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: spacing(2),
    color: colors.text
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: spacing(1),
    marginTop: spacing(2),
    color: colors.text
  },
  input: {
    backgroundColor: "#fff",
    padding: spacing(4),
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing(3),
    color: colors.text
  },
  geneticsSection: {
    backgroundColor: "rgba(16, 185, 129, 0.05)",
    padding: spacing(4),
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: "rgba(16, 185, 129, 0.2)",
    marginBottom: spacing(4)
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.accent,
    marginBottom: spacing(3)
  },
  advancedToggle: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    padding: spacing(3),
    borderRadius: radius.card,
    marginBottom: spacing(4),
    alignItems: "center"
  },
  advancedToggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.accent
  },
  advancedSection: {
    backgroundColor: "rgba(243, 244, 246, 0.5)",
    padding: spacing(4),
    borderRadius: radius.card,
    marginBottom: spacing(4)
  },
  envSection: {
    marginBottom: spacing(5),
    paddingBottom: spacing(4),
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  envSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing(3)
  },
  growName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: spacing(1),
    color: colors.text
  },
  sub: {
    color: colors.textSoft,
    marginBottom: spacing(1)
  }
});
