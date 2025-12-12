import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import LoginScreen from "../screens/LoginScreen";
import MainTabs from "./MainTabs";
import GrowJournalScreen from "../screens/GrowJournalScreen";
import SubscribeScreen from "../screens/SubscribeScreen";
import CourseDetailScreen from "../screens/CourseDetailScreen";
import CreateCourseScreen from "../screens/CreateCourseScreen";
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
import SubcategoryBrowserScreen from "../screens/SubcategoryBrowserScreen";
import CategoryBrowserScreen from "../screens/CategoryBrowserScreen";
import CategoryCoursesScreen from "../screens/CategoryCoursesScreen";

const Stack = createNativeStackNavigator();

import FeedScreen from '../screens/FeedScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import CommentsScreen from '../screens/CommentsScreen';
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

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="GrowJournal" component={GrowJournalScreen} />
      <Stack.Screen name="Subscribe" component={SubscribeScreen} />
      <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
      <Stack.Screen name="CreateCourse" component={CreateCourseScreen} />
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
    </Stack.Navigator>
  );
}
