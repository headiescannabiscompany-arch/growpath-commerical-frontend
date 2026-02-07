import React from "react";
import AppPage from "@/components/layout/AppPage";
import LiveSessionScreen from "@/screens/LiveSessionScreen";

export default function LiveSessionRoute() {
  return (
    <AppPage routeKey="live-session">
      <LiveSessionScreen route={{} as any} />
    </AppPage>
  );
}
