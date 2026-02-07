import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { SwipeListView } from "react-native-swipe-list-view";
import PlantCard from "./PlantCard";
import type { Plant } from "../types";

type PlantListSwipeProps = {
  plants: Plant[];
  onStageChange: (plant: Plant) => void;
  onMoveRoom: (plant: Plant) => void;
  onAddTask: (plant: Plant) => void;
  onMarkWatered: (plant: Plant) => void;
};

export default function PlantListSwipe({
  plants,
  onStageChange,
  onMoveRoom,
  onAddTask,
  onMarkWatered
}: PlantListSwipeProps) {
  return (
    <SwipeListView<Plant>
      data={plants}
      keyExtractor={(item: Plant) => item.id}
      renderItem={({ item }: { item: Plant }) => (
        <PlantCard
          plant={item}
          onStageChange={() => onStageChange(item)}
          onMoveRoom={() => onMoveRoom(item)}
          onAddTask={() => onAddTask(item)}
        />
      )}
      renderHiddenItem={({ item }: { item: Plant }) => (
        <>
          <SwipeActionButton
            text="Mark Watered"
            color="#b2dfdb"
            onPress={() => onMarkWatered(item)}
          />
        </>
      )}
      leftOpenValue={75}
      rightOpenValue={-75}
      disableRightSwipe={false}
      disableLeftSwipe={false}
    />
  );
}

type SwipeActionButtonProps = {
  text: string;
  color: string;
  onPress: () => void;
};

function SwipeActionButton({ text, color, onPress }: SwipeActionButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: color,
        flex: 1,
        justifyContent: "center",
        alignItems: "center"
      }}
    >
      <Text style={{ color: "#333", fontWeight: "bold" }}>{text}</Text>
    </TouchableOpacity>
  );
}
