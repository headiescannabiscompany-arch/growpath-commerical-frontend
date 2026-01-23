import React, { useMemo } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import StubScreen from "../components/StubScreen";

const Tab = createBottomTabNavigator();

function makeTabStub(title) {
  return function Screen(props) {
    return <StubScreen {...props} title={title} subtitle="Commercial tab stub" />;
  };
}

export default function CommercialTabs() {
  const tabs = useMemo(
    () => [
      { name: "Storefront", title: "Storefront" },
      { name: "CommercialTools", title: "Tools" },
      { name: "CommercialReports", title: "Reports" },
      { name: "CommercialProfile", title: "Profile" }
    ],
    []
  );

  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      {tabs.map((t) => (
        <Tab.Screen
          key={t.name}
          name={t.name}
          component={makeTabStub(t.title)}
          options={{ title: t.title }}
        />
      ))}
    </Tab.Navigator>
  );
}
