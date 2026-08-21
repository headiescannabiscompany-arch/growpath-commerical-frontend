import React from "react";

import SavedRunsRoute from "@/app/home/personal/(tabs)/tools/saved-runs";

export default function CommercialSavedRunsToolRoute() {
  return <SavedRunsRoute workspaceTypeOverride="commercial" />;
}
