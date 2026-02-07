import React from "react";
import { View, Text, Button, TouchableOpacity } from "react-native";
import type { Plant } from "../types";

type PlantCardProps = {
  plant: Plant;
  onStageChange: () => void;
  onMoveRoom: () => void;
  onAddTask: () => void;
};

export default function PlantCard({
  plant,
  onStageChange,
  onMoveRoom,
  onAddTask
}: PlantCardProps) {
  return (
    <View
      style={{
        padding: 16,
        margin: 8,
        backgroundColor: "#fff",
        borderRadius: 8,
        elevation: 2
      }}
    >
      <Text style={{ fontWeight: "bold", fontSize: 18 }}>{plant.name}</Text>
      <Text>Stage: {plant.stage}</Text>
      <Text>Room: {plant.roomName}</Text>
      <View style={{ flexDirection: "row", marginTop: 8 }}>
        <TouchableOpacity
          onPress={onStageChange}
          style={{
            marginRight: 12,
            backgroundColor: "#e0f7fa",
            padding: 8,
            borderRadius: 6
          }}
        >
          <Text>Change Stage</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onMoveRoom}
          style={{
            marginRight: 12,
            backgroundColor: "#ffe0b2",
            padding: 8,
            borderRadius: 6
          }}
        >
          <Text>Move Room</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onAddTask}
          style={{ backgroundColor: "#c8e6c9", padding: 8, borderRadius: 6 }}
        >
          <Text>Add Task</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
