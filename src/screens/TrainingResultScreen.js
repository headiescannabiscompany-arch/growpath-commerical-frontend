import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
// import { convertTrainingToTasks } from "../api/training"; // Removed

export default function TrainingResultScreen({ route, navigation }) {
  const { photo, training } = route.params;

  const actions = [];

  if (training.topRecommendation?.shouldTop) {
    actions.push({
      title: `Top at node ${training.topRecommendation.recommendedNode}`,
      details: training.topRecommendation.reason
    });
  }

  if (training.fimRecommendation?.shouldFIM) {
    actions.push({
      title: "Perform FIM",
      details: training.fimRecommendation.reason
    });
  }

  if (training.lst?.shouldTrain) {
    actions.push({
      title: "Apply LST",
      details: "Bend branches: " + (training.lst.branchesToBend || []).join(", ")
    });
  }

  if (training.defoliation?.shouldDefoliate) {
    actions.push({
      title: `Defoliate (${training.defoliation.leavesToRemoveCount} leaves)`,
      details: training.defoliation.reason
    });
  }

  async function saveTasks() {
    // Placeholder: navigate to plant selector; integration can call convertTrainingToTasks when plant is chosen
    navigation.navigate("PlantList", { mode: "applyTraining", actions });
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.header}>Training Analysis</Text>
      {photo ? <Image source={{ uri: photo }} style={styles.img} /> : null}

      <Text style={styles.summary}>{training.finalSummary}</Text>

      <Text style={styles.section}>Recommendations</Text>

      {actions.map((a, i) => (
        <View key={i} style={styles.card}>
          <Text style={styles.title}>{a.title}</Text>
          <Text style={styles.desc}>{a.details}</Text>
        </View>
      ))}

      <FeatureGate plan="pro" navigation={navigation}>
        <TouchableOpacity style={styles.taskBtn} onPress={saveTasks}>
          <Text style={styles.taskText}>Convert to Tasks</Text>
        </TouchableOpacity>
      </FeatureGate>
    </ScreenContainer>
  );
}

const styles = {
  header: { fontSize: 26, fontWeight: "700" },
  img: { width: "100%", height: 260, marginVertical: 20, borderRadius: 12 },
  summary: { fontSize: 16, marginBottom: 16 },
  section: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  card: { backgroundColor: "white", padding: 14, borderRadius: 10, marginBottom: 12 },
  title: { fontWeight: "700" },
  desc: { marginTop: 4 },
  taskBtn: { backgroundColor: "#2ecc71", padding: 14, borderRadius: 8, marginTop: 20 },
  taskText: { color: "white", textAlign: "center", fontWeight: "700" }
};
