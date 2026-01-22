import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import DashboardScreen from "../screens/DashboardScreen";
import GrowLogsScreen from "../screens/GrowLogsScreen";
import GrowLogCalendarScreen from "../screens/GrowLogCalendarScreen";
import DiagnoseScreen from "../screens/DiagnoseScreen";
import ForumScreen from "../screens/ForumScreen";
import SearchScreen from "../screens/SearchScreen";
import ProfileScreen from "../screens/ProfileScreen";
import CoursesScreen from "../screens/CoursesScreen";
import DebugScreen from "../screens/DebugScreen";
import AppShell from "../components/AppShell";
import { View, Text, StyleSheet } from "react-native";
import { TAB_CONFIG, canAccess } from "./tabConfig";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../theme/theme";
import FeedScreen from "../screens/FeedScreen";
import { useAuth } from "../context/AuthContext";

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: "🏠",
  Plants: "🌱",
  Diagnose: "🔍",
  Search: "🔎",
  Feed: "📡",
  Forum: "💬",
  Courses: "📚",
  Profile: "👤",
  Calendar: "📅"
};
function TabIcon({ label, focused, testID }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]} testID={testID}>
      <Text style={styles.iconEmoji}>{TAB_ICONS[label]}</Text>
      <Text
        style={[styles.iconLabel, focused && styles.iconLabelActive]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {label}
      </Text>
    </View>
  );
}

function MainTabs() {
  const { capabilities } = useAuth();
  // Map tab config to actual screen components
  const tabScreens = {
    DashboardScreen,
    GrowLogsScreen,
    GrowLogCalendarScreen,
    DiagnoseScreen,
    ForumScreen,
    SearchScreen,
    ProfileScreen,
    CoursesScreen,
    DebugScreen,
    FeedScreen
  };
  const filteredTabs = TAB_CONFIG.filter(
    (tab) => canAccess(capabilities, tab.requiredCaps) && (!tab.devOnly || __DEV__)
  );
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarBackground: () => <View style={styles.tabBg} />
        }}
      >
        {filteredTabs.map((tab) => (
          <Tab.Screen
            key={tab.key}
            name={tab.routeName}
            component={tabScreens[tab.component]}
            options={{
              title: tab.label,
              tabBarLabel: ({ focused }) => (
                <TabIcon
                  label={tab.label}
                  focused={focused}
                  testID={`tab-${tab.key.toLowerCase()}`}
                />
              )
            }}
          />
        ))}
        <Tab.Screen
          name="CalendarTab"
          component={GrowLogCalendarScreen}
          options={{
            title: "Calendar",
            tabBarLabel: ({ focused }) => (
              <TabIcon label="Calendar" focused={focused} testID="tab-calendar" />
            )
          }}
        />
        {/* DEV: Debug tab only in development */}
        {__DEV__ && (
          <Tab.Screen
            name="DebugTab"
            component={DebugScreen}
            options={{
              title: "Debug",
              tabBarLabel: ({ focused }) => (
                <TabIcon label="Debug" focused={focused} testID="tab-debug" />
              )
            }}
          />
        )}
      </Tab.Navigator>
    </SafeAreaView>
  );
}

export default MainTabs;
const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 24,
    borderRadius: radius.card + 4,
    height: 75,
    borderTopWidth: 0,
    elevation: 0,
    backgroundColor: "transparent",
    paddingBottom: 8
  },
  tabBg: {
    flex: 1,
    backgroundColor: colors.tabBg,
    borderRadius: radius.card + 4,
    boxShadow: "0px 8px 32px rgba(0,0,0,0.12)",
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)"
  },
  iconWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    borderRadius: radius.pill,
    backgroundColor: "transparent",
    minWidth: 70,
    maxWidth: 140,
    flexShrink: 1
  },
  iconWrapActive: {
    backgroundColor: colors.accent,
    boxShadow: "0px 4px 8px rgba(0,0,0,0.2)",
    elevation: 4
  },
  iconEmoji: {
    fontSize: 20,
    marginRight: spacing(0.5)
  },
  iconLabel: {
    fontSize: 10,
    color: colors.tabIcon,
    fontWeight: "500",
    flexShrink: 1
  },
  iconLabelActive: {
    color: "#FFFFFF",
    fontWeight: "700"
  }
});
