import { Redirect } from "expo-router";

import { useEntitlements } from "@/entitlements";

export default function LegacyDiagnoseRoute() {
  const ent = useEntitlements();

  if (!ent.ready) return null;
  if (ent.mode === "facility") {
    return <Redirect href="/home/facility/ai-diagnosis-photo" />;
  }
  if (ent.mode === "commercial") {
    return <Redirect href="/home/commercial" />;
  }
  return <Redirect href="/home/personal/diagnose" />;
}
