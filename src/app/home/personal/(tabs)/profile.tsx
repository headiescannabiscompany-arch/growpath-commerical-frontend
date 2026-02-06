import React, { useEffect } from "react";
import { useRouter } from "expo-router";

export default function ProfileTabForwarder() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/home/personal/profile" as any);
  }, [router]);

  return null;
}
