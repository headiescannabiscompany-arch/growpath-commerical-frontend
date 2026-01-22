// PersonalTabs.js: Tab navigator for personal mode, using capability-driven registry

import React, { useContext } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { AuthContext } from "../context/AuthContext.js";
import { PAGE_REGISTRY_PERSONAL } from "./pageRegistry.personal.js";
import { Ionicons } from "@expo/vector-icons";
import { buildCaps } from "../auth/capabilities";
import { filterRegistry } from "./filterRegistry";

const Tab = createBottomTabNavigator();

export default function PersonalTabs() {
  const SHOW_ALL_TABS_FOR_TESTING =
    process.env.EXPO_PUBLIC_SHOW_ALL_TABS === "true" ||
    process.env.REACT_APP_SHOW_ALL_TABS === "true";

  const { user } = useContext(AuthContext);
  const caps = buildCaps(user);
  const enabledPages = filterRegistry(
    PAGE_REGISTRY_PERSONAL,
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
