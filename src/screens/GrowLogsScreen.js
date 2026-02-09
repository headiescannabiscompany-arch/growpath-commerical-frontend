import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet
} from "react-native";
import * as ImagePicker from "expo-image-picker";

import ScreenContainer from "../components/ScreenContainer.js";
import Card from "../components/Card.js";
import PrimaryButton from "../components/PrimaryButton.js";
import InlineError from "../components/InlineError";
import { useApiErrorHandler } from "../hooks/useApiErrorHandler";

import { colors, spacing, radius } from "../theme/theme.js";
import { createGrow, listGrows } from "../api/grows.js";
import { FEATURES, getEntitlement } from "../utils/entitlements.js";

function GrowLogsScreen() {
  const { user } = useAuth();

  const [grows, setGrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rawError, setRawError] = useState(null);

  const [name, setName] = useState("");
  const [genetics, setGenetics] = useState("");
  const [stage, setStage] = useState("");
  const [photo, setPhoto] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [waterPH, setWaterPH] = useState("");
  const [waterPPM, setWaterPPM] = useState("");
  const [temperature, setTemperature] = useState("");
  const [humidity, setHumidity] = useState("");
  const [airflow, setAirflow] = useState("");
  const [nutrientBrand, setNutrientBrand] = useState("");
  const [nutrientStrength, setNutrientStrength] = useState("");
  const [feedingSchedule, setFeedingSchedule] = useState("");
  const [substrateType, setSubstrateType] = useState("");
  const [substratePH, setSubstratePH] = useState("");

  // Entitlements
  const multiGrowEnt = getEntitlement(FEATURES.MULTIPLE_GROWS, user?.role);
  const photoEnt = getEntitlement(FEATURES.GROW_PHOTO, user?.role);
  const advancedEnt = getEntitlement(FEATURES.GROW_ADVANCED, user?.role);

  const { toInlineError } = useApiErrorHandler();
  const inlineError = useMemo(
    () => (rawError ? toInlineError(rawError) : null),
    [rawError, toInlineError]
  );

  const loadGrows = async () => {
    setLoading(true);
    setRawError(null);
    try {
      const data = await listGrows();
      setGrows(Array.isArray(data) ? data : []);
    } catch (e) {
      setGrows([]);
      setRawError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGrows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddGrow = async () => {
    if (multiGrowEnt !== "enabled") {
      setRawError({
        code: "upgrade_required",
        message: "Upgrade your plan to add more grows."
      });
      return;
    }

    try {
      setRawError(null);
      // TODO: build real payload from your state fields
      const created = await createGrow({
        name,
        genetics,
        stage,
        photo,
        advanced:
          advancedEnt === "enabled"
            ? {
                waterPH,
                waterPPM,
                temperature,
                humidity,
                airflow,
                nutrientBrand,
                nutrientStrength,
                feedingSchedule,
                substrateType,
                substratePH
              }
            : undefined
      });

      if (created && (created._id || created.id)) {
        setGrows((prev) => [created, ...prev]);
      } else {
        await loadGrows();
      }

      setName("");
      setGenetics("");
      setStage("");
      setPhoto(null);
    } catch (e) {
      setRawError(e);
    }
  };

  const openGrow = (grow) => {
    // keep your navigation logic as-is (omitted in your snippet)
  };

  const handlePickPhoto = async () => {
    if (photoEnt !== "enabled") {
      setRawError({
        code: "upgrade_required",
        message: "Upgrade to add photos to your grow log."
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhoto(result.assets[0].uri);
    }
  };

  return (
    <ScreenContainer>
      {inlineError ? (
        <InlineError
          error={inlineError}
          onRetry={() => loadGrows()}
          style={{ marginBottom: spacing(4) }}
        />
      ) : null}

      <Card style={{ marginBottom: spacing(6) }}>
        <Text style={styles.title}>Create a Grow Log</Text>

        <Text style={styles.fieldLabel}>Grow Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g., Spring 2026"
          style={styles.input}
          placeholderTextColor={colors.textSoft}
        />

        <Text style={styles.fieldLabel}>Genetics</Text>
        <TextInput
          value={genetics}
          onChangeText={setGenetics}
          placeholder="Strain, breeder, etc."
          style={styles.input}
          placeholderTextColor={colors.textSoft}
        />

        <Text style={styles.fieldLabel}>Stage</Text>
        <TextInput
          value={stage}
          onChangeText={setStage}
          placeholder="Seedling, Veg, Flower, etc."
          style={styles.input}
          placeholderTextColor={colors.textSoft}
        />

        {/* Photo upload (gated) */}
        <TouchableOpacity
          style={[styles.addPlantButton, photoEnt !== "enabled" && { opacity: 0.5 }]}
          onPress={handlePickPhoto}
          disabled={photoEnt !== "enabled"}
        >
          <Text style={styles.addPlantButtonText}>
            {photoEnt === "cta" ? "Upgrade to add photo" : "Add Grow Photo"}
          </Text>
        </TouchableOpacity>
        {photo ? (
          <Text style={{ color: colors.textSoft, marginTop: spacing(1) }}>
            Photo selected
          </Text>
        ) : null}

        {/* Advanced toggle (still visible; advancedEnt can be enforced at save-time) */}
        <TouchableOpacity
          style={styles.advancedToggle}
          onPress={() => setShowAdvanced((v) => !v)}
        >
          <Text style={styles.advancedToggleText}>
            {showAdvanced ? "Hide Advanced" : "Show Advanced"}
          </Text>
        </TouchableOpacity>

        {showAdvanced ? (
          <View
            style={[
              styles.advancedSection,
              advancedEnt !== "enabled" && { opacity: 0.6 }
            ]}
          >
            {/* Water */}
            <View style={styles.envSection}>
              <Text style={styles.envSectionTitle}>💧 Water</Text>
              <Text style={styles.fieldLabel}>Water pH</Text>
              <TextInput
                value={waterPH}
                onChangeText={setWaterPH}
                placeholder="e.g., 6.5"
                style={styles.input}
                placeholderTextColor={colors.textSoft}
                keyboardType="decimal-pad"
                editable={advancedEnt === "enabled"}
              />
              <Text style={styles.fieldLabel}>Water PPM/EC</Text>
              <TextInput
                value={waterPPM}
                onChangeText={setWaterPPM}
                placeholder="e.g., 250 ppm or 0.5 EC"
                style={styles.input}
                placeholderTextColor={colors.textSoft}
                editable={advancedEnt === "enabled"}
              />
            </View>

            {/* Air */}
            <View style={styles.envSection}>
              <Text style={styles.envSectionTitle}>🌬️ Air & Climate</Text>
              <Text style={styles.fieldLabel}>Temperature</Text>
              <TextInput
                value={temperature}
                onChangeText={setTemperature}
                placeholder="e.g., 75°F or 24°C"
                style={styles.input}
                placeholderTextColor={colors.textSoft}
                editable={advancedEnt === "enabled"}
              />
              <Text style={styles.fieldLabel}>Humidity (%)</Text>
              <TextInput
                value={humidity}
                onChangeText={setHumidity}
                placeholder="e.g., 60%"
                style={styles.input}
                placeholderTextColor={colors.textSoft}
                keyboardType="numeric"
                editable={advancedEnt === "enabled"}
              />
              <Text style={styles.fieldLabel}>Airflow Quality</Text>
              <TextInput
                value={airflow}
                onChangeText={setAirflow}
                placeholder="Excellent, Good, Poor, etc."
                style={styles.input}
                placeholderTextColor={colors.textSoft}
                editable={advancedEnt === "enabled"}
              />
            </View>

            {/* Nutrients */}
            <View style={styles.envSection}>
              <Text style={styles.envSectionTitle}>🧪 Nutrients</Text>
              <Text style={styles.fieldLabel}>Nutrient Brand/Line</Text>
              <TextInput
                value={nutrientBrand}
                onChangeText={setNutrientBrand}
                placeholder="Fox Farm Trio, General Hydroponics, etc."
                style={styles.input}
                placeholderTextColor={colors.textSoft}
                editable={advancedEnt === "enabled"}
              />
              <Text style={styles.fieldLabel}>Feeding Strength</Text>
              <TextInput
                value={nutrientStrength}
                onChangeText={setNutrientStrength}
                placeholder="1/2 strength, Full strength, etc."
                style={styles.input}
                placeholderTextColor={colors.textSoft}
                editable={advancedEnt === "enabled"}
              />
              <Text style={styles.fieldLabel}>Feeding Schedule</Text>
              <TextInput
                value={feedingSchedule}
                onChangeText={setFeedingSchedule}
                placeholder="Every watering, Feed-Water-Water, etc."
                style={styles.input}
                placeholderTextColor={colors.textSoft}
                editable={advancedEnt === "enabled"}
              />
            </View>

            {/* Substrate */}
            <View style={styles.envSection}>
              <Text style={styles.envSectionTitle}>🌱 Growing Medium</Text>
              <Text style={styles.fieldLabel}>Substrate Type</Text>
              <TextInput
                value={substrateType}
                onChangeText={setSubstrateType}
                placeholder="Coco coir, Soil, Hydro, etc."
                style={styles.input}
                placeholderTextColor={colors.textSoft}
                editable={advancedEnt === "enabled"}
              />
              <Text style={styles.fieldLabel}>Substrate pH</Text>
              <TextInput
                value={substratePH}
                onChangeText={setSubstratePH}
                placeholder="e.g., 6.0"
                style={styles.input}
                placeholderTextColor={colors.textSoft}
                keyboardType="decimal-pad"
                editable={advancedEnt === "enabled"}
              />
            </View>

            {advancedEnt !== "enabled" ? (
              <Text style={{ color: colors.textSoft }}>
                Advanced fields are locked on your plan.
              </Text>
            ) : null}
          </View>
        ) : null}

        <PrimaryButton
          title="button"
          onPress={handleAddGrow}
          disabled={multiGrowEnt !== "enabled"}
          style={{ marginTop: spacing(3) }}
          testID="create-grow-button"
        >
          <Text style={styles.addPlantButtonText}>
            {multiGrowEnt === "cta"
              ? "Upgrade to add multiple grows"
              : multiGrowEnt === "enabled"
                ? "Create Grow"
                : "Grow (Locked)"}
          </Text>
        </PrimaryButton>
      </Card>

      <Text style={styles.label}>Your Grows</Text>

      {loading ? (
        <Text>Loading...</Text>
      ) : grows.length === 0 ? (
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

          <PrimaryButton
            title="button"
            onPress={handleAddGrow}
            disabled={multiGrowEnt !== "enabled"}
            style={{ marginTop: spacing(3) }}
          >
            <Text style={styles.addPlantButtonText}>Create your first grow</Text>
          </PrimaryButton>
        </View>
      ) : (
        <FlatList
          data={grows}
          keyExtractor={(item, idx) =>
            String(item?._id ?? item?.id ?? item?.growId ?? idx)
          }
          contentContainerStyle={{ paddingBottom: 80 }}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => openGrow(item)}>
              <Card
                style={{ marginBottom: spacing(4) }}
                testID={`grow-card-${item?._id ?? item?.id}`}
              >
                <Text style={styles.growName}>{item?.name}</Text>

                {Array.isArray(item?.plants) && item.plants.length > 0 ? (
                  <View style={styles.plantPillWrap}>
                    {item.plants.map((plant) => (
                      <View
                        key={plant?._id ?? plant?.id ?? plant?.name}
                        style={styles.plantPill}
                      >
                        <Text style={styles.plantPillName}>
                          {plant?.name || plant?.strain || "Unnamed Plant"}
                        </Text>
                        {plant?.strain ? (
                          <Text style={styles.plantPillMeta}>{plant.strain}</Text>
                        ) : null}
                        {plant?.stage ? (
                          <Text style={styles.plantPillMeta}>{plant.stage}</Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : item?.stage ? (
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

export default GrowLogsScreen;

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
