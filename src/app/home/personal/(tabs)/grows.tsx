import React, { useEffect } from "react";
import { useRouter } from "expo-router";

export default function PersonalGrowsTab() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/home/personal/grows" as any);
  }, [router]);

  return null;
}
