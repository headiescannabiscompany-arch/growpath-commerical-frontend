import AppPage from "@/components/layout/AppPage";
import SocialToolsScreen from "@/screens/SocialToolsScreen";

export default function CommercialSocialToolsRoute() {
  return (
    <AppPage
      routeKey="commercial-social-tools"
      longContent
      backFallbackHref="/home/commercial/more"
    >
      <SocialToolsScreen />
    </AppPage>
  );
}
