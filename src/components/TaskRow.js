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
        boxShadow: "0px 0px 2px 0px rgba(0,0,0,0.05)",
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
