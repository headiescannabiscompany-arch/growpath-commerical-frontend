import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";

export default function RoomCard({
  room,
  onPress
}: {
  room: { id: string; name: string };
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View>
        <Text style={styles.name}>{room.name}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  name: {
    fontSize: 16,
    fontWeight: "bold"
  }
});
