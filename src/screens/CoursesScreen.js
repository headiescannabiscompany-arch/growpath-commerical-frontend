import React from "react";
import { View, Text, FlatList } from "react-native";

export default function CoursesScreen() {
  const courses = [
    { id: "1", title: "LAWNS Fundamentals" },
    { id: "2", title: "Advanced Living Soil" }
  ];

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24 }}>Courses</Text>
      <FlatList
        data={courses}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => <Text style={{ padding: 10 }}>{item.title}</Text>}
      />
    </View>
  );
}
