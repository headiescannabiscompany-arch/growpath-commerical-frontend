import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import FacilityTabs from "./FacilityTabs";
import StubScreen from "../components/StubScreen";

const Stack = createNativeStackNavigator();

function makeStub(title) {
  return function Screen(props) {
    return <StubScreen {...props} title={title} subtitle="Facility stub" />;
  };
}

export default function FacilityStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      {/* Root */}
      <Stack.Screen
        name="FacilityTabs"
        component={FacilityTabs}
        options={{ title: "Facility" }}
      />
      {/* Common “missing” screens you were navigating to */}
      <Stack.Screen name="GuildCode" component={makeStub("Guild Code")} />
      <Stack.Screen name="Subscription" component={makeStub("Subscription")} />
      <Stack.Screen name="PricingMatrix" component={makeStub("Pricing Matrix")} />
      {/* Forum-related */}
      <Stack.Screen name="ForumNewPost" component={makeStub("Forum: New Post")} />
      <Stack.Screen name="ForumPost" component={makeStub("Forum: Post")} />
    </Stack.Navigator>
  );
}
      >
        <Stack.Screen
          name="VendorDashboard"
          component={VendorDashboardScreen}
          options={{ title: "Vendor Dashboard" }}
        />
        <Stack.Screen
          name="EquipmentTools"
          component={EquipmentToolsScreen}
          options={{ title: "Equipment Tools" }}
        />
        <Stack.Screen
          name="NutrientTools"
          component={NutrientToolsScreen}
          options={{ title: "Nutrient Tools" }}
        />
        <Stack.Screen
          name="SocialMedia"
          component={SocialMediaScreen}
          options={{ title: "Social Media Integration" }}
        />
        <Stack.Screen
          name="InfluencerDashboard"
          component={InfluencerDashboardScreen}
          options={{ title: "Influencer Dashboard" }}
        />
        <Stack.Screen
          name="ContentMarketplace"
          component={ContentMarketplaceScreen}
          options={{ title: "Content Marketplace" }}
        />
        <Stack.Screen
          name="Communities"
          component={CommunitiesScreen}
          options={{ title: "Communities" }}
        />
        <Stack.Screen
          name="Advertising"
          component={AdvertisingScreen}
          options={{ title: "Advertising" }}
        />
        <Stack.Screen
          name="VendorMetrics"
          component={VendorMetricsScreen}
          options={{ title: "Vendor Metrics" }}
        />
        <Stack.Screen
          name="CommercialTools"
          component={CommercialToolsScreen}
          options={{ title: "Commercial Tools" }}
        />
        <Stack.Screen
          name="CommercialReports"
          component={CommercialReportsScreen}
          options={{ title: "Reports & Exports" }}
        />
        <Stack.Screen
          name="CommercialProfile"
          component={CommercialProfileScreen}
          options={{ title: "Commercial Profile" }}
        />
        {!isCommercial && (
          <>
            <Stack.Screen
              name="FacilityPicker"
              component={FacilityPicker}
              options={{
                title: "Select a Facility"
              }}
            />
            <Stack.Screen
              name="GreenWaste"
              component={GreenWasteScreen}
              options={{ title: "Green Waste" }}
            />
            <Stack.Screen
              name="AuditLog"
              component={AuditLogScreen}
              options={{ title: "Audit Logs" }}
            />
            <Stack.Screen
              name="SOPTemplates"
              component={SOPTemplatesScreen}
              options={{ title: "SOP Templates" }}
            />
            <Stack.Screen
              name="BillingAndReporting"
              component={BillingAndReportingScreen}
              options={{ title: "Billing & Reporting" }}
            />
            <Stack.Screen
              name="Verification"
              component={VerificationScreen}
              options={{ title: "Task Verification" }}
            />
            <Stack.Screen
              name="DeviationHandling"
              component={DeviationHandlingScreen}
              options={{ title: "Deviation Handling" }}
            />
          </>
        )}
      </Stack.Group>
      {!isCommercial && (
        <Stack.Screen
          name="RoomDetail"
          component={RoomDetail}
          options={({ route }) => ({
            title: route.params?.roomId ? "Room Details" : "Room"
          })}
        />
      )}
    </Stack.Navigator>
  );
};

export default FacilityStack;
