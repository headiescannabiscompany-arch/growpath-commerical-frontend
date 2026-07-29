import AppPage from "@/components/layout/AppPage";
import LiveSessionsListScreen from "@/screens/LiveSessionsListScreen";

export default function LivesRoute() {
  return (
    <AppPage routeKey="lives">
      <LiveSessionsListScreen />
    </AppPage>
  );
}
