import { View, Text, Pressable } from "react-native";

export default function TaskRow({ task }) {
  return (
    <Pressable
      style={{
        padding: 12,
        borderRadius: 8,
        backgroundColor: "#111",
        marginBottom: 6
      }}
    >
      <Text style={{ fontSize: 16 }}>{task.title}</Text>
      {task.plant && (
        <Text style={{ fontSize: 12, color: "#aaa" }}>🌱 {task.plant.name}</Text>
      )}
    </Pressable>
  );
}
