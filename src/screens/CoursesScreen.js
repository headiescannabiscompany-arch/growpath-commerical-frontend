import React, { useEffect, useState } from "react";
import {
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert
} from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import { colors, spacing, radius } from "../theme/theme";
import { listCourses } from "../api/courses";

export default function CoursesScreen({ navigation }) {
  const [courses, setCourses] = useState([]);

  async function load() {
    try {
      const data = await listCourses();
      setCourses(data);
    } catch (err) {
      Alert.alert("Error", err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <ScreenContainer scroll>
      <Text style={styles.title}>Courses</Text>

      {global.user?.role === "creator" && (
        <PrimaryButton
          title="Create Course"
          onPress={() => navigation.navigate("CreateCourse")}
          style={{ marginBottom: spacing(4) }}
        />
      )}

      <FlatList
        data={courses}
        contentContainerStyle={{ paddingBottom: 100 }}
        keyExtractor={(c) => c._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate("CourseDetail", { course: item })}
          >
            <Card style={{ marginBottom: spacing(4) }}>
              <Text style={styles.courseTitle}>{item.title}</Text>
              <Text style={styles.creator}>{item.creator?.displayName}</Text>
              <Text style={styles.price}>
                {item.priceCents > 0
                  ? `$${(item.priceCents / 100).toFixed(2)}`
                  : "FREE"}
              </Text>
            </Card>
          </TouchableOpacity>
        )}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: spacing(6),
    color: colors.text
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text
  },
  creator: {
    color: colors.textSoft,
    marginTop: spacing(1)
  },
  price: {
    marginTop: spacing(2),
    fontWeight: "700",
    color: colors.accent
  }
});
