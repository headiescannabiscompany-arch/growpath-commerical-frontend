import React, { useEffect } from "react";
import { useRouter } from "expo-router";

export default function AiTabForward() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/home/personal/ai" as any);
  }, [router]);
  return null;
}
