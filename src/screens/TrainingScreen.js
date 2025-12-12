import React from "react";
import { Text, TouchableOpacity, StyleSheet, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";

// Placeholder screen to start AI Training Assistant; replace with real flow when available
export default function TrainingScreen({ navigation }) {
  function startDemo() {
    const mockTraining = {
      finalSummary: "Your plant is ready for gentle LST and a top at node 4.",
      topRecommendation: { shouldTop: true, recommendedNode: 4, reason: "Strong lower node spacing." },
      fimRecommendation: { shouldFIM: false, reason: "Apical growth not ideal for FIM." },
      lst: { shouldTrain: true, branchesToBend: ["Main", "Secondary-left"] },
      defoliation: { shouldDefoliate: true, leavesToRemoveCount: 3, reason: "Lower leaves shaded." },
    };
    navigation.navigate("TrainingResult", { photo: null, training: mockTraining });
  }

  return (
    <ScreenContainer>
      <Text style={styles.header}>AI Training Assistant</Text>
      <Text style={styles.sub}>Capture plant structure and get topping/LST/defol recommendations.</Text>

      <View style={{ height: 16 }} />

      <TouchableOpacity style={styles.primary} onPress={startDemo}>
        <Text style={styles.primaryText}>Run Demo Analysis</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 26, fontWeight: "700" },
  sub: { color: "#777", marginTop: 6 },
  primary: { marginTop: 24, backgroundColor: "#3498db", padding: 14, borderRadius: 10 },
  primaryText: { color: "white", textAlign: "center", fontWeight: "700" },
});
