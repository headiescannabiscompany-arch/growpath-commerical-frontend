import { Redirect, useRouter } from "expo-router";
import { ActivityIndicator } from "react-native";

import { useAuth } from "@/auth/AuthContext";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import ContentMarketplaceScreen from "@/screens/commercial/ContentMarketplaceScreen";
import { useAppTheme } from "@/theme/appTheme";

export default function CommercialStorefrontOffersRoute() {
  const router = useRouter();
  const { user } = useAuth();
  const ent = useEntitlements();
  const { palette } = useAppTheme();
  if (!ent.ready) return <ActivityIndicator color={palette.accent} />;
  const ownerId = String(user?._id || user?.id || "");
  if (!ownerId || !ent.can(CAPABILITY_KEYS.STORE_FRONT_WRITE)) {
    return <Redirect href="/home" />;
  }
  return (
    <ContentMarketplaceScreen
      key={ownerId}
      initialTab="uploads"
      onBack={() => router.replace("/home/commercial/more")}
      onOpenOffer={(id: string) =>
        router.push({ pathname: "/marketplace", params: { content: id } })
      }
    />
  );
}
