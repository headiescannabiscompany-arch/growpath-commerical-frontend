import GrowOverviewScreen from "@/app/home/personal/(tabs)/grows/[growId]";

export { createCommercialGrowDetailStyles } from "@/features/commercial/screens/CommercialEvidenceRunDetailScreen";

export default function CommercialGrowOverviewRoute() {
  return <GrowOverviewScreen workspace="commercial" />;
}
