import React, { useEffect, useState } from "react";
import { Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { listTemplates } from "../api/templates";
import { getCreatorName } from "../utils/creator";

export default function TemplatesMarketplaceScreen({ navigation }) {
  const [templates, setTemplates] = useState([]);

  async function load() {
    const res = await listTemplates();
    const payload = res?.data ?? res ?? [];
    setTemplates(Array.isArray(payload) ? payload : []);
  }

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation]);

  return (
    <ScreenContainer>
      <Text style={styles.header}>Grow Templates</Text>
      <Text style={styles.sub}>Import ready-made grow schedules into your plants.</Text>

      <FlatList
        data={templates}
        keyExtractor={(t) => t._id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("TemplateDetail", { templateId: item._id })}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>{item.strain || "Any strain"} • {item.growMedium || "Any medium"}</Text>
            <Text style={styles.meta}>{item.difficulty || ""} • {item.durationDays} days</Text>
            <Text style={styles.price}>{item.price > 0 ? `$${item.price.toFixed(2)}` : "FREE"}</Text>
            {item.creator && (
              <Text style={styles.creator}>By {getCreatorName(item.creator)}</Text>
            )}
          </TouchableOpacity>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 26, fontWeight: "700", marginBottom: 4 },
  sub: { color: "#777", marginBottom: 16 },
  card: { backgroundColor: "white", padding: 14, borderRadius: 10, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "700" },
  meta: { fontSize: 13, color: "#555", marginTop: 2 },
  price: { marginTop: 6, fontSize: 16, fontWeight: "700", color: "#2ecc71" },
  creator: { fontSize: 12, color: "#777", marginTop: 6 },
});
