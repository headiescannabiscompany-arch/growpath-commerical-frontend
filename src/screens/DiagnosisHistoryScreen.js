import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { getDiagnosisHistory } from "../api/diagnose";

export default function DiagnosisHistoryScreen({ navigation }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await getDiagnosisHistory();
      setItems(res.data || res);
    } catch (_err) {
      // Failed to load history
    }
  }

  function renderItem({ item }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate("DiagnoseScreen", {
            notes: item.notes,
            photos: item.photos
          })
        }
      >
        <Text style={styles.title}>{item.issueSummary || "Diagnosis"}</Text>
        <Text style={styles.sub}>{new Date(item.createdAt).toLocaleString()}</Text>
        <Text style={styles.sub}>Severity: {item.severity}/5</Text>
      </TouchableOpacity>
    );
  }

  return (
    <ScreenContainer>
      <Text style={styles.header}>Diagnosis History</Text>

      <FlatList
        data={items}
        keyExtractor={(i) => i._id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </ScreenContainer>
  );
}

const styles = {
  header: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10
  },
  title: {
    fontSize: 16,
    fontWeight: "600"
  },
  sub: {
    color: "#777",
    marginTop: 2
  }
};

