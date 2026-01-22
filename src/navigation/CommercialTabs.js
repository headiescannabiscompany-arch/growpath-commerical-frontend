// CommercialTabs.js: Tab navigator for commercial mode, using capability-driven registry
import React, { useContext } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { AuthContext } from "../context/AuthContext.js";
import { PAGE_REGISTRY_COMMERCIAL } from "./pageRegistry.commercial.js";
import { Ionicons } from "@expo/vector-icons";

// Helper to render Ionicons with dynamic string names in JS
function renderIonicon(name, color, size) {
  return React.createElement(Ionicons, { name, color, size });
}

const Tab = createBottomTabNavigator();

export default function CommercialTabs() {
  const { capabilities } = useContext(AuthContext);
  const pages = PAGE_REGISTRY_COMMERCIAL.filter(
    (page) => capabilities && capabilities[page.capabilityKey]
  );
  return (
    <Tab.Navigator>
      {pages.map((page) => (
        <Tab.Screen
          key={page.name}
          name={page.name}
          component={page.component}
          options={{
            tabBarIcon: page.icon
              ? ({ color, size }) => renderIonicon(page.icon, color, size)
              : undefined,
            title: page.label
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
