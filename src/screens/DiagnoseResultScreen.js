import React from "react";
import { Text, FlatList, StyleSheet, Image, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { radius } from "../theme/theme";

export default function DiagnoseResultScreen({ route }) {
  const { diagnostics, photo } = route.params;

  return (
    <ScreenContainer scroll>
      <Text style={styles.header}>Diagnosis Result</Text>
      {photo ? <Image source={{ uri: photo }} style={styles.img} /> : null}

      <Text style={styles.health}>Overall Health: {diagnostics.overallHealth}</Text>

      <Text style={styles.section}>Detected Issues</Text>

      {diagnostics.issues.length === 0 ? (
        <Text style={styles.none}>No issues detected 👍</Text>
      ) : (
        <FlatList
          data={diagnostics.issues}
          keyExtractor={(item, i) => String(i)}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.issueName}>{item.name}</Text>
              <Text style={styles.issueMeta}>{item.type} • {item.severity} • {item.confidence}% confidence</Text>

              <Text style={styles.label}>Symptoms observed:</Text>
              {item.symptomsObserved.map((s, i) => (
                <Text key={i} style={styles.bullet}>• {s}</Text>
              ))}

              <Text style={styles.label}>Recommended actions:</Text>
              {item.recommendedActions.map((a, i) => (
                <Text key={i} style={styles.bullet}>✔ {a}</Text>
              ))}
            </View>
          )}
        />
      )}

      <Text style={styles.notes}>{diagnostics.notes}</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 26, fontWeight: "700", marginBottom: 8 },
  img: { width: "100%", height: 240, borderRadius: radius.card, marginBottom: 20 },
  health: { fontSize: 18, marginBottom: 16 },
  section: { fontSize: 20, fontWeight: "700", marginBottom: 10 },
  none: { color: "#2ecc71", fontSize: 18 },
  card: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: radius.card,
    marginBottom: 14
  },
  issueName: { fontSize: 16, fontWeight: "700" },
  issueMeta: { fontSize: 12, color: "#777", marginBottom: 6 },
  label: { fontWeight: "700", marginTop: 6 },
  bullet: { marginLeft: 10 },
  notes: { marginTop: 20, fontStyle: "italic", color: "#777" },
});
