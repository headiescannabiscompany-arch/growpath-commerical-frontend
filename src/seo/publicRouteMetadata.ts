import registry from "./publicRouteMetadata.json";
import marketing from "@/components/marketing/publicMarketing.json";

export type PublicRouteMetadata = {
  title: string;
  description: string;
  index: boolean;
  image?: string;
  imageAlt?: string;
};

type RegistryRoute = Omit<PublicRouteMetadata, "index"> & { index?: boolean };

const defaultMetadata = registry.default as PublicRouteMetadata;
const routeMetadata = registry.routes as Record<string, RegistryRoute>;
function publicSiteUrl() {
  return String(process.env.EXPO_PUBLIC_SITE_URL || "https://growpathai.com").replace(
    /\/+$/,
    ""
  );
}

function forceNoIndex() {
  return process.env.EXPO_PUBLIC_WEB_EXPORT_TARGET === "staging";
}

export function normalizePublicRoute(pathname: string) {
  return pathname.split(/[?#]/, 1)[0].replace(/^\/+|\/+$/g, "");
}

export function metadataForPathname(pathname: string): PublicRouteMetadata {
  const route = normalizePublicRoute(pathname);
  const match = routeMetadata[route];
  if (!match) {
    return {
      ...defaultMetadata,
      title: "GrowPathAI App",
      index: false
    };
  }
  return {
    ...defaultMetadata,
    ...match
  };
}

function upsertMeta(
  selector: string,
  attributes: Record<string, string>,
  content: string
) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    for (const [name, value] of Object.entries(attributes)) {
      element.setAttribute(name, value);
    }
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

export function applyPublicRouteMetadata(pathname: string) {
  if (typeof document === "undefined") return;

  const metadata = metadataForPathname(pathname);
  const route = normalizePublicRoute(pathname);
  const siteUrl = publicSiteUrl();
  const canonical = route ? `${siteUrl}/${route}` : siteUrl;

  document.title = metadata.title;
  upsertMeta('meta[name="description"]', { name: "description" }, metadata.description);
  upsertMeta(
    'meta[name="robots"]',
    { name: "robots" },
    metadata.index && !forceNoIndex() ? "index,follow" : "noindex,nofollow"
  );
  upsertMeta('meta[property="og:title"]', { property: "og:title" }, metadata.title);
  upsertMeta(
    'meta[property="og:description"]',
    { property: "og:description" },
    metadata.description
  );
  upsertMeta('meta[property="og:url"]', { property: "og:url" }, canonical);
  upsertMeta('meta[property="og:site_name"]', { property: "og:site_name" }, "GrowPathAI");
  const imageUrl = `${siteUrl}${metadata.image || "/favicon.ico"}`;
  upsertMeta('meta[property="og:image"]', { property: "og:image" }, imageUrl);
  upsertMeta(
    'meta[property="og:image:alt"]',
    { property: "og:image:alt" },
    metadata.imageAlt || "GrowPathAI"
  );
  upsertMeta('meta[name="twitter:image"]', { name: "twitter:image" }, imageUrl);
  upsertMeta(
    'meta[name="twitter:image:alt"]',
    { name: "twitter:image:alt" },
    metadata.imageAlt || "GrowPathAI"
  );
  upsertMeta(
    'meta[name="twitter:card"]',
    { name: "twitter:card" },
    metadata.image ? "summary_large_image" : "summary"
  );
  upsertMeta('meta[name="twitter:title"]', { name: "twitter:title" }, metadata.title);
  upsertMeta(
    'meta[name="twitter:description"]',
    { name: "twitter:description" },
    metadata.description
  );

  let canonicalLink = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]'
  );
  if (!canonicalLink) {
    canonicalLink = document.createElement("link");
    canonicalLink.setAttribute("rel", "canonical");
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute("href", canonical);
  // Replace the previous route's schema after SPA navigation as well as on reload.
  for (const old of Array.from(
    document.head.querySelectorAll('script[type="application/ld+json"]')
  ))
    old.remove();
  if (metadata.index) {
    const graph: Record<string, unknown>[] = [
      {
        "@type": "WebPage",
        url: canonical,
        name: metadata.title,
        description: metadata.description
      }
    ];
    if (!route || route === "pricing")
      graph.push({
        "@type": "SoftwareApplication",
        name: "GrowPathAI",
        operatingSystem: "Web",
        applicationCategory: "LifestyleApplication",
        offers: marketing.plans.map((p) => ({
          "@type": "Offer",
          name: p.name + " monthly plan",
          price: String(p.monthly),
          priceCurrency: "USD",
          url: siteUrl + "/pricing",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: String(p.monthly),
            priceCurrency: "USD",
            unitText: "MONTH"
          }
        }))
      });
    if (!route)
      graph.push({
        "@type": "Organization",
        name: "GrowPathAI",
        url: siteUrl,
        email: "support@growpathai.com"
      });
    if (route === "pricing")
      graph.push({
        "@type": "FAQPage",
        mainEntity: marketing.pricingFaq.map((f) => ({
          "@type": "Question",
          name: f.title,
          acceptedAnswer: { "@type": "Answer", text: f.body }
        }))
      });
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": graph
    });
    document.head.appendChild(script);
  }
}
