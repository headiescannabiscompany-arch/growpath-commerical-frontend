import MarketplaceScreen from "@/screens/MarketplaceScreen";
import MarketplaceDetailScreen from "@/screens/MarketplaceDetailScreen";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function MarketplaceRoute() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const contentId = typeof params.content === "string" ? params.content.trim() : "";
  if (contentId && !params.checkout) {
    return (
      <MarketplaceDetailScreen
        key={contentId}
        route={{ params: { id: contentId } }}
        navigation={{ goBack: () => router.replace("/marketplace") }}
      />
    );
  }
  return (
    <MarketplaceScreen
      navigation={{
        navigate: (_screen: string, { id }: { id: string }) =>
          router.push({ pathname: "/marketplace", params: { content: id } })
      }}
      route={{ params }}
    />
  );
}
