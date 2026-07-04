import React from "react";
import { StyleSheet, View } from "react-native";
import EducationPostCard from "@/components/feed/EducationPostCard";
import AdCard from "@/components/feed/AdCard";

type FeedRailProps = {
  slots: number;
  mode?: string | null;
  plan?: string | null;
  railMode?: "standard" | "education-only" | "promo-only";
};

const EDUCATION_ITEMS = [
  {
    title: "Dial in VPD in 10 minutes",
    body: "Learn the 3 numbers that prevent mold and boost yield.",
    cta: "Open lesson"
  },
  {
    title: "Deficiency triage checklist",
    body: "Quickly identify the top 5 nutrient issues by symptom.",
    cta: "Open guide"
  },
  {
    title: "Drying room airflow basics",
    body: "Prevent hay smell with a simple airflow map.",
    cta: "Read tips"
  }
];

const AD_ITEMS = [
  {
    title: "Sponsor: HydroTech Sensors",
    body: "Save 20% on VPD monitoring bundles this week.",
    cta: "View offer",
    href: "/brands/example-brand",
    storefrontSlug: "example-brand"
  },
  {
    title: "Partner: GreenBench Genetics",
    body: "New high-THC cultivar drops + grower discounts.",
    cta: "Explore drops",
    href: "/store/example-brand",
    storefrontSlug: "example-brand"
  },
  {
    title: "Promotion: SoilPro Mix",
    body: "Starter packs for small grows - free shipping.",
    cta: "Shop now",
    href: "/store/example-brand",
    storefrontSlug: "example-brand"
  }
];

const FACILITY_AD_ITEMS = [
  {
    title: "Facility Sponsor: EnviroTrack",
    body: "Automate compliance logs with audit-ready exports.",
    cta: "See demo",
    href: "/brands/example-brand",
    storefrontSlug: "example-brand"
  },
  {
    title: "Partner: CropGuard",
    body: "IPM program kits for multi-room operations.",
    cta: "View program",
    href: "/store/example-brand",
    storefrontSlug: "example-brand"
  }
];

export default function FeedRail({ slots, mode, railMode = "standard" }: FeedRailProps) {
  if (!slots || slots <= 0) return null;

  const ads = mode === "facility" || mode === "commercial" ? FACILITY_AD_ITEMS : AD_ITEMS;

  return (
    <View style={styles.container}>
      {Array.from({ length: slots }).map((_, index) => {
        const isEducation = index % 2 === 0;
        const educationItem = EDUCATION_ITEMS[index % EDUCATION_ITEMS.length];
        const adItem = ads[index % ads.length];

        if (railMode === "education-only") {
          return (
            <EducationPostCard
              key={`education-${index}`}
              title={educationItem.title}
              body={educationItem.body}
              cta={educationItem.cta}
            />
          );
        }

        if (railMode === "promo-only") {
          return (
            <AdCard
              key={`ad-${index}`}
              title={adItem.title}
              body={adItem.body}
              cta={adItem.cta}
              href={adItem.href}
              storefrontSlug={adItem.storefrontSlug}
            />
          );
        }

        if (isEducation) {
          return (
            <EducationPostCard
              key={`education-${index}`}
              title={educationItem.title}
              body={educationItem.body}
              cta={educationItem.cta}
            />
          );
        }
        return (
          <AdCard
            key={`ad-${index}`}
            title={adItem.title}
            body={adItem.body}
            cta={adItem.cta}
            href={adItem.href}
            storefrontSlug={adItem.storefrontSlug}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12
  }
});
