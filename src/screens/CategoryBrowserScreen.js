import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
} from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { getCategories } from "../api/courses";

const COLORS = [
  "#2ecc71",
  "#3498db",
  "#9b59b6",
  "#e67e22",
  "#e74c3c",
  "#1abc9c",
  "#34495e",
  "#f39c12",
];

export default function CategoryBrowserScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setLoading(true);
      const res = await getCategories();
      setCategories(res.data || res || []);
    } catch (err) {
      console.log("Error loading categories:", err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading categories…</Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <Text style={styles.header}>Browse Categories</Text>
      <Text style={styles.subtitle}>Explore courses by topic</Text>

      <FlatList
        data={categories}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.bannerCard}
            onPress={() => navigation.navigate("SubcategoryBrowser", { category: item.name })}
          >
            <Image source={{ uri: item.banner }} style={styles.bannerImage} />
            <View style={styles.bannerOverlay}>
              <Text style={styles.bannerText}>{item.name}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  header: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 4,
    color: "#2c3e50",
  },
  subtitle: {
    fontSize: 14,
    color: "#777",
    marginBottom: 20,
  },
  listContent: {
    paddingBottom: 80,
  },
  bannerCard: {
    width: "100%",
    height: 140,
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  bannerOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  bannerText: {
    color: "white",
    fontSize: 22,
    fontWeight: "700",
  },
});
