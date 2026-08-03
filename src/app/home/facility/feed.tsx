import FeedCampaignsRoute from "@/app/feed";
import { ScreenBoundary } from "@/components/ScreenBoundary";

export default function FacilityFeedCampaignsRoute() {
  return (
    <ScreenBoundary
      title="Facility outreach feed"
      showBack
      backFallbackHref="/home/facility/more"
    >
      <FeedCampaignsRoute />
    </ScreenBoundary>
  );
}
