import MarketplaceIntegrationScreen from "../screens/commercial/MarketplaceIntegrationScreen";
import VendorMetricsScreen from "../screens/commercial/VendorMetricsScreen";
import VendorAnalyticsScreen from "../screens/commercial/VendorAnalyticsScreen";
import AppIntroScreen from "../screens/AppIntroScreen";
import React, { useEffect, useCallback } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import LoginScreen from "../screens/LoginScreen";
import MainTabs from "./MainTabs";
import FacilityStack from "./FacilityStack";
import GrowJournalScreen from "../screens/GrowJournalScreen";
import SubscribeScreen from "../screens/SubscribeScreen";
import CourseDetailScreen from "../screens/CourseDetailScreen";
import CourseScreen from "../screens/CourseScreen";
import CreateCourseScreen from "../screens/CreateCourseScreen";
import ManageCourseScreen from "../screens/ManageCourseScreen";
import AddLessonScreen from "../screens/AddLessonScreen";
import EditLessonScreen from "../screens/EditLessonScreen";
import LessonScreen from "../screens/LessonScreen";
import VendorSignup from "../screens/VendorSignup";
import CreateVendorGuide from "../screens/CreateVendorGuide";
import VendorGuidesScreen from "../screens/VendorGuidesScreen";
import CreatorDashboardScreen from "../screens/CreatorDashboardScreen";
import CreatorDashboardV2 from "../screens/CreatorDashboardV2";
import CreatorPayoutScreen from "../screens/CreatorPayoutScreen";
import CreatorSignatureUpload from "../screens/CreatorSignatureUpload";
import ProfileCertificatesScreen from "../screens/ProfileCertificatesScreen";
import CertificateViewer from "../screens/CertificateViewer";
import VerifyCertificateScreen from "../screens/VerifyCertificateScreen";
import PostDetailScreen from "../screens/PostDetailScreen";
import GrowLogTimelineScreen from "../screens/GrowLogTimelineScreen";
import GrowLogDetailScreen from "../screens/GrowLogDetailScreen";
import GrowLogEntryScreen from "../screens/GrowLogEntryScreen";
import GrowLogCalendarScreen from "../screens/GrowLogCalendarScreen";
import DiagnosisHistoryScreen from "../screens/DiagnosisHistoryScreen";
import ForumPostDetailScreen from "../screens/ForumPostDetailScreen";
import ForumNewPostScreen from "../screens/ForumNewPostScreen";
import GuildCodeScreen from "../screens/GuildCodeScreen";
import SubcategoryBrowserScreen from "../screens/SubcategoryBrowserScreen";
import CategoryBrowserScreen from "../screens/CategoryBrowserScreen";
import CategoryCoursesScreen from "../screens/CategoryCoursesScreen";
import GrowAddPlantScreen from "../screens/GrowAddPlantScreen";
import GrowEditPlantScreen from "../screens/GrowEditPlantScreen";

const Stack = createNativeStackNavigator();

import FeedScreen from "../screens/FeedScreen";
import PrivacyPolicyScreen from "../screens/PrivacyPolicyScreen";
import CreatePostScreen from "../screens/CreatePostScreen";
import CommentsScreen from "../screens/CommentsScreen";
import TemplatesMarketplaceScreen from "../screens/TemplatesMarketplaceScreen";
import TemplateDetailScreen from "../screens/TemplateDetailScreen";
import TasksTodayScreen from "../screens/TasksTodayScreen";
import CreateTaskScreen from "../screens/CreateTaskScreen";
import DiagnoseResultScreen from "../screens/DiagnoseResultScreen";
import FeedingLabelScreen from "../screens/FeedingLabelScreen";
import FeedingConfirmScreen from "../screens/FeedingConfirmScreen";
import FeedingScheduleOptions from "../screens/FeedingScheduleOptions";
import FeedingScheduleResult from "../screens/FeedingScheduleResult";
import TrainingScreen from "../screens/TrainingScreen";
import TrainingResultScreen from "../screens/TrainingResultScreen";
import EnvironmentAssistantScreen from "../screens/EnvironmentAssistantScreen";
import PaywallScreen from "../screens/PaywallScreen";
import SubscriptionStatusScreen from "../screens/SubscriptionStatusScreen";
import PlantListScreen from "../screens/PlantListScreen";
import PlantDetailScreen from "../screens/PlantDetailScreen";
import SubscriptionScreen from "../screens/SubscriptionScreen";
import TokenInfoScreen from "../screens/TokenInfoScreen";
import EarningsScreen from "../screens/EarningsScreen";
import AdminCoursesScreen from "../screens/AdminCoursesScreen";
import CreatePlantScreen from "../screens/CreatePlantScreen";
import LiveSessionScreen from "../screens/LiveSessionScreen";
import LiveSessionsListScreen from "../screens/LiveSessionsListScreen";
import AdminReportsScreen from "../screens/AdminReportsScreen";
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
        ? "FacilityStack" // Always default to FacilityStack for authenticated users
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
      <Stack.Screen
        name="FacilityStack"
        component={FacilityStack}
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
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ title: "Privacy Policy" }}
      />
      <Stack.Screen
        name="AdminReports"
        component={AdminReportsScreen}
        options={{ title: "Admin: Reports" }}
      />
      <Stack.Screen name="CreateCourse" component={CreateCourseScreen} />
      <Stack.Screen
        name="ManageCourse"
        component={ManageCourseScreen}
        options={{ title: "Manage Course" }}
      />
      <Stack.Screen
        name="AddLesson"
        component={AddLessonScreen}
        options={{ title: "Add Lesson" }}
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
      <Stack.Screen name="ProfileCertificates" component={ProfileCertificatesScreen} />
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
      <Stack.Screen name="CategoryBrowser" component={CategoryBrowserScreen} />
      <Stack.Screen name="CategoryCourses" component={CategoryCoursesScreen} />
      <Stack.Screen name="SubcategoryBrowser" component={SubcategoryBrowserScreen} />
      <Stack.Screen name="Feed" component={FeedScreen} />
      <Stack.Screen name="CreatePost" component={CreatePostScreen} />
      <Stack.Screen name="Comments" component={CommentsScreen} />
      <Stack.Screen name="TemplatesMarketplace" component={TemplatesMarketplaceScreen} />
      <Stack.Screen name="TemplateDetail" component={TemplateDetailScreen} />
      <Stack.Screen name="TasksToday" component={TasksTodayScreen} />
      <Stack.Screen name="CreateTask" component={CreateTaskScreen} />
      <Stack.Screen name="DiagnoseResult" component={DiagnoseResultScreen} />
      <Stack.Screen name="FeedingLabel" component={FeedingLabelScreen} />
      <Stack.Screen name="FeedingConfirm" component={FeedingConfirmScreen} />
      <Stack.Screen name="FeedingScheduleOptions" component={FeedingScheduleOptions} />
      <Stack.Screen name="FeedingScheduleResult" component={FeedingScheduleResult} />
      <Stack.Screen name="Training" component={TrainingScreen} />
      <Stack.Screen name="TrainingResult" component={TrainingResultScreen} />
      <Stack.Screen name="EnvironmentAssistant" component={EnvironmentAssistantScreen} />
      <Stack.Screen name="Paywall" component={PaywallScreen} />
      <Stack.Screen name="SubscriptionStatus" component={SubscriptionStatusScreen} />
      <Stack.Screen name="PlantList" component={PlantListScreen} />
      <Stack.Screen name="PlantDetail" component={PlantDetailScreen} />
      <Stack.Screen name="CreatePlant" component={CreatePlantScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="TokenInfo" component={TokenInfoScreen} />
      <Stack.Screen name="LiveSession" component={LiveSessionScreen} />
      <Stack.Screen name="LiveSessions" component={LiveSessionsListScreen} />
    </Stack.Navigator>
  );
}
