import React from "react";
import { Redirect, useLocalSearchParams } from "expo-router";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Compatibility route for bookmarks created before Bud Rot Risk was consolidated into
 * Environment Review. Keep grow and plant context while ensuring the retired heuristic
 * cannot be used as a separate disease-prediction tool.
 */
export default function BudRotRiskLegacyRoute() {
  const { growId, plantId } = useLocalSearchParams<{
    growId?: string | string[];
    plantId?: string | string[];
  }>();

  return (
    <Redirect
      href={{
        pathname: "/home/personal/tools/environment-analysis",
        params: {
          ...(firstParam(growId) ? { growId: firstParam(growId) } : {}),
          ...(firstParam(plantId) ? { plantId: firstParam(plantId) } : {})
        }
      }}
    />
  );
}
