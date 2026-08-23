import registry from "./publicRouteMetadata.json";

export type PublicRouteMetadata = {
  title: string;
  description: string;
  index: boolean;
};

type RegistryRoute = Omit<PublicRouteMetadata, "index"> & { index?: boolean };

const defaultMetadata = registry.default as PublicRouteMetadata;
const routeMetadata = registry.routes as Record<string, RegistryRoute>;

export function normalizePublicRoute(pathname: string) {
  return pathname.split(/[?#]/, 1)[0].replace(/^\/+|\/+$/g, "");
}

export function metadataForPathname(pathname: string): PublicRouteMetadata {
  const route = normalizePublicRoute(pathname);
  const match = routeMetadata[route];
  if (!match) {
    return {
      ...defaultMetadata,
      title: "GrowPath App",
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
  const canonical = route ? `https://growpathai.com/${route}` : "https://growpathai.com";

  document.title = metadata.title;
  upsertMeta('meta[name="description"]', { name: "description" }, metadata.description);
  upsertMeta(
    'meta[name="robots"]',
    { name: "robots" },
    metadata.index ? "index,follow" : "noindex,nofollow"
  );
  upsertMeta('meta[property="og:title"]', { property: "og:title" }, metadata.title);
  upsertMeta(
    'meta[property="og:description"]',
    { property: "og:description" },
    metadata.description
  );
  upsertMeta('meta[property="og:url"]', { property: "og:url" }, canonical);
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
}
