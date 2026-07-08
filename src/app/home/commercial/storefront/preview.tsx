import StorefrontOwnerScreen from "@/screens/commercial/StorefrontOwnerScreen";

export default function CommercialStorefrontPreviewRoute() {
  return (
    <StorefrontOwnerScreen
      routeKey="storefront-preview"
      title="Storefront Preview"
      subtitle="Review the public brand/storefront experience, product cards, courses, lives, campaigns, and user-facing links before launch."
      showBack
      backFallbackHref="/home/commercial/storefront"
    />
  );
}
