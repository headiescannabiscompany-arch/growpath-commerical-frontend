import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Alert
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import ScreenContainer from "../components/ScreenContainer";
import PrimaryButton from "../components/PrimaryButton";
import TokenBalanceWidget from "../components/TokenBalanceWidget";
import { analyzeDiagnosis, diagnoseImage } from "../api/diagnose";
import { useAuth } from "../context/AuthContext";
import { requirePro, handleApiError } from "../utils/proHelper";

export default function DiagnoseScreen({ route, navigation }) {
  const { isPro } = useAuth();
  const photosFromLog = route.params?.photos || [];
  const notesFromLog = route.params?.notes || "";
  const fromGrowLogId = route.params?.fromGrowLogId || null;

  const [photos, setPhotos] = useState([]);
  const [notes, setNotes] = useState("");
  const [stage, setStage] = useState("veg");
  const [strain, setStrain] = useState("");
  const [breeder, setBreeder] = useState("");

  // Environment data
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Light info
  const [lightPPFD, setLightPPFD] = useState("");
  const [lightDLI, setLightDLI] = useState("");
  const [lightModel, setLightModel] = useState("");
  const [lightDistance, setLightDistance] = useState("");
  const [lightSpectrum, setLightSpectrum] = useState(""); // Full spectrum, bloom, veg, etc.

  // Water info
  const [waterSource, setWaterSource] = useState("tap"); // tap, well, city, ro
  const [waterTreatment, setWaterTreatment] = useState("straight"); // straight, bubbled, ro
  const [waterPH, setWaterPH] = useState("");
  const [waterPPM, setWaterPPM] = useState("");

  // Air info
  const [temperature, setTemperature] = useState("");
  const [humidity, setHumidity] = useState("");
  const [airflow, setAirflow] = useState(""); // poor, moderate, good, excellent

  // Nutrients
  const [nutrientBrand, setNutrientBrand] = useState("");
  const [nutrientStrength, setNutrientStrength] = useState("");
  const [feedingSchedule, setFeedingSchedule] = useState("");

  // Substrate
  const [substrateType, setSubstrateType] = useState(""); // soil, coco, hydro, etc.
  const [substratePH, setSubstratePH] = useState("");

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Prefill when coming from Grow Log
  useEffect(() => {
    if (photosFromLog.length > 0) {
      setPhotos(photosFromLog);
    }
    if (notesFromLog) {
      setNotes(notesFromLog);
    }

    if (photosFromLog.length > 0 || notesFromLog) {
      runDiagnosis(photosFromLog, notesFromLog);
    }
  }, []);

  // Take photo with camera
  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Camera permission is required to take photos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [4, 3]
    });

    if (!result.canceled && result.assets[0]) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  }

  // Pick photos from library
  async function pickPhotos() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Photo library permission is required.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7
    });

    if (!result.canceled) {
      const uris = result.assets.map((a) => a.uri);
      setPhotos([...photos, ...uris]);
    }
  }

  // Show photo options
  function showPhotoOptions() {
    Alert.alert("Add Photo", "Choose how to add a photo", [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Library", onPress: pickPhotos },
      { text: "Cancel", style: "cancel" }
    ]);
  }

  async function runDiagnosis(pOverride, nOverride) {
    // PRO feature check
    if (!isPro) {
      Alert.alert(
        "GrowPath Philosophy",
        "AI tools are here to help you learn and grow as a cultivator. Upgrade to PRO to unlock daily AI tokens and deepen your understanding with every diagnosis. Remember: your own observations and experience are always your most valuable tools—AI is just a guide on your path.",
        [
          { text: "Learn More", onPress: () => navigation.navigate("Paywall") },
          { text: "Cancel", style: "cancel" }
        ]
      );
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const payload = {
        photos: pOverride || photos,
        notes: nOverride != null ? nOverride : notes,
        stage,
        strain,
        breeder,
        fromGrowLogId,
        // Environment data
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

      const res = await analyzeDiagnosis(payload);
      setResult(res.data || res);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      // Check if it's a token error
      if (err.response?.status === 403 && err.response?.data?.aiTokens !== undefined) {
        Alert.alert(
          "🤖 Insufficient AI Tokens",
          err.response.data.message +
            "\n\nUpgrade to Pro for 100 daily tokens, or wait for your weekly refresh.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Upgrade to Pro", onPress: () => navigation.navigate("Subscription") }
          ]
        );
      } else if (!handleApiError(err, navigation)) {
        Alert.alert("Error", err.message);
      }
    }
  }

  async function runVision() {
    // PRO feature check
    if (!isPro) {
      navigation.navigate("Paywall");
      return;
    }

    if (!photos.length)
      return Alert.alert("Photo required", "Add at least one photo to analyze.");
    try {
      setLoading(true);
      const res = await diagnoseImage(photos[0]);
      setLoading(false);
      navigation.navigate("DiagnoseResult", {
        diagnostics: res.data.diagnostics,
        photo: photos[0]
      });
    } catch (err) {
      setLoading(false);
      Alert.alert("Error", err.message || "Vision analysis failed");
    }
  }

  function severityLabel(level) {
    if (!level) return "Unknown";
    if (level <= 1) return "Very mild";
    if (level === 2) return "Mild";
    if (level === 3) return "Moderate";
    if (level === 4) return "Severe";
    return "Very severe";
  }

  return (
    <ScreenContainer scroll>
      <View
        style={{
          marginBottom: 18,
          backgroundColor: "#F0FDF4",
          borderRadius: 8,
          padding: 12
        }}
      >
        <Text
          style={{ color: "#10B981", fontWeight: "600", fontSize: 15, marginBottom: 2 }}
        >
          AI is your second opinion.
        </Text>
        <Text style={{ color: "#222", fontSize: 13 }}>
          Use this tool to get another perspective, not a final answer. Trust your own
          observations and experience—AI is here to help you learn, not to replace your
          judgment.
        </Text>
      </View>
      <Text style={styles.header}>AI Diagnose</Text>
      <Text style={styles.subtitle}>
        Cost: {photos.length > 0 ? "2" : "1"} token{photos.length > 0 ? "s" : ""}
      </Text>

      <TokenBalanceWidget />

      {/* Photos row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 16 }}
      >
        {photos.map((uri, i) => (
          <Image key={i} source={{ uri }} style={styles.photo} />
        ))}

        <TouchableOpacity style={styles.addPhotoBox} onPress={showPhotoOptions}>
          <Text style={{ fontSize: 28, color: "#10B981", fontWeight: "bold" }}>📷</Text>
          <Text style={{ fontSize: 10, color: "#666", marginTop: 4 }}>Add Photo</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Plant Genetics */}
      <View style={styles.geneticsSection}>
        <Text style={styles.sectionTitle}>🧬 Plant Genetics (optional)</Text>

        <Text style={styles.label}>Strain</Text>
        <TextInput
          style={styles.input}
          value={strain}
          onChangeText={setStrain}
          placeholder="Blueberry Muffin, Gelato #33, etc."
        />

        <Text style={styles.label}>Breeder</Text>
        <TextInput
          style={styles.input}
          value={breeder}
          onChangeText={setBreeder}
          placeholder="Mephisto, Ethos, In House Genetics, etc."
        />
      </View>

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

      {/* Notes */}
      <Text style={styles.label}>Describe what you see</Text>
      <TextInput
        style={[styles.input, { height: 120, textAlignVertical: "top" }]}
        multiline
        value={notes}
        onChangeText={setNotes}
        placeholder="Yellowing lower leaves, curled tips, drooping after watering, etc."
      />

      {/* Advanced Environment Data Toggle */}
      <TouchableOpacity
        style={styles.advancedToggle}
        onPress={() => setShowAdvanced(!showAdvanced)}
      >
        <Text style={styles.advancedToggleText}>
          {showAdvanced ? "▼" : "▶"} Advanced: Environment Details (Improves AI accuracy)
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
                Download "Photone" app (iOS/Android) to measure light intensity using your
                phone. Aim for 400-600 PPFD in veg, 600-900 in flower.
              </Text>
            </View>

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>PPFD (μmol/m²/s)</Text>
                <TextInput
                  style={styles.input}
                  value={lightPPFD}
                  onChangeText={setLightPPFD}
                  placeholder="650"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfInput}>
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
              placeholder="Spider Farmer SF-4000, HLG 650R, etc."
            />

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.label}>Distance from canopy</Text>
                <TextInput
                  style={styles.input}
                  value={lightDistance}
                  onChangeText={setLightDistance}
                  placeholder='18" or 45cm'
                />
              </View>
              <View style={styles.halfInput}>
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
                { key: "straight", label: "Straight from tap" },
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
              <View style={styles.halfInput}>
                <Text style={styles.label}>Water pH</Text>
                <TextInput
                  style={styles.input}
                  value={waterPH}
                  onChangeText={setWaterPH}
                  placeholder="6.0-6.5"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfInput}>
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
              <View style={styles.halfInput}>
                <Text style={styles.label}>Temperature (°F)</Text>
                <TextInput
                  style={styles.input}
                  value={temperature}
                  onChangeText={setTemperature}
                  placeholder="75-82°F"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfInput}>
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
                    style={airflow === flow ? styles.optionTextActive : styles.optionText}
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
              placeholder="Soil, Coco coir, Hydro, Perlite mix, etc."
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

      <PrimaryButton
        title={loading ? "Analyzing..." : "Run Diagnosis"}
        onPress={() => runDiagnosis()}
        disabled={loading}
        style={{ marginTop: 20 }}
      />

      {photos.length > 0 && (
        <PrimaryButton
          title={loading ? "Analyzing..." : "AI Vision Analyze"}
          onPress={runVision}
          disabled={loading}
          style={{ marginTop: 10 }}
        />
      )}

      {/* Result */}
      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>{result.issueSummary}</Text>
          <Text style={styles.severity}>
            Severity: {severityLabel(result.severity)} ({result.severity}/5)
          </Text>

          {/* Tags */}
          {result.tags && result.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {result.tags.map((t) => (
                <View key={t} style={styles.tag}>
                  <Text style={styles.tagText}>{t}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Actions */}
          {result.aiActions && result.aiActions.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.sectionLabel}>Suggested Actions</Text>
              {result.aiActions.map((step, idx) => (
                <Text key={idx} style={styles.actionStep}>
                  • {step}
                </Text>
              ))}
            </View>
          )}

          {/* Explanation */}
          {result.aiExplanation && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.sectionLabel}>Notes</Text>
              <Text style={styles.explanation}>{result.aiExplanation}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={() => navigation.navigate("DiagnosisHistory")}
            style={{ marginTop: 16 }}
          >
            <Text style={{ color: "#3498db", fontWeight: "600" }}>View history →</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = {
  header: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  subtitle: {
    fontSize: 14,
    color: "#7f8c8d",
    marginBottom: 12,
    fontStyle: "italic"
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
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#10B981"
  },
  label: { marginTop: 15, marginBottom: 5, fontWeight: "600" },
  input: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 10
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
  stageButtonActive: {
    backgroundColor: "#2ecc71"
  },
  stageText: { color: "#555" },
  stageTextActive: { color: "#fff" },
  resultCard: {
    marginTop: 24,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    boxShadow: "0px 2px 4px rgba(0,0,0,0.05)",
    elevation: 2
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6
  },
  severity: {
    color: "#e67e22",
    marginBottom: 8
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  tag: {
    backgroundColor: "#eee",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 6
  },
  tagText: {
    fontSize: 12,
    color: "#333"
  },
  sectionLabel: {
    fontWeight: "700",
    marginBottom: 4
  },
  actionStep: {
    marginBottom: 2,
    color: "#2c3e50"
  },
  explanation: {
    color: "#555",
    fontStyle: "italic",
    marginTop: 2
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  halfInput: {
    flex: 1
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12
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
