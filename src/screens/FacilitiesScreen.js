import React from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";

export default function FacilitiesScreen() {
  const facilities = [
    { id: "1", name: "Living Soil Labs" },
    { id: "2", name: "Triple Bag Genetics" }
  ];

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold" }}>Facilities</Text>
      <FlatList
        data={facilities}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={{ padding: 12 }}>
            <Text>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
