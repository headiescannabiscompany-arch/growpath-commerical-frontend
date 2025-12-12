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

  // Pick more photos
  async function addPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;

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

  async function runDiagnosis(pOverride, nOverride) {
    // PRO feature check
    if (!isPro) {
      navigation.navigate("Paywall");
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
        fromGrowLogId
      };

      const res = await analyzeDiagnosis(payload);
      setResult(res.data || res);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      if (!handleApiError(err, navigation)) {
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

    if (!photos.length) return Alert.alert("Photo required", "Add at least one photo to analyze.");
    try {
      setLoading(true);
      const res = await diagnoseImage(photos[0]);
      setLoading(false);
      navigation.navigate("DiagnoseResult", { diagnostics: res.data.diagnostics, photo: photos[0] });
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
      <Text style={styles.header}>AI Diagnose</Text>

      {/* Photos row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
        {photos.map((uri, i) => (
          <Image key={i} source={{ uri }} style={styles.photo} />
        ))}

        <TouchableOpacity style={styles.addPhotoBox} onPress={addPhoto}>
          <Text style={{ fontSize: 24, color: "#888" }}>+</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Strain and Stage */}
      <Text style={styles.label}>Strain (optional)</Text>
      <TextInput
        style={styles.input}
        value={strain}
        onChangeText={setStrain}
        placeholder="Blueberry Muffin, Odo Wan Kenobi, etc."
      />

      <Text style={styles.label}>Stage</Text>
      <View style={styles.stageRow}>
        {["seedling", "veg", "flower"].map((s) => (
          <TouchableOpacity
            key={s}
            style={[
              styles.stageButton,
              stage === s && styles.stageButtonActive
            ]}
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
            <Text style={{ color: "#3498db", fontWeight: "600" }}>
              View history →
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = {
  header: { fontSize: 24, fontWeight: "700", marginBottom: 10 },
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
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
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
  }
};
