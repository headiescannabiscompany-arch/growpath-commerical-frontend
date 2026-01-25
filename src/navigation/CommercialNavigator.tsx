import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CommercialDashboard from "../screens/commercial/CommercialDashboard";
import StorefrontScreen from "../screens/commercial/StorefrontScreen";
import InventoryScreen from "../screens/commercial/InventoryScreen";
import OrdersScreen from "../screens/commercial/OrdersScreen";
import CampaignsScreen from "../screens/commercial/CampaignsScreen";
import LinksScreen from "../screens/commercial/LinksScreen";

const Stack = createNativeStackNavigator();

export default function CommercialNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CommercialDashboard" component={CommercialDashboard} />
      <Stack.Screen name="Storefront" component={StorefrontScreen} />
      <Stack.Screen name="Inventory" component={InventoryScreen} />
      <Stack.Screen name="Orders" component={OrdersScreen} />
      <Stack.Screen name="Campaigns" component={CampaignsScreen} />
      <Stack.Screen name="Links" component={LinksScreen} />
    </Stack.Navigator>
  );
}
