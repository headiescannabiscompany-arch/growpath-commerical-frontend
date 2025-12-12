import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from "react-native";

import ScreenContainer from "../components/ScreenContainer";
import { getCourse, publishCourse, deleteLesson } from "../api/courses";

export default function ManageCourseScreen({ route, navigation }) {
  const { id } = route.params;
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);

  async function load() {
    const res = await getCourse(id);
    setCourse(res.course || res.data?.course || res);
    setLessons(res.lessons || res.data?.lessons || []);
  }

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", load);
    return unsubscribe;
  }, [navigation]);

  async function handlePublish() {
    await publishCourse(id);
    Alert.alert("Published", "Your course is now live.");
    load();
  }

  async function handleDeleteLesson(lessonId) {
    Alert.alert("Delete lesson?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteLesson(lessonId);
          load();
        },
      },
    ]);
  }

  function renderLesson({ item }) {
    const typeLabel =
      item.videoUrl ? "Video" : item.pdfUrl ? "PDF" : item.content ? "Text" : "Empty";

    return (
      <View style={styles.lessonRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.lessonTitle}>
            {item.order}. {item.title}
          </Text>
          <Text style={styles.lessonMeta}>{typeLabel}</Text>
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate("EditLesson", { lessonId: item._id, lesson: item })}
        >
          <Text style={styles.link}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleDeleteLesson(item._id)}>
          <Text style={[styles.link, { color: "red" }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!course) return <ScreenContainer><Text>Loading…</Text></ScreenContainer>;

  return (
    <ScreenContainer scroll>
      {course.coverImage ? (
        <Image source={{ uri: course.coverImage }} style={styles.cover} />
      ) : null}

      <Text style={styles.title}>{course.title}</Text>
      <Text style={styles.sub}>{course.category || "Uncategorized"}</Text>
      <Text style={styles.desc}>{course.description}</Text>

      <View style={styles.row}>
        <Text style={styles.price}>
          {course.price > 0 ? `$${course.price.toFixed(2)}` : "Free"}
        </Text>
        <Text style={styles.status}>
          {course.isPublished ? "Published" : "Draft"}
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate("AddLesson", { courseId: course._id })}
        >
          <Text style={styles.secondaryText}>+ Add Lesson</Text>
        </TouchableOpacity>

        {!course.isPublished && (
          <TouchableOpacity style={styles.primaryBtn} onPress={handlePublish}>
            <Text style={styles.primaryText}>Publish Course</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionHeader}>Lessons</Text>

      <FlatList
        data={lessons}
        keyExtractor={(l) => l._id}
        renderItem={renderLesson}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  cover: { width: "100%", height: 200, borderRadius: 10, marginBottom: 10 },
  title: { fontSize: 22, fontWeight: "700" },
  sub: { color: "#777", marginBottom: 4 },
  desc: { marginBottom: 10, color: "#333" },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  price: { fontWeight: "700", fontSize: 16 },
  status: { color: "#27ae60", fontWeight: "600" },
  actionsRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  secondaryBtn: {
    flex: 1,
    marginRight: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#eee",
    alignItems: "center",
  },
  secondaryText: { fontWeight: "600" },
  primaryBtn: {
    flex: 1,
    marginLeft: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#2ecc71",
    alignItems: "center",
  },
  primaryText: { color: "white", fontWeight: "700" },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 4,
  },
  lessonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
  },
  lessonTitle: { fontWeight: "600" },
  lessonMeta: { color: "#777", fontSize: 12 },
  link: {
    marginLeft: 10,
    color: "#3498db",
    fontWeight: "600",
  },
});