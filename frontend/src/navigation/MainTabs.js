import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import DashboardScreen from "../screens/DashboardScreen";
import GrowLogsScreen from "../screens/GrowLogsScreen";
import DiagnoseScreen from "../screens/DiagnoseScreen";
import GuideScreen from "../screens/GuideScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { View, Text, StyleSheet } from "react-native";
import { colors, radius, spacing } from "../theme/theme";

const Tab = createBottomTabNavigator();

function TabIcon({ label, focused }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Text style={[styles.iconLabel, focused && styles.iconLabelActive]}>
        {label}
      </Text>
    </View>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => <View style={styles.tabBg} />
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={DashboardScreen}
        options={{
          title: "Home",
          tabBarLabel: ({ focused }) => (
            <TabIcon label="Home" focused={focused} />
          )
        }}
      />

      <Tab.Screen
        name="PlantsTab"
        component={GrowLogsScreen}
        options={{
          title: "Plants",
          tabBarLabel: ({ focused }) => (
            <TabIcon label="Plants" focused={focused} />
          )
        }}
      />

      <Tab.Screen
        name="DiagnoseTab"
        component={DiagnoseScreen}
        options={{
          title: "Diagnose",
          tabBarLabel: ({ focused }) => (
            <TabIcon label="Diagnose" focused={focused} />
          )
        }}
      />

      <Tab.Screen
        name="GuideTab"
        component={GuideScreen}
        options={{
          title: "Guide",
          tabBarLabel: ({ focused }) => (
            <TabIcon label="Guide" focused={focused} />
          )
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: "Profile",
          tabBarLabel: ({ focused }) => (
            <TabIcon label="Profile" focused={focused} />
          )
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: radius.card,
    height: 70,
    borderTopWidth: 0,
    elevation: 0,
    backgroundColor: "transparent"
  },
  tabBg: {
    flex: 1,
    backgroundColor: colors.tabBg,
    borderRadius: radius.card,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 4
  },
  iconWrap: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    borderRadius: radius.pill,
    backgroundColor: "transparent"
  },
  iconWrapActive: {
    backgroundColor: colors.accent
  },
  iconLabel: {
    fontSize: 11,
    color: colors.tabIcon
  },
  iconLabelActive: {
    color: "#FFFFFF",
    fontWeight: "600"
  }
});
