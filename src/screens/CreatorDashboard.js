import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, Image, StyleSheet } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { getMyCourses } from "../api/courses";

export default function CreatorDashboard({ navigation }) {
  const [courses, setCourses] = useState([]);

  async function load() {
    const res = await getMyCourses();
    setCourses(res.data || res);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <ScreenContainer>
      <Text style={styles.header}>Creator Dashboard</Text>

      <TouchableOpacity
        style={styles.newButton}
        onPress={() => navigation.navigate("CreateCourse")}
      >
        <Text style={styles.newButtonText}>+ Create New Course</Text>
      </TouchableOpacity>

      <FlatList
        data={courses}
        keyExtractor={(c) => c._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              navigation.navigate("ManageCourse", { id: item._id })
            }
          >
            {item.coverImage && (
              <Image source={{ uri: item.coverImage }} style={styles.cover} />
            )}
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.sub}>{item.isPublished ? "Published" : "Draft"}</Text>
          </TouchableOpacity>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { fontSize: 24, fontWeight: "700", marginBottom: 15 },
  newButton: {
    backgroundColor: "#2ecc71",
    padding: 12,
    borderRadius: 10,
    marginBottom: 20
  },
  newButtonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16
  },
  card: {
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 10
  },
  cover: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginBottom: 10
  },
  title: { fontWeight: "700", fontSize: 18 },
  sub: { color: "#777" }
});
