import PersonalGrowsRoute from "@/app/home/personal/(tabs)/grows";

export { createCommercialGrowsStyles } from "@/features/commercial/screens/CommercialEvidenceRunsScreen";

export default function CommercialGrowsRoute() {
  return <PersonalGrowsRoute workspace="commercial" />;
}
