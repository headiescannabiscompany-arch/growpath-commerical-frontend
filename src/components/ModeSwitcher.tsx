import React from "react";
import { View, Text, Pressable } from "react-native";
import { useModeSwitcher } from "@/features/mode/useModeSwitcher";

type Props = {
  showFacility?: boolean;
  showCommercial?: boolean;
  showSingle?: boolean;
};

export function ModeSwitcher({
  showFacility = true,
  showCommercial = true,
  showSingle = true
}: Props) {
  const { mode, switchTo } = useModeSwitcher();

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontWeight: "600" }}>Mode</Text>

      {showSingle && (
        <Pressable onPress={() => switchTo("personal")} disabled={mode === "personal"}>
          <Text style={{ opacity: mode === "personal" ? 0.5 : 1 }}>Personal</Text>
        </Pressable>
      )}

      {showCommercial && (
        <Pressable
          onPress={() => switchTo("commercial")}
          disabled={mode === "commercial"}
        >
          <Text style={{ opacity: mode === "commercial" ? 0.5 : 1 }}>Commercial</Text>
        </Pressable>
      )}

      {showFacility && (
        <Pressable onPress={() => switchTo("facility")} disabled={mode === "facility"}>
          <Text style={{ opacity: mode === "facility" ? 0.5 : 1 }}>Facility</Text>
        </Pressable>
      )}
    </View>
  );
}
