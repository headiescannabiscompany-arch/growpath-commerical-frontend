import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import FacilityTabs from "./FacilityTabs";
import FacilityPicker from "../screens/facility/FacilityPicker";
import RoomDetail from "../screens/facility/RoomDetail";

const Stack = createNativeStackNavigator();

const FacilityStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
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
        headerTintColor: "#0ea5e9",
        headerBackTitleVisible: false
      }}
    >
      <Stack.Screen
        name="FacilityTabs"
        component={FacilityTabs}
        options={{
          headerShown: false
        }}
      />
      <Stack.Group
        screenOptions={{
          presentation: "modal",
          animationEnabled: true
        }}
      >
        <Stack.Screen
          name="FacilityPicker"
          component={FacilityPicker}
          options={{
            title: "Select a Facility"
          }}
        />
      </Stack.Group>
      <Stack.Screen
        name="RoomDetail"
        component={RoomDetail}
        options={({ route }) => ({
          title: route.params?.roomId ? "Room Details" : "Room"
        })}
      />
    </Stack.Navigator>
  );
};

export default FacilityStack;
