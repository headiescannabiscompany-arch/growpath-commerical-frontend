import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  Pressable,
  Linking
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AppShell from "../components/AppShell.js";
import PrimaryButton from "../components/PrimaryButton.js";
import TokenBalanceWidget from "../components/TokenBalanceWidget.js";
import { useDiagnose } from "../hooks/useDiagnose";
import { useAuth } from "../context/AuthContext.js";
import { FEATURES, getEntitlement } from "../utils/entitlements.js";

// Move DiagnoseScreen function here, after styles

export default function DiagnoseScreen({ route, navigation }) {
  // Defensive: allow DiagnoseScreen to be mounted with or without route/params
  const params = route?.params ?? {};
  const {
    photos: photosFromLog = [],
    notes: notesFromLog = "",
    fromGrowLogId = null
  } = params;

  // Advanced picker Alert logic
  const openAdvancedPicker = () => {
    Alert.alert("Advanced Inputs", "Show advanced fields for a deeper diagnosis?", [
      { text: "Cancel", style: "cancel" },
      { text: showAdvanced ? "Hide" : "Show", onPress: () => setShowAdvanced((v) => !v) }
    ]);
  };
  const { user } = useAuth();
  // Entitlement logic
  const aiEnt = getEntitlement(FEATURES.DIAGNOSE_AI, user?.role);
  const advEnt = getEntitlement(FEATURES.DIAGNOSE_ADVANCED, user?.role);
  // Vision and export can be added similarly if needed

  const [photos, setPhotos] = useState([]);
  const [notes, setNotes] = useState("");
  const [suggestedPrompts] = useState([
    "Yellowing leaves on tomato plant",
    "Curled leaf tips on basil",
    "Drooping after watering (houseplant)",
    "Brown spots on lettuce",
    "Slow growth in pepper seedlings"
  ]);
  const [chatHistory, setChatHistory] = useState([]);
  const [followUp, setFollowUp] = useState("");
  const [stage, setStage] = useState("veg");
  const [strain, setStrain] = useState("");
  const [breeder, setBreeder] = useState("");
  const [lightPPFD, setLightPPFD] = useState("");
  const [lightDLI, setLightDLI] = useState("");
  const [lightModel, setLightModel] = useState("");
  const [lightDistance, setLightDistance] = useState("");
  const [lightSpectrum, setLightSpectrum] = useState("");
  const [waterSource, setWaterSource] = useState("tap");
  const [waterTreatment, setWaterTreatment] = useState("straight");
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
  const [substrateEC, setSubstrateEC] = useState("");
  const [airCO2, setAirCO2] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { analyze, analyzing, analyzeError, diagnosePhoto, diagnosing, diagnoseError } =
    useDiagnose();
  const [result, setResult] = useState(null);

  // --- Add missing handler stubs ---
  async function handleDiagnose() {
    try {
      const payload = {
        notes,
        photos,
        stage,
        strain,
        breeder,
        lightPPFD,
        lightDLI,
        lightModel,
        lightDistance,
        lightSpectrum,
        waterSource,
        waterTreatment,
        waterPH,
        waterPPM,
        temperature,
        humidity,
        airflow,
        nutrientBrand,
        nutrientStrength,
        feedingSchedule,
        substrateType,
        substratePH,
        substrateEC,
        airCO2
      };
      const res = await analyze(payload);
      setResult(res);
      setChatHistory((prev) => [
        ...prev,
        { sender: "user", text: notes },
        { sender: "ai", text: res?.followUp || "Diagnosis complete." }
      ]);
      if (res?.followUp) setFollowUp(res.followUp);
      setNotes("");
    } catch (e) {
      // error handled by hook
    }
  }
  async function runVision() {
    try {
      if (!photos.length) return;
      const res = await diagnosePhoto(photos[0]?.uri);
      setResult(res);
    } catch (e) {
      // error handled by hook
    }
  }
  function severityLabel(severity) {
    // TODO: Implement severity label logic
    return ["Low", "Medium", "High", "Very High", "Critical"][severity - 1] || "Unknown";
  }

  // --- FULL SCREEN CONTENT ---
  return (
    <AppShell style={null} contentContainerStyle={null}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Chat-style input and prompt suggestions */}
        <View style={{ marginBottom: 12 }}>
          <Text style={styles.label}>Describe your plant issue</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
            {suggestedPrompts.map((prompt) => (
              <TouchableOpacity
                key={prompt}
                style={{
                  backgroundColor: "#334155",
                  borderRadius: 16,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  marginRight: 8,
                  marginBottom: 6,
                  opacity: aiEnt === "enabled" ? 1 : 0.5
                }}
                onPress={() => aiEnt === "enabled" && setNotes(prompt)}
                disabled={aiEnt !== "enabled"}
              >
                <Text style={{ color: "#e5e7eb", fontSize: 13 }}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: "top" }]}
            multiline
            value={notes}
            onChangeText={setNotes}
            placeholder="Describe symptoms: yellowing leaves, curled tips, drooping, brown spots, etc. (e.g. tomato, basil, lettuce, pepper)"
            editable={aiEnt === "enabled"}
          />
          {aiEnt !== "enabled" && (
            <Text style={{ color: "gray", fontSize: 12, marginTop: 4 }}>
              {aiEnt === "cta"
                ? "Upgrade to use AI diagnosis features"
                : "Diagnosis (Locked)"}
            </Text>
          )}
        </View>

        {/* Chat history (conversational flow) */}
        {chatHistory.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            {chatHistory.map((msg, idx) => (
              <View
                key={idx}
                style={{
                  alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
                  backgroundColor: msg.sender === "user" ? "#22c55e" : "#334155",
                  borderRadius: 14,
                  padding: 10,
                  marginBottom: 6,
                  maxWidth: "80%"
                }}
              >
                {typeof msg.text === "string" ? (
                  <Text style={{ color: msg.sender === "user" ? "#0f172a" : "#e5e7eb" }}>
                    {msg.text}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* Follow-up question input */}
        {followUp && (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.label}>Follow-up</Text>
            <TextInput
              style={[styles.input, { height: 40 }]}
              value={followUp}
              editable={false}
            />
            <TextInput
              style={[styles.input, { height: 60, marginTop: 6 }]}
              placeholder="Type your answer about your plant..."
              onChangeText={(txt) => setNotes(txt)}
              value={notes}
              multiline
            />
          </View>
        )}
        {/* Advanced Environment Data Toggle */}
        <Pressable
          style={[styles.advancedToggle, advEnt !== "enabled" && { opacity: 0.5 }]}
          onPress={advEnt === "enabled" ? openAdvancedPicker : undefined}
          disabled={advEnt !== "enabled"}
        >
          <Text style={styles.advancedToggleText}>
            {showAdvanced
              ? "Hide advanced"
              : advEnt === "cta"
                ? "Upgrade for Advanced"
                : advEnt === "enabled"
                  ? "Show advanced"
                  : "Advanced (Locked)"}
          </Text>
        </Pressable>
        {/* Advanced LAWNS fields */}
        {showAdvanced && advEnt === "enabled" && (
          <View style={styles.advancedSection}>
            {/* LIGHT SECTION */}
            <View style={styles.envSection}>
              <Text style={styles.envSectionTitle}>💡 Light Information</Text>
              <View style={styles.infoBox}>
                <Text style={styles.infoBoxTitle}>📱 Measure PPFD/DLI</Text>
                <Text style={styles.infoBoxText}>
                  For best results, use the free "Photone" app (iOS/Android) to measure
                  light intensity with your phone. Aim for 400-600 PPFD in veg, 600-900 in
                  flower.
                </Text>
                <PrimaryButton
                  title="How to Measure with Photone"
                  onPress={() => {
                    Alert.alert(
                      "How to Measure Light",
                      "1. Download the Photone app from the App Store or Google Play.\n2. Open the app and select the 'PAR/PPFD' mode.\n3. Hold your phone at canopy level, sensor facing the light.\n4. Enter the PPFD and DLI values below.\n\nPhotone for iOS: https://apps.apple.com/app/photone/id1255474625\nPhotone for Android: https://play.google.com/store/apps/details?id=com.lisisoft.photone",
                      [
                        {
                          text: "Open Photone (iOS)",
                          onPress: () => {
                            Linking.openURL(
                              "https://apps.apple.com/app/photone/id1255474625"
                            );
                          }
                        },
                        {
                          text: "Open Photone (Android)",
                          onPress: () => {
                            Linking.openURL(
                              "https://play.google.com/store/apps/details?id=com.lisisoft.photone"
                            );
                          }
                        },
                        { text: "OK" }
                      ]
                    );
                  }}
                  style={{ marginTop: 8, marginBottom: 4 }}
                  disabled={false}
                >
                  <Text>How to Measure with Photone</Text>
                </PrimaryButton>
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
              <PrimaryButton
                title="Confirm Light Measurement"
                onPress={() => {
                  if (!lightPPFD && !lightDLI) {
                    Alert.alert(
                      "Missing Data",
                      "Please enter at least one value for PPFD or DLI."
                    );
                    return;
                  }
                  setChatHistory((prev) => [
                    ...prev,
                    {
                      sender: "user",
                      text: `Light measured: PPFD ${lightPPFD || "-"} μmol/m²/s, DLI ${lightDLI || "-"} mol/m²/day.`
                    }
                  ]);
                  Alert.alert(
                    "Saved!",
                    "Your light measurement has been added to the diagnosis context."
                  );
                }}
                style={{ marginTop: 8 }}
                disabled={false}
              >
                <Text>Confirm Light Measurement</Text>
              </PrimaryButton>
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
          title={analyzing ? "Analyzing..." : followUp ? "Send" : "Run Diagnosis"}
          onPress={async () => {
            if (aiEnt !== "enabled") return;
            if (followUp) {
              setChatHistory((prev) => [
                ...prev,
                { sender: "user", text: notes },
                {
                  sender: "ai",
                  text: "Thank you! We'll use this info for a more accurate diagnosis."
                }
              ]);
              setFollowUp("");
              setNotes("");
            } else {
              await handleDiagnose();
            }
          }}
          disabled={analyzing || (!notes && !followUp) || aiEnt !== "enabled"}
          style={{ marginTop: 20, opacity: aiEnt === "enabled" ? 1 : 0.5 }}
        >
          <Text>
            {analyzing
              ? "Analyzing..."
              : followUp
                ? "Send"
                : aiEnt === "cta"
                  ? "Upgrade to Run Diagnosis"
                  : aiEnt === "enabled"
                    ? "Run Diagnosis"
                    : "Diagnosis (Locked)"}
          </Text>
        </PrimaryButton>
        {aiEnt !== "enabled" && (
          <Text style={{ color: "gray", fontSize: 12, marginTop: 4 }}>
            {aiEnt === "cta" ? "Upgrade to run diagnosis" : "Diagnosis (Locked)"}
          </Text>
        )}

        {photos.length > 0 && (
          <PrimaryButton
            title={diagnosing ? "Analyzing..." : "AI Vision Analyze"}
            onPress={async () => {
              if (aiEnt === "enabled") await runVision();
            }}
            disabled={diagnosing || aiEnt !== "enabled"}
            style={{ marginTop: 10, opacity: aiEnt === "enabled" ? 1 : 0.5 }}
          >
            <Text>
              {diagnosing
                ? "Analyzing..."
                : aiEnt === "cta"
                  ? "Upgrade for AI Vision"
                  : aiEnt === "enabled"
                    ? "AI Vision Analyze"
                    : "AI Vision (Locked)"}
            </Text>
          </PrimaryButton>
        )}
        {/* Error display */}
        {(analyzeError || diagnoseError) && (
          <Text style={{ color: "#ef4444", marginTop: 8 }}>
            {analyzeError?.message ||
              diagnoseError?.message ||
              "An error occurred during diagnosis."}
          </Text>
        )}
        {photos.length > 0 && aiEnt !== "enabled" && (
          <Text style={{ color: "gray", fontSize: 12, marginTop: 4 }}>
            {aiEnt === "cta" ? "Upgrade to use AI Vision" : "AI Vision (Locked)"}
          </Text>
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
      </ScrollView>
    </AppShell>
  );
}
import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  input: {
    backgroundColor: "#1e293b",
    borderRadius: 8,
    padding: 10,
    color: "#e5e7eb",
    marginBottom: 10
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#0f172a"
  },
  header: {
    marginBottom: 16
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: "#e5e7eb",
    marginBottom: 6
  },
  resultBox: {
    marginTop: 18,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#22c55e"
  },
  resultCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#22c55e"
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#e5e7eb",
    marginBottom: 6
  },
  severity: {
    color: "#f59e0b",
    fontWeight: "600",
    marginBottom: 8
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8
  },
  tag: {
    backgroundColor: "#334155",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 6
  },
  tagText: {
    fontSize: 12,
    color: "#e5e7eb"
  },
  sectionLabel: {
    fontWeight: "700",
    color: "#22c55e",
    marginBottom: 4,
    marginTop: 12
  },
  actionStep: {
    marginBottom: 2,
    color: "#e5e7eb",
    fontSize: 14
  },
  explanation: {
    color: "#9ca3af",
    fontStyle: "italic",
    marginTop: 2,
    fontSize: 13
  },
  resultText: {
    color: "#d1fae5",
    fontSize: 14,
    lineHeight: 20
  },
  loadingText: {
    marginTop: 12,
    color: "#9ca3af",
    textAlign: "center"
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },
  column: {
    flex: 1
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#22c55e",
    alignItems: "center",
    marginTop: 12
  },
  buttonSecondary: {
    backgroundColor: "#334155"
  },
  buttonText: {
    color: "#022c22",
    fontWeight: "600",
    fontSize: 14
  },
  buttonTextSecondary: {
    color: "#e5e7eb"
  },
  advancedSection: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1e293b"
  },
  advancedToggle: {
    backgroundColor: "#1e293b",
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 10
  },
  advancedToggleText: {
    color: "#22c55e",
    fontWeight: "600",
    fontSize: 14
  },
  envSection: {
    marginBottom: 18,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b"
  },
  envSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#e5e7eb",
    marginBottom: 8
  },
  infoBox: {
    backgroundColor: "#1e293b",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10
  },
  infoBoxTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#22c55e",
    marginBottom: 4
  },
  infoBoxText: {
    fontSize: 12,
    color: "#e5e7eb",
    lineHeight: 18
  },
  halfInput: {
    flex: 1,
    marginRight: 8
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#22c55e",
    marginRight: 8,
    marginBottom: 8
  },
  optionButtonActive: {
    backgroundColor: "#22c55e",
    borderColor: "#22c55e"
  },
  optionText: {
    fontSize: 14,
    color: "#e5e7eb",
    fontWeight: "500",
    textTransform: "capitalize"
  },
  optionTextActive: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "600",
    textTransform: "capitalize"
  },
  label: {
    fontWeight: "600",
    color: "#e5e7eb",
    marginBottom: 4,
    marginTop: 8
  }
});
