import React from "react";
import { useLocalSearchParams } from "expo-router";
import { StagingBackstageDraft } from "@/features/lives/StagingBackstageDraft";
import { StagingBackstageEntry } from "@/features/lives/StagingBackstageEntry";

export default function LiveBackstageRoute() {
  const { setup } = useLocalSearchParams<{ setup?: string }>();
  if (setup === "draft") return <StagingBackstageDraft />;
  return <StagingBackstageEntry surface="controls" />;
}
