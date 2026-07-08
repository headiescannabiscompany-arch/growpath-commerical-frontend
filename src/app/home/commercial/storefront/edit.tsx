import StorefrontOwnerScreen from "@/screens/commercial/StorefrontOwnerScreen";

export default function CommercialStorefrontEditRoute() {
  return (
    <StorefrontOwnerScreen
      routeKey="storefront-edit"
      title="Edit Storefront"
      subtitle="Update brand identity, public links, grow interests, media, sections, and publish readiness."
      showBack
      backFallbackHref="/home/commercial/storefront"
    />
  );
}
