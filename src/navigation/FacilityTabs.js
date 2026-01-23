import React, { useMemo } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import StubScreen from "../components/StubScreen";

function FacilityHomeStub(props) {
  return <StubScreen {...props} title="Facility Home" subtitle="Stub" />;
}
function FacilityTasksStub(props) {
  return <StubScreen {...props} title="Facility Tasks" subtitle="Stub" />;
}
function FacilityReportsStub(props) {
  return <StubScreen {...props} title="Facility Reports" subtitle="Stub" />;
}
function FacilityProfileStub(props) {
  return <StubScreen {...props} title="Facility Profile" subtitle="Stub" />;
}

const Tab = createBottomTabNavigator();

export default function FacilityTabs() {
  const tabs = useMemo(
    () => [
      { name: "FacilityHome", component: FacilityHomeStub, title: "Home" },
      { name: "FacilityTasks", component: FacilityTasksStub, title: "Tasks" },
      { name: "FacilityReports", component: FacilityReportsStub, title: "Reports" },
      { name: "FacilityProfile", component: FacilityProfileStub, title: "Profile" }
    ],
    []
  );

  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      {tabs.map((t) => (
        <Tab.Screen
          key={t.name}
          name={t.name}
          component={t.component}
          options={{ title: t.title }}
        />
      ))}
    </Tab.Navigator>
  );
}
