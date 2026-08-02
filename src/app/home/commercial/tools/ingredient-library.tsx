import React from "react";

import IngredientLibraryRoute from "@/app/home/personal/(tabs)/tools/ingredient-library";

export default function CommercialIngredientLibraryRoute() {
  return <IngredientLibraryRoute backFallbackHref="/home/commercial/tools" />;
}
