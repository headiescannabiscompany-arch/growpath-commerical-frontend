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
        <Pressable
          onPress={() => switchTo("SINGLE_USER")}
          disabled={mode === "SINGLE_USER"}
        >
          <Text style={{ opacity: mode === "SINGLE_USER" ? 0.5 : 1 }}>Personal</Text>
        </Pressable>
      )}

      {showCommercial && (
        <Pressable
          onPress={() => switchTo("COMMERCIAL")}
          disabled={mode === "COMMERCIAL"}
        >
          <Text style={{ opacity: mode === "COMMERCIAL" ? 0.5 : 1 }}>Commercial</Text>
        </Pressable>
      )}

      {showFacility && (
        <Pressable onPress={() => switchTo("FACILITY")} disabled={mode === "FACILITY"}>
          <Text style={{ opacity: mode === "FACILITY" ? 0.5 : 1 }}>Facility</Text>
        </Pressable>
      )}
    </View>
  );
}
