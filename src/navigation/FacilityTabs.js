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
import FacilityTasks from "../screens/facility/FacilityTasks";
import RoomsList from "../screens/facility/RoomsList";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import FacilityDashboard from "../screens/facility/FacilityDashboard";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import AppShell from "../components/AppShell";
export const FacilityTabs = ({ isCommercial, trackingMode }) => {
  const Tab = createBottomTabNavigator();

  if (isCommercial) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
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

              if (route.name === "CommercialDashboard") {
                iconName = focused ? "briefcase" : "briefcase-outline";
              } else if (route.name === "CommercialCourses") {
                iconName = focused ? "school" : "school-outline";
              } else if (route.name === "CommercialProfile") {
                iconName = focused ? "person" : "person-outline";
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarLabel: () => <></>
          })}
        >
          <Tab.Screen
            name="CommercialDashboard"
            options={{
              title: "Commercial"
            }}
          >
            {() => (
              <AppShell>
                <CommercialDashboardScreen />
              </AppShell>
            )}
          </Tab.Screen>
          <Tab.Screen
            name="CommercialCourses"
            options={{
              title: "Courses"
            }}
          >
            {() => (
              <AppShell>
                <CoursesScreen />
              </AppShell>
            )}
          </Tab.Screen>
          <Tab.Screen
            name="CommercialProfile"
            options={{
              title: "Profile"
            }}
          >
            {() => (
              <AppShell>
                <ProfileScreen />
              </AppShell>
            )}
          </Tab.Screen>
        </Tab.Navigator>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
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
              } else if (trackingMode === "metrc-aligned") {
                iconName = focused ? "counts" : "counts-outline";
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
          options={{
            title: "Facility"
          }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              // Reload tracking mode when returning to dashboard
              loadFacilityTrackingMode();
            }
          })}
        >
          {() => (
            <AppShell>
              <FacilityDashboard />
            </AppShell>
          )}
        </Tab.Screen>
        <Tab.Screen
          name="RoomsList"
          options={{
            title: "Rooms"
          }}
        >
          {() => (
            <AppShell>
              <RoomsList />
            </AppShell>
          )}
        </Tab.Screen>

        {/* Conditional Crops Tab - Changes based on trackingMode */}
        {trackingMode === "individual" && (
          <Tab.Screen
            name="CropsTabs"
            options={{
              title: "Plants"
            }}
          >
            {() => (
              <AppShell>
                <PlantListScreen />
              </AppShell>
            )}
          </Tab.Screen>
        )}

        {/* Batch tracking mode disabled - BatchCycleList not available
        {trackingMode === "batch" && (
          <Tab.Screen
            name="CropsTabs"
            options={{
              title: "Batches"
            }}
          >
            {() => (
              <AppShell>
                <BatchCycleList />
              </AppShell>
            )}
          </Tab.Screen>
        )}
        */}

        {trackingMode === "zone" && (
          <Tab.Screen
            name="CropsTabs"
            options={{
              title: "Zones"
            }}
          >
            {() => (
              <AppShell>
                <ZonesListPlaceholder />
              </AppShell>
            )}
          </Tab.Screen>
        )}

        {trackingMode === "metrc-aligned" && (
          <Tab.Screen
            name="CropsTabs"
            options={{
              title: "Counts"
            }}
          >
            {() => (
              <AppShell>
                <MetrcCheckpointsPlaceholder />
              </AppShell>
            )}
          </Tab.Screen>
        )}

        <Tab.Screen
          name="FacilityTasks"
          options={{
            title: "Tasks"
          }}
        >
          {() => (
            <AppShell>
              <FacilityTasks />
            </AppShell>
          )}
        </Tab.Screen>
        <Tab.Screen
          name="TeamScreen"
          options={{
            title: "Team"
          }}
        >
          {() => (
            <AppShell>
              <TeamScreen />
            </AppShell>
          )}
        </Tab.Screen>
        <Tab.Screen
          name="SettingsScreen"
          options={{
            title: "Settings"
          }}
        >
          {() => (
            <AppShell>
              <SettingsScreen />
            </AppShell>
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </SafeAreaView>
  );
};
