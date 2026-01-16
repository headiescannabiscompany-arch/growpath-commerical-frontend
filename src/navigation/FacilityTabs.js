const FacilityTabs = ({ isCommercial, trackingMode }) => {
  const Tab = createBottomTabNavigator();

  if (isCommercial) {
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
          component={CommercialDashboardScreen}
          options={{
            title: "Commercial"
          }}
        />
        <Tab.Screen
          name="CommercialCourses"
          component={CoursesScreen}
          options={{
            title: "Courses"
          }}
        />
        <Tab.Screen
          name="CommercialProfile"
          component={ProfileScreen}
          options={{
            title: "Profile"
          }}
        />
      </Tab.Navigator>
    );
  }

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
