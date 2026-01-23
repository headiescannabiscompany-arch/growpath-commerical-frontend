import MarketplaceIntegrationScreen from "../screens/commercial/MarketplaceIntegrationScreen.js";
import VendorMetricsScreen from "../screens/commercial/VendorMetricsScreen.js";
import VendorAnalyticsScreen from "../screens/commercial/VendorAnalyticsScreen.js";
import AppIntroScreen from "../screens/AppIntroScreen.js";
import ToolsScreen from "../screens/ToolsScreen.js";
import VPDCalculatorScreen from "../screens/VPDCalculatorScreen.js";
import LightCalculatorScreen from "../screens/LightCalculatorScreen.js";
import ScheduleCalculatorScreen from "../screens/WateringSchedulerScreen.js";
// Stubs for other tools
import NutrientCalculatorScreen from "../screens/NutrientCalculatorScreen.js";
import WateringSchedulerScreen from "../screens/WateringSchedulerScreen.js";
import PHECCalculatorScreen from "../screens/PHECCalculatorScreen.js";
import GrowthTrackerScreen from "../screens/GrowthTrackerScreen.js";
import PestDiseaseIdentifierScreen from "../screens/PestDiseaseIdentifierScreen.js";
import HarvestEstimatorScreen from "../screens/HarvestEstimatorScreen.js";
import React, { useEffect, useCallback } from "react";
import PaymentsScreen from "../screens/PaymentsScreen.js";
import AnalyticsScreen from "../screens/AnalyticsScreen.js";
import FacilitiesScreen from "../screens/FacilitiesScreen.js";
import QAScreen from "../screens/QAScreen.js";
import { View, Text } from "react-native";

// Stub screen for missing routes
const StubScreen = ({ route }) => (
  <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
    <Text style={{ fontSize: 20, color: "#888" }}>{route.name} (TODO)</Text>
  </View>
);
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext.js";
import PersonalTabs from "./PersonalTabs.js";
import CommercialTabs from "./CommercialTabs.js";
import FacilityTabs from "./FacilityTabs.js";
import LoginScreen from "../screens/LoginScreen.js";
import AuthStackNavigator from "./AuthStack.js";
import GrowJournalScreen from "../screens/GrowJournalScreen.js";
import SubscribeScreen from "../screens/SubscribeScreen.js";
import CourseDetailScreen from "../screens/CourseDetailScreen.js";
import CourseScreen from "../screens/CourseScreen.js";
import CreateCourseScreen from "../screens/CreateCourseScreen.js";
import ManageCourseScreen from "../screens/ManageCourseScreen.js";
import AddLessonScreen from "../screens/AddLessonScreen.js";
import EditLessonScreen from "../screens/EditLessonScreen.js";
import LessonScreen from "../screens/LessonScreen.js";
import VendorSignup from "../screens/VendorSignup.js";
import CreateVendorGuide from "../screens/CreateVendorGuide.js";
import VendorGuidesScreen from "../screens/VendorGuidesScreen.js";
import CreatorDashboardScreen from "../screens/CreatorDashboardScreen.js";
import CreatorDashboardV2 from "../screens/CreatorDashboardV2.js";
import CreatorPayoutScreen from "../screens/CreatorPayoutScreen.js";
import CreatorSignatureUpload from "../screens/CreatorSignatureUpload.js";
import ProfileCertificatesScreen from "../screens/ProfileCertificatesScreen.js";
import PostDetailScreen from "../screens/PostDetailScreen.js";
import GrowLogTimelineScreen from "../screens/GrowLogTimelineScreen.js";
import GrowLogDetailScreen from "../screens/GrowLogDetailScreen.js";
import GrowLogEntryScreen from "../screens/GrowLogEntryScreen.js";
import GrowLogCalendarScreen from "../screens/GrowLogCalendarScreen.js";
import DiagnosisHistoryScreen from "../screens/DiagnosisHistoryScreen.js";
import { ForumPostDetailScreen } from "../screens/ForumPostDetailScreen.js";
import ForumNewPostScreen from "../screens/ForumNewPostScreen.js";
import GuildCodeScreen from "../screens/GuildCodeScreen.js";
import SubcategoryBrowserScreen from "../screens/SubcategoryBrowserScreen.js";
import CategoryBrowserScreen from "../screens/CategoryBrowserScreen.js";
import CategoryCoursesScreen from "../screens/CategoryCoursesScreen.js";
import GrowAddPlantScreen from "../screens/GrowAddPlantScreen.js";
import GrowEditPlantScreen from "../screens/GrowEditPlantScreen.js";

const Stack = createNativeStackNavigator();

import PrivacyPolicyScreen from "../screens/PrivacyPolicyScreen.js";
// DEV: Debug QA Harness
import DebugScreen from "../screens/DebugScreen.js";
import PricingMatrixScreen from "../screens/PricingMatrixScreen.js";
import CreatePostScreen from "../screens/CreatePostScreen.js";
import CommentsScreen from "../screens/CommentsScreen.js";
import TemplatesMarketplaceScreen from "../screens/TemplatesMarketplaceScreen.js";
import TemplateDetailScreen from "../screens/TemplateDetailScreen.js";
import TasksTodayScreen from "../screens/TasksTodayScreen.js";
import CreateTaskScreen from "../screens/CreateTaskScreen.js";
import DiagnoseResultScreen from "../screens/DiagnoseResultScreen.js";
import FeedingLabelScreen from "../screens/FeedingLabelScreen.js";
import FeedingConfirmScreen from "../screens/FeedingConfirmScreen.js";
import FeedingScheduleOptions from "../screens/FeedingScheduleOptions.js";
import FeedingScheduleResult from "../screens/FeedingScheduleResult.js";
import TrainingScreen from "../screens/TrainingScreen.js";
import TrainingResultScreen from "../screens/TrainingResultScreen.js";
import EnvironmentAssistantScreen from "../screens/EnvironmentAssistantScreen.js";
import PaywallScreen from "../screens/PaywallScreen.js";
import SubscriptionStatusScreen from "../screens/SubscriptionStatusScreen.js";
import PlantListScreen from "../screens/PlantListScreen.js";
import PlantDetailScreen from "../screens/PlantDetailScreen.js";
import SubscriptionScreen from "../screens/SubscriptionScreen.js";
import TokenInfoScreen from "../screens/TokenInfoScreen.js";
import EarningsScreen from "../screens/EarningsScreen.js";
import AdminCoursesScreen from "../screens/AdminCoursesScreen.js";
import CreatePlantScreen from "../screens/CreatePlantScreen.js";
import LiveSessionScreen from "../screens/LiveSessionScreen.js";
import LiveSessionsListScreen from "../screens/LiveSessionsListScreen.js";
import AdminReportsScreen from "../screens/AdminReportsScreen.js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const APP_INTRO_SEEN_KEY = "seenAppIntro";
const LEGACY_ONBOARDING_KEY = "seenOnboarding";

export default function RootNavigator() {
  const { token, user, mode, capabilities } = useAuth();
  // Log mode for debugging
  console.log(
    "[RootNavigator] token?",
    !!token,
    "mode:",
    mode,
    "user:",
    user?.email,
    "capabilities:",
    capabilities
  );

  if (!token) return <AuthStackNavigator />;

  // Determine allowed modes from capabilities
  const allowedModes = [];
  if (capabilities?.facilityTabs) allowedModes.push("facility");
  if (capabilities?.commercialTabs) allowedModes.push("commercial");
  if (capabilities?.personalTabs || allowedModes.length === 0)
    allowedModes.push("personal");

  // Fallback to first allowed mode if current mode is not allowed
  const activeMode = allowedModes.includes(mode) ? mode : allowedModes[0];

  // Register only allowed tab shells as stack routes
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {allowedModes.includes("personal") && (
        <Stack.Screen name="PersonalTabs" component={PersonalTabs} />
      )}
      {allowedModes.includes("commercial") && (
        <Stack.Screen name="CommercialTabs" component={CommercialTabs} />
      )}
      {allowedModes.includes("facility") && (
        <Stack.Screen name="FacilityTabs" component={FacilityTabs} />
      )}
    </Stack.Navigator>
  );
}
