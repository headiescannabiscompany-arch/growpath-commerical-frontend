import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import ScreenContainer from "../components/ScreenContainer";
import { createEntry, getEntry, updateEntry, autoTagEntry } from "../api/growlog";

export default function GrowLogEntryScreen({ route, navigation }) {
  const entryId = route.params?.id || null;
  const initialDate =
    route.params?.date || new Date().toISOString().split("T")[0];

  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState([]);
  const [entryDate, setEntryDate] = useState(initialDate);

  const [strain, setStrain] = useState("");
  const [breeder, setBreeder] = useState("");
  const [stage, setStage] = useState("veg");

  const [week, setWeek] = useState("");
  const [day, setDay] = useState("");

  const [tags, setTags] = useState([]);

  // Environment data (advanced)
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Light info
  const [lightPPFD, setLightPPFD] = useState("");
  const [lightDLI, setLightDLI] = useState("");
  const [lightModel, setLightModel] = useState("");
  const [lightDistance, setLightDistance] = useState("");
  const [lightSpectrum, setLightSpectrum] = useState("");

  // Water info
  const [waterSource, setWaterSource] = useState("tap");
  const [waterTreatment, setWaterTreatment] = useState("straight");
  const [waterPH, setWaterPH] = useState("");
  const [waterPPM, setWaterPPM] = useState("");

  // Air info
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

  const tagOptions = [
    "stretch",
    "overwatered",
    "underwatered",
    "yellowing",
    "calmag",
    "nuteburn",
    "heatstress",
    "lowhumidity",
    "highhumidity",
    "deficiency"
  ];

  useEffect(() => {
    if (entryId) {
      loadEntry();
    }
  }, []);

  async function loadEntry() {
    setLoading(true);
    const res = await getEntry(entryId);
    const e = res?.data ?? res;
    if (!e) {
      setLoading(false);
      return;
    }

    setTitle(e.title);
    setNotes(e.notes);
    setPhotos(e.photos || []);
    setStrain(e.strain || "");
    setBreeder(e.breeder || "");
    setStage(e.stage || "veg");

    setWeek(e.week ? String(e.week) : "");
    setDay(e.day ? String(e.day) : "");
    if (e.date) {
      setEntryDate(new Date(e.date).toISOString().split("T")[0]);
    }

    setTags(e.tags || []);

    // Load environment data if exists
    if (e.environment) {
      const env = e.environment;
      if (env.light) {
        setLightPPFD(env.light.ppfd || "");
        setLightDLI(env.light.dli || "");
        setLightModel(env.light.model || "");
        setLightDistance(env.light.distance || "");
        setLightSpectrum(env.light.spectrum || "");
      }
      if (env.water) {
        setWaterSource(env.water.source || "tap");
        setWaterTreatment(env.water.treatment || "straight");
        setWaterPH(env.water.ph || "");
        setWaterPPM(env.water.ppm || "");
      }
      if (env.air) {
        setTemperature(env.air.temperature || "");
        setHumidity(env.air.humidity || "");
        setAirflow(env.air.airflow || "");
      }
      if (env.nutrients) {
        setNutrientBrand(env.nutrients.brand || "");
        setNutrientStrength(env.nutrients.strength || "");
        setFeedingSchedule(env.nutrients.schedule || "");
      }
      if (env.substrate) {
        setSubstrateType(env.substrate.type || "");
        setSubstratePH(env.substrate.ph || "");
      }
    }
    setLoading(false);
  }

  // 📌 Add Photo
  async function addPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7
    });

    if (!result.canceled) {
      const newPhotos = result.assets.map((a) => a.uri);
      setPhotos([...photos, ...newPhotos]);
    }
  }

  // 📌 Toggle tags
  function toggleTag(tag) {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  }

  // 📌 Save Entry
  async function handleSave() {
    if (!title.trim()) {
      return Alert.alert("Missing Title", "Please add a title for this entry.");
    }

    const payload = {
      title,
      notes,
      photos,
      strain,
      breeder,
      stage,
      week: week ? Number(week) : null,
      day: day ? Number(day) : null,
      tags,
      date: entryDate ? new Date(entryDate) : undefined,
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

    try {
      setLoading(true);

      if (entryId) {
        await updateEntry(entryId, payload);
      } else {
        await createEntry(payload);
      }

      setLoading(false);
      navigation.goBack();
    } catch (err) {
      Alert.alert("Error", err.message);
      setLoading(false);
    }
  }

  // 📌 AI auto-tagging
  async function handleAutoTag() {
    if (!entryId) {
      return Alert.alert(
        "Save first",
        "Please save this entry before using AI auto-tagging."
      );
    }

    try {
      setLoading(true);
      const updated = await autoTagEntry(entryId);

      setTags(updated.tags || []);
      // If you want to see it right away in this screen:
      if (updated.aiInsights) {
        Alert.alert("AI Insights", updated.aiInsights);
      }

      setLoading(false);
    } catch (err) {
      setLoading(false);
      Alert.alert("Error", err.message);
    }
  }

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        <Text style={styles.header}>
          {entryId ? "Edit Grow Log Entry" : "New Grow Log Entry"}
        </Text>

        {/* Title */}
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Day 21 - Heavy stretch today…"
        />

        {/* Notes */}
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, { height: 120, textAlignVertical: "top" }]}
          multiline
          value={notes}
          onChangeText={setNotes}
          placeholder="Details about your plants..."
        />

        {/* Entry Date */}
        <Text style={styles.label}>Entry Date</Text>
        <TextInput
          style={styles.input}
          value={entryDate}
          onChangeText={setEntryDate}
          placeholder="YYYY-MM-DD"
        />

        {/* Photos */}
        <Text style={styles.label}>Photos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {photos.map((uri, i) => (
            <Image key={i} source={{ uri }} style={styles.photo} />
          ))}

          <TouchableOpacity onPress={addPhoto} style={styles.addPhotoBox}>
            <Text style={{ fontSize: 30, color: "#888" }}>+</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Genetics Section */}
        <View style={styles.geneticsSection}>
          <Text style={styles.sectionTitle}>🧬 Plant Genetics</Text>

          <Text style={styles.label}>Strain</Text>
          <TextInput
            style={styles.input}
            value={strain}
            onChangeText={setStrain}
            placeholder="Blueberry Muffin, Gelato #33…"
          />

          <Text style={styles.label}>Breeder</Text>
          <TextInput
            style={styles.input}
            value={breeder}
            onChangeText={setBreeder}
            placeholder="Mephisto, Ethos, In House Genetics…"
          />
        </View>

        {/* Stage Picker */}
        <Text style={styles.label}>Stage</Text>
        <View style={styles.stageRow}>
          {["seedling", "veg", "flower"].map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.stageButton, stage === s && styles.stageButtonActive]}
              onPress={() => setStage(s)}
            >
              <Text style={stage === s ? styles.stageTextActive : styles.stageText}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Week & Day */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Week</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={week}
              onChangeText={setWeek}
              placeholder="5"
            />
          </View>
          <View style={{ width: 20 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Day</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={day}
              onChangeText={setDay}
              placeholder="3"
            />
          </View>
        </View>

        {/* Tags */}
        <Text style={styles.label}>Tags</Text>
        <View style={styles.tagsContainer}>
          {tagOptions.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tag, tags.includes(t) && styles.tagSelected]}
              onPress={() => toggleTag(t)}
            >
              <Text style={tags.includes(t) ? styles.tagTextSelected : styles.tagText}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* AI Auto-tag Button (edit mode only) */}
        {entryId && (
          <TouchableOpacity
            onPress={handleAutoTag}
            style={styles.aiButton}
            disabled={loading}
          >
            <Text style={styles.aiButtonText}>
              {loading ? "Analyzing..." : "🤖 Auto-tag with AI"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Advanced Environment Data Toggle */}
        <TouchableOpacity
          style={styles.advancedToggle}
          onPress={() => setShowAdvanced(!showAdvanced)}
        >
          <Text style={styles.advancedToggleText}>
            {showAdvanced ? "▼" : "▶"} Advanced: Environment Details (Track full grow
            conditions)
          </Text>
        </TouchableOpacity>

        {showAdvanced && (
          <View style={styles.advancedSection}>
            {/* LIGHT SECTION */}
            <View style={styles.envSection}>
              <Text style={styles.envSectionTitle}>💡 Light Information</Text>

              <View style={styles.infoBox}>
                <Text style={styles.infoBoxTitle}>📱 Measure PPFD/DLI</Text>
                <Text style={styles.infoBoxText}>
                  Download "Photone" app to measure light intensity. Aim for 400-600 PPFD
                  in veg, 600-900 in flower.
                </Text>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>PPFD (μmol/m²/s)</Text>
                  <TextInput
                    style={styles.input}
                    value={lightPPFD}
                    onChangeText={setLightPPFD}
                    placeholder="650"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>DLI (mol/m²/day)</Text>
                  <TextInput
                    style={styles.input}
                    value={lightDLI}
                    onChangeText={setLightDLI}
                    placeholder="35"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.label}>Light Model/Brand</Text>
              <TextInput
                style={styles.input}
                value={lightModel}
                onChangeText={setLightModel}
                placeholder="Spider Farmer SF-4000, HLG 650R"
              />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Distance from canopy</Text>
                  <TextInput
                    style={styles.input}
                    value={lightDistance}
                    onChangeText={setLightDistance}
                    placeholder='18" or 45cm'
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Spectrum</Text>
                  <TextInput
                    style={styles.input}
                    value={lightSpectrum}
                    onChangeText={setLightSpectrum}
                    placeholder="Full, Veg, Bloom"
                  />
                </View>
              </View>
            </View>

            {/* WATER SECTION */}
            <View style={styles.envSection}>
              <Text style={styles.envSectionTitle}>💧 Water Information</Text>

              <Text style={styles.label}>Water Source</Text>
              <View style={styles.buttonRow}>
                {["tap", "well", "city"].map((src) => (
                  <TouchableOpacity
                    key={src}
                    style={[
                      styles.optionButton,
                      waterSource === src && styles.optionButtonActive
                    ]}
                    onPress={() => setWaterSource(src)}
                  >
                    <Text
                      style={
                        waterSource === src ? styles.optionTextActive : styles.optionText
                      }
                    >
                      {src}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Water Treatment</Text>
              <View style={styles.buttonRow}>
                {[
                  { key: "straight", label: "Straight" },
                  { key: "bubbled", label: "Bubbled/Aged" },
                  { key: "ro", label: "RO Filtered" }
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.optionButton,
                      waterTreatment === opt.key && styles.optionButtonActive
                    ]}
                    onPress={() => setWaterTreatment(opt.key)}
                  >
                    <Text
                      style={
                        waterTreatment === opt.key
                          ? styles.optionTextActive
                          : styles.optionText
                      }
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Water pH</Text>
                  <TextInput
                    style={styles.input}
                    value={waterPH}
                    onChangeText={setWaterPH}
                    placeholder="6.0-6.5"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>PPM/EC</Text>
                  <TextInput
                    style={styles.input}
                    value={waterPPM}
                    onChangeText={setWaterPPM}
                    placeholder="800 ppm"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* AIR SECTION */}
            <View style={styles.envSection}>
              <Text style={styles.envSectionTitle}>🌬️ Air & Climate</Text>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Temperature (°F)</Text>
                  <TextInput
                    style={styles.input}
                    value={temperature}
                    onChangeText={setTemperature}
                    placeholder="75-82°F"
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Humidity (%)</Text>
                  <TextInput
                    style={styles.input}
                    value={humidity}
                    onChangeText={setHumidity}
                    placeholder="50-60%"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <Text style={styles.label}>Airflow</Text>
              <View style={styles.buttonRow}>
                {["poor", "moderate", "good", "excellent"].map((flow) => (
                  <TouchableOpacity
                    key={flow}
                    style={[
                      styles.optionButton,
                      airflow === flow && styles.optionButtonActive
                    ]}
                    onPress={() => setAirflow(flow)}
                  >
                    <Text
                      style={
                        airflow === flow ? styles.optionTextActive : styles.optionText
                      }
                    >
                      {flow}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* NUTRIENTS SECTION */}
            <View style={styles.envSection}>
              <Text style={styles.envSectionTitle}>🧪 Nutrients</Text>

              <Text style={styles.label}>Nutrient Brand/Line</Text>
              <TextInput
                style={styles.input}
                value={nutrientBrand}
                onChangeText={setNutrientBrand}
                placeholder="General Hydroponics, Fox Farm, etc."
              />

              <Text style={styles.label}>Feeding Strength</Text>
              <TextInput
                style={styles.input}
                value={nutrientStrength}
                onChangeText={setNutrientStrength}
                placeholder="Half strength, full strength, etc."
              />

              <Text style={styles.label}>Feeding Schedule</Text>
              <TextInput
                style={styles.input}
                value={feedingSchedule}
                onChangeText={setFeedingSchedule}
                placeholder="Feed-feed-water, every watering, etc."
              />
            </View>

            {/* SUBSTRATE SECTION */}
            <View style={styles.envSection}>
              <Text style={styles.envSectionTitle}>🌱 Substrate/Medium</Text>

              <Text style={styles.label}>Substrate Type</Text>
              <TextInput
                style={styles.input}
                value={substrateType}
                onChangeText={setSubstrateType}
                placeholder="Soil, Coco coir, Hydro, etc."
              />

              <Text style={styles.label}>Substrate pH</Text>
              <TextInput
                style={styles.input}
                value={substratePH}
                onChangeText={setSubstratePH}
                placeholder="6.0-6.5 (soil), 5.5-6.0 (hydro)"
                keyboardType="numeric"
              />
            </View>
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          style={styles.saveButton}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? "Saving..." : "Save Entry"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = {
  header: { fontSize: 24, fontWeight: "700", marginBottom: 15 },
  label: { marginTop: 15, marginBottom: 5, fontWeight: "600" },
  input: {
    backgroundColor: "#f0f0f0",
    padding: 10,
    borderRadius: 8
  },
  photo: {
    width: 90,
    height: 90,
    borderRadius: 10,
    marginRight: 10
  },
  addPhotoBox: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: "#eaeaea",
    justifyContent: "center",
    alignItems: "center"
  },
  stageRow: { flexDirection: "row", marginTop: 5 },
  stageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#eaeaea",
    marginRight: 10
  },
  stageButtonActive: { backgroundColor: "#2ecc71" },
  stageText: { color: "#555" },
  stageTextActive: { color: "#fff" },
  row: { flexDirection: "row", marginTop: 10 },
  tagsContainer: { flexDirection: "row", flexWrap: "wrap", marginTop: 5 },
  tag: {
    backgroundColor: "#ddd",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8
  },
  tagSelected: { backgroundColor: "#2ecc71" },
  tagText: { color: "#333" },
  tagTextSelected: { color: "#fff" },
  aiButton: {
    marginTop: 10,
    backgroundColor: "#3498db",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center"
  },
  aiButtonText: {
    color: "white",
    fontWeight: "600"
  },
  saveButton: {
    marginTop: 30,
    backgroundColor: "#27ae60",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center"
  },
  saveButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600"
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    marginTop: 8
  },
  geneticsSection: {
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#10B981"
  },
  advancedToggle: {
    backgroundColor: "#F3F4F6",
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 8
  },
  advancedToggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981"
  },
  advancedSection: {
    backgroundColor: "#F9FAFB",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16
  },
  envSection: {
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB"
  },
  envSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12
  },
  infoBox: {
    backgroundColor: "#DBEAFE",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#3B82F6"
  },
  infoBoxTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E40AF",
    marginBottom: 4
  },
  infoBoxText: {
    fontSize: 12,
    color: "#1E3A8A",
    lineHeight: 18
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
    marginTop: 5
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB"
  },
  optionButtonActive: {
    backgroundColor: "#10B981",
    borderColor: "#10B981"
  },
  optionText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
    textTransform: "capitalize"
  },
  optionTextActive: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
    textTransform: "capitalize"
  }
};
