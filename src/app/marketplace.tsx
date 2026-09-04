import MarketplaceScreen from "@/screens/MarketplaceScreen";
import { useLocalSearchParams } from "expo-router";

export default function MarketplaceRoute() {
  const params = useLocalSearchParams();
  return <MarketplaceScreen navigation={undefined} route={{ params }} />;
}
