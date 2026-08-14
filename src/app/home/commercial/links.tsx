import AppPage from "@/components/layout/AppPage";
import LinksScreen from "@/screens/LinksScreen";

export default function CommercialLinksRoute() {
  return (
    <AppPage
      routeKey="commercial-links"
      longContent
      backFallbackHref="/home/commercial/more"
    >
      <LinksScreen />
    </AppPage>
  );
}
