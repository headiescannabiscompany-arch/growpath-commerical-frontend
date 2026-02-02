import React from "react";
import { SwipeListView } from "react-native-swipe-list-view";
import { View, Text, TouchableOpacity } from "react-native";

export default function TaskListSwipe({ tasks, onComplete, onReassign }) {
  return (
    <SwipeListView
      data={tasks}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
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
      renderHiddenItem={({ item }) => (
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
