import MarketplaceIntegrationScreen from "../screens/commercial/MarketplaceIntegrationScreen.js";
import VendorMetricsScreen from "../screens/commercial/VendorMetricsScreen.js";
import VendorAnalyticsScreen from "../screens/commercial/VendorAnalyticsScreen.js";
import AppIntroScreen from "../screens/AppIntroScreen.js";
import React, { useEffect, useCallback } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext.js";
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

import FeedScreen from "../screens/FeedScreen.js";
import PrivacyPolicyScreen from "../screens/PrivacyPolicyScreen.js";
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
  const { isPro, token, user } = useAuth();
  const [showIntro, setShowIntro] = React.useState(isPro ? false : null);
  const isAuthenticated = Boolean(token && user);

  useEffect(() => {
    let mounted = true;

    const resolveIntroState = async () => {
      try {
        const [introValue, legacyOnboarding] = await Promise.all([
          AsyncStorage.getItem(APP_INTRO_SEEN_KEY),
          AsyncStorage.getItem(LEGACY_ONBOARDING_KEY)
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
      await AsyncStorage.setItem(APP_INTRO_SEEN_KEY, "true");
    } catch {
      // best-effort; failure just means intro may show again next launch
    }
    setShowIntro(false);
  }, []);

  if (showIntro === null) {
    return null;
  }

  const navigatorKey = `${isAuthenticated ? "auth" : "guest"}-${showIntro ? "intro" : "main"}`;
  const initialRouteName =
    !isAuthenticated && !isPro && showIntro
      ? "AppIntro"
      : isAuthenticated
        ? "MainTabs" // Single-user app: default to MainTabs
        : "Login";

  return (
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
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
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
        name="VendorSignup"
        component={VendorSignup}
        options={{ title: "Become a Vendor" }}
      />
      <Stack.Screen
        name="CreateVendorGuide"
        component={CreateVendorGuide}
        options={{ title: "Create Guide" }}
      />
      <Stack.Screen
        name="VendorGuides"
        component={VendorGuidesScreen}
        options={{ title: "Guides" }}
      />
      <Stack.Screen
        name="MarketplaceIntegration"
        component={MarketplaceIntegrationScreen}
        options={{ title: "Marketplace & Social" }}
      />
      <Stack.Screen
        name="VendorMetrics"
        component={VendorMetricsScreen}
        options={{ title: "Vendor Metrics" }}
      />
      <Stack.Screen
        name="VendorAnalytics"
        component={VendorAnalyticsScreen}
        options={{ title: "Vendor Analytics" }}
      />
      <Stack.Screen name="Earnings" component={EarningsScreen} />
      <Stack.Screen name="AdminCourses" component={AdminCoursesScreen} />
      <Stack.Screen name="CreatorDashboard" component={CreatorDashboardScreen} />
      <Stack.Screen name="CreatorDashboardV2" component={CreatorDashboardV2} />
      <Stack.Screen name="CreatorPayouts" component={CreatorPayoutScreen} />
      <Stack.Screen name="CreatorSignatureUpload" component={CreatorSignatureUpload} />
      {/* ...add the rest of your screens here... */}
    </Stack.Navigator>
  );
}
