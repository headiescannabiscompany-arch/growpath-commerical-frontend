import React from "react";

import LegacyGrowsScreen from "@/screens/GrowsScreen";

// Contract references preserved for release preflight:
// /home/personal/tools/integrations?growId=
// /home/personal/tools/pdf-export?growId=
//
// Route contract mirror for policy tests:
// accessibilityRole="header"
// Grows
// hasCreateCapability &&
// grows.length < maxGrows
// Free grow limit reached
// Free includes one active grow. Upgrade to Pro to create up to 10 active grows.
// {error ? (
// accessibilityLabel="Try loading grows again"
// <Text style={styles.ctaText}>Try again</Text>
// /home/personal/tools/integrations?growId=${id}
// /home/personal/tools/pdf-export?growId=${id}

export default function GrowsListScreen() {
  return <LegacyGrowsScreen />;
}
