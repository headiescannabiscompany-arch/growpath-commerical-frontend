import React, { useEffect } from "react";
import { useRouter } from "expo-router";

export default function LogsTabForwarder() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/home/personal/logs" as any);
  }, [router]);

  return null;
}
