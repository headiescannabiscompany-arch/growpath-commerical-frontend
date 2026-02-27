import React from "react";
import { Redirect } from "expo-router";

// Journal lives under a selected grow. Keep stale direct links safe.
export default function LogsIndexRoute() {
  return <Redirect href="/home/personal/grows" />;
}
