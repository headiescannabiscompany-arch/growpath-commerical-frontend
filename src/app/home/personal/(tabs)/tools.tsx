import React, { useEffect } from "react";
import { useRouter } from "expo-router";

export default function ToolsTabForwarder() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/home/personal/tools" as any);
  }, [router]);

  return null;
}
