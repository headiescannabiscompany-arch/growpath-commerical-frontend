import React from "react";
import { Stack } from "expo-router";

export default function ForumLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Forum" }} />
      <Stack.Screen name="code" options={{ title: "Forum Code" }} />
      <Stack.Screen name="new-post" options={{ title: "New Post" }} />
      <Stack.Screen name="post/[id]" options={{ title: "Post" }} />
    </Stack>
  );
}
