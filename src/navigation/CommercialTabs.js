// CommercialTabs.js: Tab navigator for commercial mode, using capability-driven registry

import React, { useContext } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { AuthContext } from "../context/AuthContext.js";
import { PAGE_REGISTRY_COMMERCIAL } from "./pageRegistry.commercial.js";
import { Ionicons } from "@expo/vector-icons";
import { buildCaps } from "../auth/capabilities";
import { filterRegistry } from "./filterRegistry";

function renderIonicon(name, color, size) {
  return React.createElement(Ionicons, { name, color, size });
}

const Tab = createBottomTabNavigator();

export default function CommercialTabs() {
  // Never bypass filtering in production
  const SHOW_ALL_TABS_FOR_TESTING = false;

  const { user } = useContext(AuthContext);
  const caps = buildCaps(user);
  const enabledPages = filterRegistry(
    PAGE_REGISTRY_COMMERCIAL,
    user,
    caps,
    SHOW_ALL_TABS_FOR_TESTING
  );
  // Deny by default if no caps or user
  const safePages = !caps || !user ? [] : enabledPages;

  // Debug logs for development
  if (typeof window !== "undefined") {
    console.log(
      "[CommercialTabs] registry:",
      PAGE_REGISTRY_COMMERCIAL.map((p) => p.name)
    );
    console.log(
      "[CommercialTabs] enabled:",
      enabledPages.map((p) => p.name)
    );
  }

  const pagesToRender = safePages?.length
    ? safePages
    : [{ name: "Storefront", component: StorefrontScreen }];

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
