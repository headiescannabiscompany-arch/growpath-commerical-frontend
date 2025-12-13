import ScheduleScreen from "../screens/ScheduleScreen";
// Removed duplicate import and stray JSX
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
import { View, Text, StyleSheet } from "react-native";
import { colors, radius, spacing } from "../theme/theme";

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: "🏠",
  Plants: "🌱",
  Diagnose: "🔍",
  Search: "🔎",
  Forum: "💬",
  Courses: "📚",
  Profile: "👤",
  Calendar: "📅",
  Schedule: "🗓️"
};

function TabIcon({ label, focused }) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Text style={styles.iconEmoji}>{TAB_ICONS[label]}</Text>
      <Text style={[styles.iconLabel, focused && styles.iconLabelActive]}>{label}</Text>
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
          tabBarLabel: ({ focused }) => <TabIcon label="Home" focused={focused} />
        }}
      />

      <Tab.Screen
        name="PlantsTab"
        component={GrowLogsScreen}
        options={{
          title: "Plants",
          tabBarLabel: ({ focused }) => <TabIcon label="Plants" focused={focused} />
        }}
      />

      <Tab.Screen
        name="DiagnoseTab"
        component={DiagnoseScreen}
        options={{
          title: "Diagnose",
          tabBarLabel: ({ focused }) => <TabIcon label="Diagnose" focused={focused} />
        }}
      />

      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{
          title: "Search",
          tabBarLabel: ({ focused }) => <TabIcon label="Search" focused={focused} />
        }}
      />

      <Tab.Screen
        name="ForumTab"
        component={ForumScreen}
        options={{
          title: "Growers Guild",
          tabBarLabel: ({ focused }) => <TabIcon label="Guild" focused={focused} />
        }}
      />

      <Tab.Screen
        name="CoursesTab"
        component={CoursesScreen}
        options={{
          title: "Courses",
          tabBarLabel: ({ focused }) => <TabIcon label="Courses" focused={focused} />
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: "Profile",
          tabBarLabel: ({ focused }) => <TabIcon label="Profile" focused={focused} />
        }}
      />
      <Tab.Screen
        name="CalendarTab"
        component={GrowLogCalendarScreen}
        options={{
          title: "Calendar",
          tabBarLabel: ({ focused }) => <TabIcon label="Calendar" focused={focused} />
        }}
      />
      <Tab.Screen
        name="ScheduleTab"
        component={ScheduleScreen}
        options={{
          title: "Schedule",
          tabBarLabel: ({ focused }) => <TabIcon label="Schedule" focused={focused} />
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
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 32,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)"
  },
  iconWrap: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: radius.pill,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 70
  },
  iconWrapActive: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4
  },
  iconEmoji: {
    fontSize: 22,
    marginBottom: 2
  },
  iconLabel: {
    fontSize: 10,
    color: colors.tabIcon,
    fontWeight: "500"
  },
  iconLabelActive: {
    color: "#FFFFFF",
    fontWeight: "700"
  }
});
