import React, { useEffect, useState, useMemo } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import ScreenContainer from "../components/ScreenContainer";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import { colors, spacing, radius } from "../theme/theme";
import { createGrow, listGrows } from "../api/grows";
import { uploadPlantPhoto } from "../api/plants";
import PlantCard from "../components/PlantCard";

const hasValue = (value) => {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  return value !== undefined && value !== null;
};

const pruneSection = (section) => {
  if (!section) return undefined;
  const cleaned = Object.fromEntries(
    Object.entries(section).filter(([, value]) => hasValue(value))
  );
  return Object.keys(cleaned).length ? cleaned : undefined;
};

const buildEmptyPlant = () => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: "",
  strain: "",
  breeder: "",
  stage: "",
  photoUrl: null,
  photoPreview: null,
  uploadingPhoto: false
});

export default function GrowLogsScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [grows, setGrows] = useState([]);
  const [newName, setNewName] = useState("");
  const [newBreeder, setNewBreeder] = useState("");
  const [plantForms, setPlantForms] = useState([buildEmptyPlant()]);

  const [stageFilter, setStageFilter] = useState("");
  const [breederFilter, setBreederFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

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

  const filterValues = useMemo(
    () => ({
      stage: stageFilter.trim() || undefined,
      breeder: breederFilter.trim() || undefined,
      search: searchFilter.trim() || undefined
    }),
    [stageFilter, breederFilter, searchFilter]
  );

  async function loadGrows(customFilters) {
    try {
      setLoading(true);
      const filtersToUse =
        customFilters !== undefined
          ? customFilters
          : filterValues;
      const data = await listGrows(filtersToUse);
      setGrows(Array.isArray(data) ? data : []);
    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGrows({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClearFilters = () => {
    setStageFilter("");
    setBreederFilter("");
    setSearchFilter("");
    loadGrows({});
  };

  const buildEnvironmentPayload = () => {
    const environment = {
      light: pruneSection({
        ppfd: lightPPFD,
        dli: lightDLI,
        model: lightModel,
        distance: lightDistance,
        spectrum: lightSpectrum
      }),
      water: pruneSection({
        source: waterSource,
        treatment: waterTreatment,
        ph: waterPH,
        ppm: waterPPM
      }),
      air: pruneSection({
        temperature,
        humidity,
        airflow
      }),
      nutrients: pruneSection({
        brand: nutrientBrand,
        strength: nutrientStrength,
        schedule: feedingSchedule
      }),
      substrate: pruneSection({
        type: substrateType,
        ph: substratePH
      })
    };
    const cleaned = Object.fromEntries(
      Object.entries(environment).filter(([, value]) => value)
    );
    return Object.keys(cleaned).length ? cleaned : undefined;
  };

  const sanitizedPlants = () => {
    const cleaned = plantForms
      .map((plant) => ({
        name: (plant.name || "").trim(),
        strain: (plant.strain || "").trim(),
        breeder: (plant.breeder || "").trim(),
        stage: (plant.stage || "").trim(),
        photos: plant.photoUrl ? [plant.photoUrl] : []
      }))
      .map((plant) => ({
        name: plant.name || undefined,
        strain: plant.strain || undefined,
        breeder: plant.breeder || undefined,
        stage: plant.stage || undefined,
        photos: plant.photos && plant.photos.length ? plant.photos : undefined
      }))
      .filter(
        (plant) =>
          plant.name || plant.strain || plant.breeder || plant.stage || (plant.photos && plant.photos.length)
      );
    return cleaned;
  };

  const addPlantForm = () => {
    setPlantForms((prev) => [...prev, buildEmptyPlant()]);
  };

  const updatePlantField = (key, field, value) => {
    setPlantForms((prev) =>
      prev.map((plant) => (plant.key === key ? { ...plant, [field]: value } : plant))
    );
  };

  const updatePlantState = (key, updates) => {
    setPlantForms((prev) =>
      prev.map((plant) => (plant.key === key ? { ...plant, ...updates } : plant))
    );
  };

  const removePlantForm = (key) => {
    setPlantForms((prev) => (prev.length <= 1 ? prev : prev.filter((plant) => plant.key !== key)));
  };

  async function handleAddPlantPhoto(key) {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Photo library access is required to add plant photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;
    const file = {
      uri: asset.uri,
      type: asset.mimeType || "image/jpeg",
      name: asset.fileName || asset.uri.split("/").pop() || "plant-photo.jpg"
    };
    updatePlantState(key, { uploadingPhoto: true });
    try {
      const uploaded = await uploadPlantPhoto(file);
      if (uploaded?.url) {
        updatePlantState(key, { photoUrl: uploaded.url, photoPreview: asset.uri });
      }
    } catch (err) {
      Alert.alert("Upload failed", err.message || "Unable to upload plant photo.");
    } finally {
      updatePlantState(key, { uploadingPhoto: false });
    }
  }

  async function handleAddGrow() {
    if (!newName.trim()) return Alert.alert("Missing name");
    const plantPayloads = sanitizedPlants();
    if (!plantPayloads.length) {
      return Alert.alert(
        "Add plant details",
        "Each grow needs at least one plant. Add a plant name or strain before saving."
      );
    }

    try {
      const environment = buildEnvironmentPayload();
      const growData = {
        name: newName.trim(),
        breeder: newBreeder.trim() || undefined,
        ...(environment ? { environment } : {}),
        plants: plantPayloads
      };

      const grow = await createGrow(growData);
      setGrows((prev) => [grow, ...prev]);

      // Reset all fields
      setNewName("");
      setNewBreeder("");
      setPlantForms([buildEmptyPlant()]);
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
      await loadGrows();
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  }

  function openGrow(grow) {
    navigation.navigate("GrowJournal", { grow });
  }

  return (
    <ScreenContainer scroll testID="growlogs-scroll">
      <Text style={styles.title}>Your Plants</Text>

      <Card style={styles.filterCard}>
        <Text style={styles.label}>Filter Grows</Text>
        <TextInput
          value={stageFilter}
          onChangeText={setStageFilter}
          placeholder="Stage (e.g., veg, flower)"
          style={styles.input}
          placeholderTextColor={colors.textSoft}
        />
        <TextInput
          value={breederFilter}
          onChangeText={setBreederFilter}
          placeholder="Breeder"
          style={styles.input}
          placeholderTextColor={colors.textSoft}
        />
        <TextInput
          value={searchFilter}
          onChangeText={setSearchFilter}
          placeholder="Search grow name or breeder"
          style={styles.input}
          placeholderTextColor={colors.textSoft}
        />
        <PrimaryButton
          title={loading ? "Loading..." : "Apply Filters"}
          onPress={() => loadGrows()}
          disabled={loading}
          testID="apply-grow-filters"
        />
        <TouchableOpacity style={styles.clearFilters} onPress={handleClearFilters}>
          <Text style={styles.clearText}>Clear Filters</Text>
        </TouchableOpacity>
      </Card>

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
        <TextInput
          value={newBreeder}
          onChangeText={setNewBreeder}
          placeholder="Breeder"
          style={styles.input}
          placeholderTextColor={colors.textSoft}
        />

        <View style={styles.geneticsSection}>
          <Text style={styles.sectionTitle}>🧬 Plants in this grow</Text>

          {plantForms.map((plant, index) => (
            <PlantCard
              key={plant.key}
              mode="create"
              title={`Plant ${index + 1}`}
              value={plant}
              allowRemove={plantForms.length > 1}
              onRemove={() => removePlantForm(plant.key)}
              onChange={(field, text) => updatePlantField(plant.key, field, text)}
              onAddPhoto={() => handleAddPlantPhoto(plant.key)}
              uploadingPhoto={plant.uploadingPhoto}
            />
          ))}

          <TouchableOpacity style={styles.addPlantButton} onPress={addPlantForm}>
            <Text style={styles.addPlantButtonText}>+ Add another plant</Text>
          </TouchableOpacity>
        </View>

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

        <PrimaryButton
          title="Create Grow"
          onPress={handleAddGrow}
          testID="create-grow-button"
        />
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
              <Card style={{ marginBottom: spacing(4) }} testID={`grow-card-${item._id}`}>
                <Text style={styles.growName}>{item.name}</Text>
                {Array.isArray(item.plants) && item.plants.length > 0 ? (
                  <View style={styles.plantPillWrap}>
                    {item.plants.map((plant) => (
                      <View key={plant._id || plant.name} style={styles.plantPill}>
                        <Text style={styles.plantPillName}>
                          {plant.name || plant.strain || "Unnamed Plant"}
                        </Text>
                        {plant.strain ? (
                          <Text style={styles.plantPillMeta}>{plant.strain}</Text>
                        ) : null}
                        {plant.stage ? (
                          <Text style={styles.plantPillMeta}>{plant.stage}</Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : item.stage ? (
                  <Text style={styles.sub}>{item.stage}</Text>
                ) : null}
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
  addPlantButton: {
    padding: spacing(3),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: "center",
    marginTop: spacing(2)
  },
  addPlantButtonText: {
    color: colors.accent,
    fontWeight: "600"
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
  plantPillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing(1)
  },
  plantPill: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderRadius: radius.pill,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    marginBottom: spacing(1)
  },
  plantPillName: {
    fontWeight: "600",
    color: colors.text
  },
  plantPillMeta: {
    fontSize: 12,
    color: colors.textSoft
  },
  sub: {
    color: colors.textSoft,
    marginBottom: spacing(1)
  },
  filterCard: {
    marginBottom: spacing(6)
  },
  clearFilters: {
    alignItems: "center",
    marginTop: spacing(2)
  },
  clearText: {
    color: colors.accent,
    fontWeight: "600"
  }
});
