import { Redirect, useLocalSearchParams } from "expo-router";
import React from "react";

export default function FacilityAiToolsRoute() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    const first = Array.isArray(value) ? value[0] : value;
    if (first) query.set(key, first);
  });

  const suffix = query.toString() ? `?${query.toString()}` : "";
  return <Redirect href={`/home/facility/ai-ask${suffix}` as any} />;
}
