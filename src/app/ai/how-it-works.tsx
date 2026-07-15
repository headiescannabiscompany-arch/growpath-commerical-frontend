import React from "react";
import { Stack } from "expo-router";
import TokenInfoScreen from "@/screens/TokenInfoScreen";

export default function HowAiWorksRoute() {
  return (
    <>
      <Stack.Screen options={{ title: "How GrowPathAI works" }} />
      <TokenInfoScreen />
    </>
  );
}
