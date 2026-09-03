import { useLocalSearchParams } from "expo-router";
import type { ComponentType } from "react";

import MarketplaceScreen from "@/screens/MarketplaceScreen";

const RoutedMarketplaceScreen = MarketplaceScreen as ComponentType<{
  route: { params: unknown };
}>;

export default function MarketplaceRoute() {
  const params = useLocalSearchParams();
  return <RoutedMarketplaceScreen route={{ params }} />;
}
