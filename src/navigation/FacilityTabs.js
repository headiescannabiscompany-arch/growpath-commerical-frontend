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
import { PAGE_REGISTRY_FACILITY } from "./pageRegistry.facility.js";
import { Ionicons } from "@expo/vector-icons";

const Tab = createBottomTabNavigator();

export default function FacilityTabs() {
  const { capabilities } = useContext(AuthContext);
  const pages = PAGE_REGISTRY_FACILITY.filter(
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
              ? ({ color, size }) => (
                  <Ionicons name={page.icon} color={color} size={size} />
                )
              : undefined,
            title: page.label
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
