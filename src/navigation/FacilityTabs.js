import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import FacilityDashboard from "../screens/facility/FacilityDashboard.js";
import RoomsList from "../screens/facility/RoomsList.js";
import FacilityTasks from "../screens/facility/FacilityTasks.js";
import TeamScreen from "../screens/facility/TeamScreen.js";
import SettingsScreen from "../screens/facility/SettingsScreen.js";
import PlantListScreen from "../screens/PlantListScreen.js";
import { useAuth } from "../context/AuthContext.js";
import { getFacilityDetail } from "../api/facility.js";

// Placeholder screens for Zones and Metrc
const ZonesListPlaceholder = () => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
    <Text>Zones feature coming soon</Text>
  </View>
);

const MetrcCheckpointsPlaceholder = () => (
  <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
    <Text>Metrc checkpoints feature coming soon</Text>
  </View>
);

const Tab = createBottomTabNavigator();

const FacilityTabs = () => {
  const { selectedFacilityId } = useAuth();
  const [trackingMode, setTrackingMode] = useState("batch");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFacilityTrackingMode();
  }, [selectedFacilityId]);

  const loadFacilityTrackingMode = async () => {
    try {
      const result = await getFacilityDetail(selectedFacilityId);
      if (result.success && result.data) {
        setTrackingMode(result.data.trackingMode || "batch");
      }
    } catch (error) {
      console.error("Error loading facility tracking mode:", error);
    } finally {
      setLoading(false);
    }
  };
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
          } else if (route.name === "CropsTabs") {
            // Dynamically change icon based on tracking mode
            if (trackingMode === "individual") {
              iconName = focused ? "leaf" : "leaf-outline";
            } else if (trackingMode === "zone") {
              iconName = focused ? "layers" : "layers-outline";
            } else {
              iconName = focused ? "grid" : "grid-outline";
            }
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
          else if (route.name === "CropsTabs") {
            // Dynamic label based on tracking mode
            if (trackingMode === "individual") {
              label = "Plants";
            } else if (trackingMode === "zone") {
              label = "Zones";
            } else if (trackingMode === "metrc-aligned") {
              label = "Counts";
            } else {
              label = "Batches";
            }
          } else if (route.name === "FacilityTasks") label = "Tasks";
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
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            // Reload tracking mode when returning to dashboard
            loadFacilityTrackingMode();
          }
        })}
      />
      <Tab.Screen
        name="RoomsList"
        component={RoomsList}
        options={{
          title: "Rooms"
        }}
      />

      {/* Conditional Crops Tab - Changes based on trackingMode */}
      {trackingMode === "individual" && (
        <Tab.Screen
          name="CropsTabs"
          component={PlantListScreen}
          options={{
            title: "Plants"
          }}
        />
      )}

      {/* Batch tracking mode disabled - BatchCycleList not available
      {trackingMode === "batch" && (
        <Tab.Screen
          name="CropsTabs"
          component={BatchCycleList}
          options={{
            title: "Batches"
          }}
        />
      )}
      */}

      {trackingMode === "zone" && (
        <Tab.Screen
          name="CropsTabs"
          component={ZonesListPlaceholder}
          options={{
            title: "Zones"
          }}
        />
      )}

      {trackingMode === "metrc-aligned" && (
        <Tab.Screen
          name="CropsTabs"
          component={MetrcCheckpointsPlaceholder}
          options={{
            title: "Counts"
          }}
        />
      )}

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
