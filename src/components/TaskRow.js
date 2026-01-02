import { View, Text, Pressable } from "react-native";

export default function TaskRow({ task, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        padding: 12,
        borderRadius: 8,
        backgroundColor: "#fff",
        marginBottom: 6,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        opacity: pressed ? 0.7 : 1
      })}
    >
      <Text style={{ fontSize: 16, color: "#111827" }}>{task.title}</Text>
      {task.plant && (
        <Text style={{ fontSize: 12, color: "#6B7280" }}>🌱 {task.plant.name}</Text>
      )}
    </Pressable>
  );
}
