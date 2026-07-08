export function asArray(value: any) {
  return Array.isArray(value) ? value : [];
}

export function publicLinks(storefront: any) {
  const links: Array<{ label: string; url: string }> = [];
  if (storefront?.websiteUrl)
    links.push({ label: "Website", url: storefront.websiteUrl });
  if (storefront?.supportEmail) {
    links.push({ label: "Support Email", url: `mailto:${storefront.supportEmail}` });
  }
  const socialLinks = storefront?.socialLinks;
  if (Array.isArray(socialLinks)) {
    socialLinks.forEach((link: any) => {
      if (link?.url)
        links.push({ label: link?.label || link?.platform || "Social", url: link.url });
    });
  } else if (socialLinks && typeof socialLinks === "object") {
    Object.entries(socialLinks).forEach(([label, url]) => {
      if (url) links.push({ label, url: String(url) });
    });
  }
  asArray(storefront?.publicLinks || storefront?.externalLinks).forEach((link: any) => {
    if (link?.url) links.push({ label: link?.label || "Link", url: link.url });
  });
  return links;
}

export function extractPublicCommercialPayload(res: any) {
  const data = res?.data || {};
  return {
    storefront: res?.storefront || data?.storefront || null,
    products: asArray(res?.products || data?.products),
    productLines: asArray(
      res?.productLines ||
        data?.productLines ||
        res?.lines ||
        data?.lines ||
        res?.featuredProductLines ||
        data?.featuredProductLines
    ),
    courses: asArray(
      res?.courses || data?.courses || res?.featuredCourses || data?.featuredCourses
    ),
    lives: asArray(
      res?.lives ||
        data?.lives ||
        res?.liveEvents ||
        data?.liveEvents ||
        res?.featuredLives ||
        data?.featuredLives
    ),
    feedPosts: asArray(
      res?.feedPosts ||
        data?.feedPosts ||
        res?.posts ||
        data?.posts ||
        res?.updates ||
        data?.updates
    ),
    trials: asArray(
      res?.trials || data?.trials || res?.productTrials || data?.productTrials
    ),
    forumThreads: asArray(
      res?.forumThreads ||
        data?.forumThreads ||
        res?.threads ||
        data?.threads ||
        res?.supportThreads ||
        data?.supportThreads
    )
  };
}

export function publicItemId(item: any) {
  return String(
    item?.id || item?._id || item?.productId || item?.courseId || item?.threadId || ""
  );
}

export function publicItemTitle(item: any, fallback = "Item") {
  return String(item?.title || item?.name || item?.headline || item?.label || fallback);
}

export function publicItemSummary(item: any) {
  return String(
    item?.summary ||
      item?.description ||
      item?.body ||
      item?.text ||
      item?.excerpt ||
      item?.publicSummary ||
      ""
  );
}

export function publicGrowInterests(item: any) {
  return Array.isArray(item?.growInterests)
    ? item.growInterests.map((interest: any) => String(interest)).filter(Boolean)
    : [];
}
