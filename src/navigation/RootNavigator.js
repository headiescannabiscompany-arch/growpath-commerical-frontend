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
import { Text } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext.js";
import { FacilityTabs } from "./FacilityTabs.js";
import LoginScreen from "../screens/LoginScreen.js";
import MainTabs from "./MainTabs.js";
import FacilityStack from "./FacilityStack.js";
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
import CertificateViewer from "../screens/CertificateViewer.js";
import VerifyCertificateScreen from "../screens/VerifyCertificateScreen.js";
import PostDetailScreen from "../screens/PostDetailScreen.js";
import GrowLogTimelineScreen from "../screens/GrowLogTimelineScreen.js";
import GrowLogDetailScreen from "../screens/GrowLogDetailScreen.js";
import GrowLogEntryScreen from "../screens/GrowLogEntryScreen.js";
import GrowLogCalendarScreen from "../screens/GrowLogCalendarScreen.js";
import DiagnosisHistoryScreen from "../screens/DiagnosisHistoryScreen.js";
import ForumPostDetailScreen from "../screens/ForumPostDetailScreen.js";
import ForumNewPostScreen from "../screens/ForumNewPostScreen.js";
import GuildCodeScreen from "../screens/GuildCodeScreen.js";
import SubcategoryBrowserScreen from "../screens/SubcategoryBrowserScreen.js";
import CategoryBrowserScreen from "../screens/CategoryBrowserScreen.js";
import CategoryCoursesScreen from "../screens/CategoryCoursesScreen.js";
import GrowAddPlantScreen from "../screens/GrowAddPlantScreen.js";
import GrowEditPlantScreen from "../screens/GrowEditPlantScreen.js";

const Stack = createNativeStackNavigator();

import PrivacyPolicyScreen from "../screens/PrivacyPolicyScreen.js";
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
  const { isPro, token, user, mode } = useAuth();
  const [showIntro, setShowIntro] = React.useState(isPro ? false : null);
  const isAuthenticated = Boolean(token && user);

  useEffect(() => {
    let mounted = true;
    const resolveIntroState = async () => {
      try {
        const [introValue, legacyOnboarding] = await Promise.all([
          AsyncStorage.default.getItem(APP_INTRO_SEEN_KEY),
          AsyncStorage.default.getItem(LEGACY_ONBOARDING_KEY)
        ]);
        if (!mounted) return;
        if (isPro) {
          setShowIntro(false);
        } else {
          const shouldShow = introValue !== "true" && legacyOnboarding !== "true";
          setShowIntro(shouldShow);
        }
      } catch {
        if (mounted) setShowIntro(!isPro);
      }
    };
    resolveIntroState();
    return () => {
      mounted = false;
    };
  }, [isPro]);

  const handleIntroDone = useCallback(async () => {
    try {
      await AsyncStorage.default.setItem(APP_INTRO_SEEN_KEY, "true");
    } catch {
      // best-effort; failure just means intro may show again next launch
    }
    setShowIntro(false);
  }, []);

  if (showIntro === null) {
    return (
      <Text
        style={{
          backgroundColor: "red",
          color: "white",
          fontWeight: "bold",
          fontSize: 20,
          padding: 8,
          textAlign: "center",
          zIndex: 9999
        }}
      >
        FALLBACK: showIntro is null
      </Text>
    );
  }

  // Role-based navigator branching
  let initialRouteName =
    !isAuthenticated && !isPro && showIntro
      ? "AppIntro"
      : isAuthenticated
        ? mode === "facility"
          ? "FacilityStack"
          : mode === "commercial"
            ? "CommercialTabs"
            : "MainTabs"
        : "Login";

  const navigatorKey = `${isAuthenticated ? "auth" : "guest"}-${showIntro ? "intro" : "main"}-${mode}`;

  // Role helpers
  const isCreator = user && user.role === "creator";
  const isPartner = user && user.role === "partner";
  const isFacility = user && user.role === "facility";
  const isAdmin = user && user.role === "admin";

  return (
    <>
      <Text
        style={{
          backgroundColor: "blue",
          color: "white",
          fontWeight: "bold",
          fontSize: 20,
          padding: 8,
          textAlign: "center",
          zIndex: 9999
        }}
      >
        DEBUG: RootNavigator visible
      </Text>
      <Stack.Navigator
        key={navigatorKey}
        initialRouteName={initialRouteName}
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: "#10B981" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "bold" }
        }}
      >
        {/* Public/Onboarding */}
        {!isPro && showIntro ? (
          <Stack.Screen name="AppIntro" options={{ headerShown: false }}>
            {(props) => <AppIntroScreen {...props} onDone={handleIntroDone} />}
          </Stack.Screen>
        ) : null}
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />

        <Stack.Screen
          name="PricingMatrix"
          component={PricingMatrixScreen}
          options={{ title: "Plans & Pricing" }}
        />

        {/* Main App (Regular/Pro) */}
        {isAuthenticated && (
          <>
            {/* Personal mode */}
            {mode === "personal" && (
              <Stack.Screen
                name="MainTabs"
                component={MainTabs}
                options={{ headerShown: false }}
              />
            )}
            {/* Facility mode */}
            {mode === "facility" && (
              <Stack.Screen
                name="FacilityStack"
                component={FacilityTabs}
                options={{ headerShown: false }}
                initialParams={{ isCommercial: false }}
              />
            )}
            {/* Commercial mode */}
            {mode === "commercial" && (
              <Stack.Screen
                name="CommercialTabs"
                component={FacilityTabs}
                options={{ headerShown: false }}
                initialParams={{ isCommercial: true }}
              />
            )}
            {/* Fallback for unknown mode */}
            {!["personal", "facility", "commercial"].includes(mode) && (
              <Stack.Screen name="UnknownMode">
                {() => (
                  <Text
                    style={{
                      flex: 1,
                      textAlign: "center",
                      textAlignVertical: "center",
                      color: "#ef4444",
                      fontSize: 20,
                      padding: 32
                    }}
                  >
                    Unknown user mode: {mode}. Please contact support.
                  </Text>
                )}
              </Stack.Screen>
            )}
            <Stack.Screen
              name="Tools"
              component={ToolsScreen}
              options={{ title: "Tools" }}
            />
            <Stack.Screen
              name="VPDCalculator"
              component={VPDCalculatorScreen}
              options={{ title: "VPD Calculator" }}
            />
            <Stack.Screen
              name="LightCalculator"
              component={LightCalculatorScreen}
              options={{ title: "Light Calculator" }}
            />
            {/* Add other tool screens here as you implement them */}
            <Stack.Screen name="GrowJournal" component={GrowJournalScreen} />
            <Stack.Screen
              name="GrowAddPlant"
              component={GrowAddPlantScreen}
              options={{ title: "Add Plant" }}
            />
            <Stack.Screen
              name="GrowEditPlant"
              component={GrowEditPlantScreen}
              options={{ title: "Edit Plant" }}
            />
            <Stack.Screen name="Subscribe" component={SubscribeScreen} />
            <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
            <Stack.Screen
              name="Course"
              component={CourseScreen}
              options={{ title: "Course" }}
            />
            <Stack.Screen
              name="EditLesson"
              component={EditLessonScreen}
              options={{ title: "Edit Lesson" }}
            />
            <Stack.Screen
              name="Lesson"
              component={LessonScreen}
              options={{ title: "Lesson" }}
            />
            <Stack.Screen
              name="ProfileCertificates"
              component={ProfileCertificatesScreen}
            />
            <Stack.Screen name="CertificateViewer" component={CertificateViewer} />
            <Stack.Screen name="VerifyCertificate" component={VerifyCertificateScreen} />
            <Stack.Screen name="PostDetail" component={PostDetailScreen} />
            <Stack.Screen name="GrowLogTimeline" component={GrowLogTimelineScreen} />
            <Stack.Screen name="GrowLogDetail" component={GrowLogDetailScreen} />
            <Stack.Screen name="GrowLogEntry" component={GrowLogEntryScreen} />
            <Stack.Screen name="GrowLogCalendar" component={GrowLogCalendarScreen} />
            <Stack.Screen name="DiagnosisHistory" component={DiagnosisHistoryScreen} />
            <Stack.Screen name="ForumPostDetail" component={ForumPostDetailScreen} />
            <Stack.Screen name="ForumNewPost" component={ForumNewPostScreen} />
            <Stack.Screen name="GuildCode" component={GuildCodeScreen} />
            <Stack.Screen
              name="SubcategoryBrowser"
              component={SubcategoryBrowserScreen}
            />
            <Stack.Screen name="CategoryBrowser" component={CategoryBrowserScreen} />
            <Stack.Screen name="CategoryCourses" component={CategoryCoursesScreen} />
            <Stack.Screen name="Earnings" component={EarningsScreen} />
            {/* Creator/Educator */}
            {isCreator && (
              <>
                <Stack.Screen
                  name="CreatorDashboard"
                  component={CreatorDashboardScreen}
                />
                <Stack.Screen name="CreatorDashboardV2" component={CreatorDashboardV2} />
                <Stack.Screen name="CreatorPayouts" component={CreatorPayoutScreen} />
                <Stack.Screen
                  name="CreatorSignatureUpload"
                  component={CreatorSignatureUpload}
                />
                <Stack.Screen name="CreateCourse" component={CreateCourseScreen} />
                <Stack.Screen name="ManageCourse" component={ManageCourseScreen} />
                <Stack.Screen name="AddLesson" component={AddLessonScreen} />
                <Stack.Screen name="VendorSignup" component={VendorSignup} />
                <Stack.Screen name="CreateVendorGuide" component={CreateVendorGuide} />
                <Stack.Screen name="VendorGuides" component={VendorGuidesScreen} />
              </>
            )}
            {/* Partner/Brand */}
            {isPartner && (
              <>
                <Stack.Screen
                  name="MarketplaceIntegration"
                  component={MarketplaceIntegrationScreen}
                />
                <Stack.Screen name="VendorMetrics" component={VendorMetricsScreen} />
                <Stack.Screen name="VendorAnalytics" component={VendorAnalyticsScreen} />
              </>
            )}
            {/* Facility/Commercial */}
            {isFacility ? (
              <Stack.Screen name="FacilityStack" component={FacilityStack} />
            ) : (
              <Stack.Screen
                name="NotFacility"
                options={{ title: "Facility Access Required", headerShown: true }}
              >
                {() => (
                  <Text
                    style={{
                      flex: 1,
                      textAlign: "center",
                      textAlignVertical: "center",
                      color: "#0ea5e9",
                      fontSize: 20,
                      padding: 32
                    }}
                  >
                    This section is for facility/commercial users only. If you believe
                    this is an error, please contact support or select a different
                    workspace.
                  </Text>
                )}
              </Stack.Screen>
            )}
            {/* Admin */}
            {isAdmin && (
              <>
                <Stack.Screen name="AdminCourses" component={AdminCoursesScreen} />
                <Stack.Screen name="AdminReports" component={AdminReportsScreen} />
              </>
            )}
          </>
        )}
      </Stack.Navigator>
    </>
  );
}
