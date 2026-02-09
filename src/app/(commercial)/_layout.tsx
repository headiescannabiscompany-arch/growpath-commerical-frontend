import React from "react";
import { Stack, useRouter } from "expo-router";
import { useAccountMode } from "@/state/useAccountMode";
import { useFacility } from "@/state/useFacility";

export default function CommercialLayout() {
  const router = useRouter();
  const { mode } = useAccountMode();
  const { selectedId } = useFacility();

  if (mode !== "COMMERCIAL") {
    const target =
      mode === "FACILITY"
        ? selectedId
          ? "/home/facility"
          : "/home/facility/select"
        : "/home/personal";

    React.useEffect(() => {
      router.replace(target);
    }, [router, target]);

    return null;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
