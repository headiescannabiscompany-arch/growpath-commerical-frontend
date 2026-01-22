// Temporary stub to prevent crash if SettingsScreen is not defined
const SettingsScreen = () => (
  <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
    <Text>Settings (stub)</Text>
  </SafeAreaView>
);
// Temporary stub to prevent crash if TeamScreen is not defined
const TeamScreen = () => (
  <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
    <Text>Team (stub)</Text>
  </SafeAreaView>
);

import React, { useContext } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { AuthContext } from "../context/AuthContext.js";
import { Ionicons } from "@expo/vector-icons";
import { buildCaps } from "../auth/capabilities";
import { filterRegistry } from "./filterRegistry";

const Tab = createBottomTabNavigator();

export default function FacilityTabs() {
  const SHOW_ALL_TABS_FOR_TESTING =
    process.env.EXPO_PUBLIC_SHOW_ALL_TABS === "true" ||
    process.env.REACT_APP_SHOW_ALL_TABS === "true";

  const { user } = useContext(AuthContext);
  const caps = buildCaps(user);
  const enabledPages = filterRegistry(
    PAGE_REGISTRY_FACILITY,
    user,
    caps,
    SHOW_ALL_TABS_FOR_TESTING
  );

  function renderIonicon(name, color, size) {
    return React.createElement(Ionicons, { name, color, size });
  }

  const pagesToRender = enabledPages?.length
    ? enabledPages
    : [{ name: "Dashboard", component: () => null }];

  return (
    <Tab.Navigator>
      {pagesToRender.map((page) => (
        <Tab.Screen
          key={page.name}
          name={page.name}
          component={page.component}
          options={{
            tabBarIcon: page.icon
              ? ({ color, size }) => renderIonicon(page.icon, color, size)
              : () => null,
            tabBarLabel: page.label,
            title: page.label
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
