import React, { useState, useEffect } from "react";
import { Text, StyleSheet, Alert } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import Card from "../components/Card";
import { colors, spacing, radius } from "../theme/theme";
import { listCourses } from "../api/courses";

export default function CreatorDashboardScreen() {
  const [courses, setCourses] = useState([]);

  async function load() {
    try {
      const all = await listCourses();
      const mine = all.filter(c => c.creator?._id === global.user?.id);
      setCourses(mine);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <ScreenContainer scroll>
      <Text style={styles.title}>Creator Dashboard</Text>

      <Card>
        <Text style={styles.label}>Total Courses Published:</Text>
        <Text style={styles.value}>{courses.length}</Text>

        <Text style={styles.label}>Revenue (USD):</Text>
        <Text style={styles.value}>
          ${(global.user?.earnings || 0 / 100).toFixed(2)}
        </Text>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: spacing(6)
  },
  label: {
    marginTop: spacing(3),
    color: colors.textSoft
  },
  value: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.accent
  }
});
