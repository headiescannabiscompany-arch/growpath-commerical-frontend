import React from "react";
import AiScreen from "@/app/home/personal/(tabs)/ai";
import { ScreenBoundary } from "@/components/ScreenBoundary";

export default function CommercialAskAI() {
  return (
    <ScreenBoundary
      title="Ask GrowPath AI"
      showBack
      backFallbackHref="/home/commercial/tools"
    >
      <AiScreen workspaceType="commercial" />
    </ScreenBoundary>
  );
}
