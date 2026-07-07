import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import CommercialTabs from "./CommercialTabs";
import GuildCodeScreen from "../screens/GuildCodeScreen";
import SubscriptionScreen from "../screens/SubscriptionScreen";
import SubscriptionStatusScreen from "../screens/SubscriptionStatusScreen";
import PaywallScreen from "../screens/PaywallScreen";
import PricingMatrixScreen from "../screens/PricingMatrixScreen";
import ForumNewPostScreen from "../screens/ForumNewPostScreen";
import { ForumPostDetailScreen } from "../screens/ForumPostDetailScreen";
import CreateCourseScreen from "../screens/commercial/CreateCourseScreen";
import CourseDetailScreen from "../screens/CourseDetailScreen";
import LessonScreen from "../screens/LessonScreen";
import AddLessonScreen from "../screens/AddLessonScreen";
import EditLessonScreen from "../screens/EditLessonScreen";
import LinksScreen from "../screens/LinksScreen";
import CampaignsScreen from "../screens/CampaignsScreen";
import CommercialOrdersScreen from "../screens/CommercialOrdersScreen";
import StorefrontScreen from "../screens/StorefrontScreen";
import EarningsScreen from "../screens/EarningsScreen";
import CreatorPayoutScreen from "../screens/CreatorPayoutScreen";
import AdminPayoutsScreen from "../screens/AdminPayoutsScreen";
import CommercialToolsScreen from "../screens/commercial/CommercialToolsScreen";
import CommercialReportsScreen from "../screens/commercial/CommercialReportsScreen";
import SocialToolsScreen from "../screens/SocialToolsScreen";
import MarketplaceScreen from "../screens/MarketplaceScreen";
import MarketplaceDetailScreen from "../screens/MarketplaceDetailScreen";
import MarketplaceIntegrationScreen from "../screens/commercial/MarketplaceIntegrationScreen";
import CommercialFeedRoute from "../app/feed";
import CommercialCommunityRoute from "../app/home/commercial/community";
import CommercialCoursesRoute from "../app/home/commercial/courses";
import CommercialCourseDetailRoute from "../app/home/commercial/courses/[courseId]";
import CommercialLivesRoute from "../app/home/commercial/lives";
import CommercialGrowsRoute from "../app/home/commercial/grows";
import CommercialGrowDetailRoute from "../app/home/commercial/grows/[growId]";
import CommercialProductsRoute from "../app/home/commercial/products";
import CommercialProductDetailRoute from "../app/home/commercial/products/[productId]";
import NewCommercialProductRoute from "../app/home/commercial/products/new";
import CommercialProductLinesRoute from "../app/home/commercial/product-lines";
import CommercialProductLineDetailRoute from "../app/home/commercial/product-lines/[lineId]";
import CommercialBatchPlannerRoute from "../app/home/commercial/batch-planner";
import CommercialBatchDetailRoute from "../app/home/commercial/batch-planner/[batchId]";
import CommercialTrialsRoute from "../app/home/commercial/trials";
import CommercialTrialDetailRoute from "../app/home/commercial/trials/[trialId]";
import NewCommercialGrowRoute from "../app/home/commercial/grows/new";
import CommercialMarketingRoute from "../app/home/commercial/marketing";
import CommercialAnalyticsRoute from "../app/home/commercial/analytics";
import CommercialInventoryRoute from "../app/home/commercial/inventory";
import CommercialInventoryCreateRoute from "../app/home/commercial/inventory-create";
import CommercialInventoryItemDetailRoute from "../app/home/commercial/inventory-item/[id]";
import CommercialProfileRoute from "../app/home/commercial/profile";

const Stack = createNativeStackNavigator();

export default function CommercialStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="CommercialTabs"
        component={CommercialTabs}
        options={{ title: "Commercial" }}
      />
      <Stack.Screen name="ForumNewPost" component={ForumNewPostScreen} />
      <Stack.Screen name="ForumPostDetail" component={ForumPostDetailScreen} />
      <Stack.Screen name="CreateCourse" component={CreateCourseScreen} />
      <Stack.Screen name="CourseDetail" component={CourseDetailScreen} />
      <Stack.Screen name="Course" component={CourseDetailScreen} />
      <Stack.Screen name="Courses" component={CommercialCoursesRoute} />
      <Stack.Screen
        name="CommercialCourseDetail"
        component={CommercialCourseDetailRoute}
      />
      <Stack.Screen name="CommercialLives" component={CommercialLivesRoute} />
      <Stack.Screen name="Feed" component={CommercialFeedRoute} />
      <Stack.Screen name="Community" component={CommercialCommunityRoute} />
      <Stack.Screen name="CommercialGrows" component={CommercialGrowsRoute} />
      <Stack.Screen name="NewCommercialGrow" component={NewCommercialGrowRoute} />
      <Stack.Screen
        name="CommercialGrowDetail"
        component={CommercialGrowDetailRoute}
      />
      <Stack.Screen name="CommercialProducts" component={CommercialProductsRoute} />
      <Stack.Screen
        name="NewCommercialProduct"
        component={NewCommercialProductRoute}
      />
      <Stack.Screen
        name="CommercialProductDetail"
        component={CommercialProductDetailRoute}
      />
      <Stack.Screen
        name="CommercialProductLines"
        component={CommercialProductLinesRoute}
      />
      <Stack.Screen
        name="CommercialProductLineDetail"
        component={CommercialProductLineDetailRoute}
      />
      <Stack.Screen name="Storefront" component={StorefrontScreen} />
      <Stack.Screen
        name="CommercialBatchPlanner"
        component={CommercialBatchPlannerRoute}
      />
      <Stack.Screen name="CommercialBatchDetail" component={CommercialBatchDetailRoute} />
      <Stack.Screen name="CommercialProductTrials" component={CommercialTrialsRoute} />
      <Stack.Screen
        name="CommercialProductTrialDetail"
        component={CommercialTrialDetailRoute}
      />
      <Stack.Screen name="CommercialAnalytics" component={CommercialAnalyticsRoute} />
      <Stack.Screen name="Lesson" component={LessonScreen} />
      <Stack.Screen name="AddLesson" component={AddLessonScreen} />
      <Stack.Screen name="EditLesson" component={EditLessonScreen} />
      <Stack.Screen name="Links" component={LinksScreen} />
      <Stack.Screen name="MarketingPlanner" component={CommercialMarketingRoute} />
      <Stack.Screen name="Campaigns" component={CampaignsScreen} />
      <Stack.Screen name="CommercialOrders" component={CommercialOrdersScreen} />
      <Stack.Screen name="CommercialInventory" component={CommercialInventoryRoute} />
      <Stack.Screen
        name="CommercialInventoryCreate"
        component={CommercialInventoryCreateRoute}
      />
      <Stack.Screen
        name="CommercialInventoryItemDetail"
        component={CommercialInventoryItemDetailRoute}
      />
      <Stack.Screen name="Earnings" component={EarningsScreen} />
      <Stack.Screen name="CreatorPayouts" component={CreatorPayoutScreen} />
      <Stack.Screen name="AdminPayouts" component={AdminPayoutsScreen} />
      <Stack.Screen name="CommercialTools" component={CommercialToolsScreen} />
      <Stack.Screen name="CommercialReports" component={CommercialReportsScreen} />
      <Stack.Screen name="CommercialProfile" component={CommercialProfileRoute} />
      <Stack.Screen name="SocialTools" component={SocialToolsScreen} />
      <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
      <Stack.Screen name="MarketplaceScreen" component={MarketplaceScreen} />
      <Stack.Screen name="MarketplaceDetail" component={MarketplaceDetailScreen} />
      <Stack.Screen
        name="MarketplaceIntegration"
        component={MarketplaceIntegrationScreen}
      />
      <Stack.Screen name="Advertising" component={CampaignsScreen} />
      <Stack.Screen name="GuildCode" component={GuildCodeScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="SubscriptionStatus" component={SubscriptionStatusScreen} />
      <Stack.Screen name="Paywall" component={PaywallScreen} />
      <Stack.Screen name="PricingMatrix" component={PricingMatrixScreen} />
    </Stack.Navigator>
  );
}
