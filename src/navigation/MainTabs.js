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
  Calendar: "📅",
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

export default function MainTabs() {
  const { isGuildMember, isPro } = useAuth();
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
            <TabIcon label="Home" focused={focused} testID="tab-home" />
          )
        }}
      />

      <Tab.Screen
        name="PlantsTab"
        component={GrowLogsScreen}
        options={{
          title: "Plants",
          tabBarLabel: ({ focused }) => (
            <TabIcon label="Plants" focused={focused} testID="tab-plants" />
          )
        }}
      />

      <Tab.Screen
        name="DiagnoseTab"
        component={DiagnoseScreen}
        options={{
          title: "Diagnose",
          tabBarLabel: ({ focused }) => (
            <TabIcon label="Diagnose" focused={focused} testID="tab-diagnose" />
          )
        }}
      />

      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{
          title: "Search",
          tabBarLabel: ({ focused }) => (
            <TabIcon label="Search" focused={focused} testID="tab-search" />
          )
        }}
      />

      {isPro && (
        <Tab.Screen
          name="FeedTab"
          component={FeedScreen}
          options={{
            title: isGuildMember ? "Feed" : "Community",
            tabBarLabel: ({ focused }) => (
              <TabIcon label="Feed" focused={focused} testID="tab-feed" />
            )
          }}
        />
      )}

      <Tab.Screen
        name="ForumTab"
        component={ForumScreen}
        options={{
          title: "Forum",
          tabBarLabel: ({ focused }) => (
            <TabIcon label="Forum" focused={focused} testID="tab-guild" />
          )
        }}
      />

      <Tab.Screen
        name="CoursesTab"
        component={CoursesScreen}
        options={{
          title: "Courses",
          tabBarLabel: ({ focused }) => (
            <TabIcon label="Courses" focused={focused} testID="tab-courses" />
          )
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: "Profile",
          tabBarLabel: ({ focused }) => (
            <TabIcon label="Profile" focused={focused} testID="tab-profile" />
          )
        }}
      />
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
