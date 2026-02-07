import React from "react";
import { SwipeListView } from "react-native-swipe-list-view";
import { View, Text, TouchableOpacity } from "react-native";

type TaskItem = {
  id: string;
  title?: string;
  assignedToName?: string;
  status?: string;
};

type TaskListSwipeProps = {
  tasks: TaskItem[];
  onComplete: (task: TaskItem) => void;
  onReassign: (task: TaskItem) => void;
};

export default function TaskListSwipe({
  tasks,
  onComplete,
  onReassign
}: TaskListSwipeProps) {
  return (
    <SwipeListView<TaskItem>
      data={tasks}
      keyExtractor={(item: TaskItem) => item.id}
      renderItem={({ item }: { item: TaskItem }) => (
        <View
          style={{
            padding: 16,
            margin: 8,
            backgroundColor: "#fff",
            borderRadius: 8,
            elevation: 2
          }}
        >
          <Text style={{ fontWeight: "bold", fontSize: 16 }}>{item.title}</Text>
          <Text>Assigned to: {item.assignedToName}</Text>
          <Text>Status: {item.status}</Text>
        </View>
      )}
      renderHiddenItem={({ item }: { item: TaskItem }) => (
        <View style={{ flex: 1, flexDirection: "row" }}>
          <SwipeActionButton
            text="Complete"
            color="#c8e6c9"
            onPress={() => onComplete(item)}
          />
          <SwipeActionButton
            text="Reassign"
            color="#ffe082"
            onPress={() => onReassign(item)}
          />
        </View>
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
