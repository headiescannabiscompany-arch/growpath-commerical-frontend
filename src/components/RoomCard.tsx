import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { radius } from "../theme/theme";
import { useAppTheme } from "../theme/appTheme";

export default function RoomCard({
  room,
  onPress
}: {
  room: { id: string; name: string };
  onPress: () => void;
}) {
  const { palette } = useAppTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Open facility room ${room.name}`}
      style={[
        styles.card,
        { backgroundColor: palette.surface, shadowColor: palette.shadow }
      ]}
      onPress={onPress}
    >
      <View>
        <Text style={[styles.name, { color: palette.text }]}>{room.name}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    minHeight: 44,
    borderRadius: radius.card,
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
