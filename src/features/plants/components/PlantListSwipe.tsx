import React from "react";
import { SwipeListView } from "react-native-swipe-list-view";
import PlantCard from "./PlantCard";

export default function PlantListSwipe({
  plants,
  onStageChange,
  onMoveRoom,
  onAddTask,
  onMarkWatered
}) {
  return (
    <SwipeListView
      data={plants}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <PlantCard
          plant={item}
          onStageChange={() => onStageChange(item)}
          onMoveRoom={() => onMoveRoom(item)}
          onAddTask={() => onAddTask(item)}
        />
      )}
      renderHiddenItem={({ item }) => (
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

function SwipeActionButton({ text, color, onPress }) {
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
