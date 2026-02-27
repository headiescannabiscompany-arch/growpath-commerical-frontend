import React from "react";
import { Redirect } from "expo-router";

// Personal tasks are grow-scoped and not a top-level tab in v1.
export default function PersonalTasksRoute() {
  return <Redirect href="/home/personal/grows" />;
}
