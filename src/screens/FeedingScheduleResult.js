import React from "react";
import { Text, FlatList, TouchableOpacity, StyleSheet, View, Alert } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { convertScheduleToTemplate } from "../api/feeding";

export default function FeedingScheduleResult({ route, navigation }) {
  const { schedule, nutrientData } = route.params;

  async function saveTemplate() {
    const res = await convertScheduleToTemplate({
      title: `${nutrientData.productName} Feeding Plan`,
      strain: "",
      growMedium: "",
      schedule,
    });

    const payload = res?.data ?? res;
    if (!payload?.template?._id) {
      Alert.alert("Error", "Template save failed. Please try again.");
      return;
    }
    navigation.navigate("TemplateDetail", { templateId: payload.template._id });
  }

  return (
    <ScreenContainer scroll>
      <Text style={styles.header}>Feeding Schedule</Text>

      <FlatList
        data={schedule.schedule}
        keyExtractor={(i, idx) => String(idx)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.week}>Week {item.week}</Text>
            <Text>{item.stage}</Text>
            <Text>Dose: {item.feed.amountPerGallon}</Text>
            <Text>Notes: {item.feed.notes}</Text>
          </View>
        )}
      />

      <TouchableOpacity style={styles.saveBtn} onPress={saveTemplate}>
        <Text style={styles.saveText}>Save as Template</Text>
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 26, fontWeight: "700", marginBottom: 10 },
  card: { backgroundColor: "white", padding: 14, borderRadius: 10, marginBottom: 12 },
  week: { fontWeight: "700", marginBottom: 4 },
  saveBtn: { backgroundColor: "#2ecc71", padding: 14, borderRadius: 8, marginTop: 20 },
  saveText: { color: "white", textAlign: "center", fontWeight: "700" },
});
