import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import FacilityDashboard from "../screens/facility/FacilityDashboard";
import RoomsList from "../screens/facility/RoomsList";
import FacilityTasks from "../screens/facility/FacilityTasks";
import TeamScreen from "../screens/facility/TeamScreen";
import SettingsScreen from "../screens/facility/SettingsScreen";

const Tab = createBottomTabNavigator();

const FacilityTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        headerStyle: {
          backgroundColor: "#fff",
          borderBottomWidth: 1,
          borderBottomColor: "#e5e7eb"
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: "600",
          color: "#1f2937"
        },
        tabBarActiveTintColor: "#0ea5e9",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopWidth: 1,
          borderTopColor: "#e5e7eb",
          paddingBottom: 8,
          paddingTop: 8
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "FacilityDashboard") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "RoomsList") {
            iconName = focused ? "layers" : "layers-outline";
          } else if (route.name === "FacilityTasks") {
            iconName = focused ? "checkmark-circle" : "checkmark-circle-outline";
          } else if (route.name === "TeamScreen") {
            iconName = focused ? "people" : "people-outline";
          } else if (route.name === "SettingsScreen") {
            iconName = focused ? "settings" : "settings-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarLabel: ({ focused, color }) => {
          let label;
          if (route.name === "FacilityDashboard") label = "Home";
          else if (route.name === "RoomsList") label = "Rooms";
          else if (route.name === "FacilityTasks") label = "Tasks";
          else if (route.name === "TeamScreen") label = "Team";
          else if (route.name === "SettingsScreen") label = "Settings";

          return <></>;
        }
      })}
    >
      <Tab.Screen
        name="FacilityDashboard"
        component={FacilityDashboard}
        options={{
          title: "Facility"
        }}
      />
      <Tab.Screen
        name="RoomsList"
        component={RoomsList}
        options={{
          title: "Rooms"
        }}
      />
      <Tab.Screen
        name="FacilityTasks"
        component={FacilityTasks}
        options={{
          title: "Tasks"
        }}
      />
      <Tab.Screen
        name="TeamScreen"
        component={TeamScreen}
        options={{
          title: "Team"
        }}
      />
      <Tab.Screen
        name="SettingsScreen"
        component={SettingsScreen}
        options={{
          title: "Settings"
        }}
      />
    </Tab.Navigator>
  );
};

export default FacilityTabs;
