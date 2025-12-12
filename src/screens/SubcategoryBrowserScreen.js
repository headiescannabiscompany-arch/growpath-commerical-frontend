import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { getSubcategories } from "../api/courses";

export default function SubcategoryBrowserScreen({ navigation, route }) {
  const { category } = route.params;
  const [subs, setSubs] = useState([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await getSubcategories(category);
    setSubs(res.data || res || []);
  }

  return (
    <ScreenContainer scroll={false}>
      <Text style={styles.header}>{category}</Text>
      <Text style={styles.subtitle}>Subcategories</Text>

      <FlatList
        data={subs}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              navigation.navigate("CategoryCourses", {
                category,
                subcategory: item,
              })
            }
          >
            <Text style={styles.cardText}>{item}</Text>
          </TouchableOpacity>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 26, fontWeight: "700", marginBottom: 6 },
  subtitle: { color: "#777", marginBottom: 16 },
  card: {
    padding: 14,
    backgroundColor: "white",
    borderRadius: 10,
    marginBottom: 12,
    elevation: 2,
  },
  cardText: { fontSize: 18, fontWeight: "600" },
});
