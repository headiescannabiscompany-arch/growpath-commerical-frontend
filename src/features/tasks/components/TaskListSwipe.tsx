import React from "react";
import { FlatList } from "react-native";

export default function TaskListSwipe(props: any) {
  // Drop-in wrapper: no swipe behavior until dependency is added intentionally.
  return <FlatList {...props} />;
}
