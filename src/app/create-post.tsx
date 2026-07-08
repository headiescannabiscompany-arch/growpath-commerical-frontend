import { Redirect } from "expo-router";

import { useEntitlements } from "@/entitlements";

export default function CreatePostRoute() {
  const entitlements = useEntitlements();

  if (entitlements.mode === "commercial") {
    return <Redirect href="/home/commercial/feed" />;
  }

  if (entitlements.mode === "facility") {
    return <Redirect href="/feed" />;
  }

  return <Redirect href="/home/personal/forum/new-post" />;
}
