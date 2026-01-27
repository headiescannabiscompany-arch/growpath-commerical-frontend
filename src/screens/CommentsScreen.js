import React from "react";
import { View, Text, FlatList } from "react-native";

export default function CommentsScreen() {
  const comments = [
    { id: "1", text: "Great course!" },
    { id: "2", text: "Very detailed breakdown." }
  ];

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24 }}>Comments</Text>
      <FlatList
        data={comments}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => <Text style={{ padding: 8 }}>{item.text}</Text>}
      />
    </View>
  );
}
