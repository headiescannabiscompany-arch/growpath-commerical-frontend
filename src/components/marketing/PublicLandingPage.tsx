import React, { useMemo } from "react";
import { Link } from "expo-router";
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import marketing from "./publicMarketing.json";
import MarketingDetails from "./MarketingDetails";

export type PublicPageKey =
  | "home"
  | "features"
  | "pricing"
  | "personal-grower"
  | "commercial-cultivation"
  | "facility-management"
  | "nurseries-breeders"
  | "grow-stores"
  | "creators-educators"
  | "about"
  | "contact"
  | "ai-cultivation-disclaimer"
  | "vs/plntrk"
  | "vs/grow-with-jane";

type PageCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  sections: Array<{ title: string; body: string; href?: string; linkLabel?: string }>;
};

export const PUBLIC_PAGE_COPY: Record<PublicPageKey, PageCopy> = marketing.pages;

export function usesCompactPublicLayout(width: number) {
  return width < 600;
}

export default function PublicLandingPage({ page }: { page: PublicPageKey }) {
  const copy = PUBLIC_PAGE_COPY[page];
  const { width } = useWindowDimensions();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createPublicLandingStyles(palette), [palette]);
  const isCompact = usesCompactPublicLayout(width);
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={
        isCompact ? [styles.content, styles.contentCompact] : styles.content
      }
    >
      <View style={isCompact ? [styles.nav, styles.navCompact] : styles.nav}>
        <Link href="/" style={styles.brand}>
          GrowPathAI
        </Link>
        <View
          style={isCompact ? [styles.navLinks, styles.navLinksCompact] : styles.navLinks}
        >
          <Link href="/features" style={styles.link}>
            Features
          </Link>
          <Link href="/pricing" style={styles.link}>
            Pricing
          </Link>
          <Link href="/store" style={styles.link}>
            Store
          </Link>
          <Link href="/courses" style={styles.link}>
            Courses
          </Link>
          <Link href="/forum" style={styles.link}>
            Forum
          </Link>
          <Link href="/about" style={styles.link}>
            About
          </Link>
          <Link href="/login" style={styles.link}>
            Sign in
          </Link>
        </View>
      </View>
      <View style={isCompact ? [styles.hero, styles.heroCompact] : styles.hero}>
        <Text
          style={isCompact ? [styles.eyebrow, styles.eyebrowCompact] : styles.eyebrow}
        >
          {copy.eyebrow}
        </Text>
        <Text
          accessibilityRole="header"
          aria-level={1}
          style={isCompact ? [styles.title, styles.titleCompact] : styles.title}
        >
          {copy.title}
        </Text>
        <Text style={isCompact ? [styles.intro, styles.introCompact] : styles.intro}>
          {copy.intro}
        </Text>
        <View
          style={isCompact ? [styles.actions, styles.actionsCompact] : styles.actions}
        >
          <Link
            href="/register"
            style={isCompact ? [styles.primary, styles.actionCompact] : styles.primary}
          >
            Create free account
          </Link>
          <Link
            href="/features"
            style={
              isCompact ? [styles.secondary, styles.actionCompact] : styles.secondary
            }
          >
            Explore features
          </Link>
        </View>
      </View>
      {(page === "home" || page === "personal-grower" || page === "pricing") && (
        <Text style={styles.cardBody}>
          Free account. No payment card required. Your content stays yours.
        </Text>
      )}
      <View style={styles.grid}>
        {copy.sections.map((section, index) => (
          <View
            key={section.title}
            style={[
              styles.card,
              page === "home" && index === 0 && styles.primaryPath,
              page === "pricing" && index === 1 && styles.recommendedCard
            ]}
          >
            {page === "pricing" && index === 1 && (
              <Text style={styles.recommendation}>
                Recommended for growing beyond Free
              </Text>
            )}
            <Text accessibilityRole="header" aria-level={2} style={styles.cardTitle}>
              {section.title}
            </Text>
            <Text style={styles.cardBody}>{section.body}</Text>
            {section.href && (
              <Link href={section.href as never} style={styles.link}>
                {section.linkLabel}
              </Link>
            )}
            {page === "pricing" && index > 0 && (
              <Text style={styles.cardBody}>
                Annual billing saves 2 months compared with paying monthly for a year.
              </Text>
            )}
          </View>
        ))}
      </View>
      <MarketingDetails page={page} />
      <View style={styles.footer}>
        <Link href="/about" style={styles.link}>
          About
        </Link>
        <Link href="/contact" style={styles.link}>
          Contact
        </Link>
        <Link href="/updates" style={styles.link}>
          Updates
        </Link>
        <Link href="/nurseries-breeders" style={styles.link}>
          Nurseries &amp; breeders
        </Link>
        <Link href="/grow-stores" style={styles.link}>
          Grow stores
        </Link>
        <Link href="/vs/plntrk" style={styles.link}>
          Compare PLNTRK
        </Link>
        <Link href="/vs/grow-with-jane" style={styles.link}>
          Compare Grow with Jane
        </Link>
        <Link href="/privacy" style={styles.link}>
          Privacy
        </Link>
        <Link href="/terms" style={styles.link}>
          Terms
        </Link>
        <Link href="/ai-cultivation-disclaimer" style={styles.link}>
          AI disclaimer
        </Link>
      </View>
    </ScrollView>
  );
}

export function createPublicLandingStyles(palette: ThemePalette) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: palette.page },
    content: { width: "100%", maxWidth: 1120, alignSelf: "center", padding: 24, gap: 28 },
    contentCompact: { padding: 16, gap: 20 },
    nav: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16
    },
    navCompact: {
      flexDirection: "column",
      alignItems: "stretch",
      justifyContent: "flex-start",
      gap: 12
    },
    brand: {
      color: palette.text,
      fontSize: 22,
      fontWeight: "900",
      textDecorationLine: "none"
    },
    navLinks: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
    navLinksCompact: { width: "100%", gap: 12 },
    link: { color: palette.link, fontWeight: "700", textDecorationLine: "none" },
    hero: { backgroundColor: palette.hero, borderRadius: 24, padding: 32, gap: 14 },
    heroCompact: { borderRadius: 18, padding: 20, gap: 12 },
    eyebrow: {
      color: palette.heroMuted,
      fontWeight: "800",
      textTransform: "uppercase",
      letterSpacing: 1
    },
    eyebrowCompact: { fontSize: 13, lineHeight: 19 },
    title: {
      color: palette.heroText,
      fontSize: 42,
      lineHeight: 48,
      fontWeight: "900",
      maxWidth: 820
    },
    titleCompact: { fontSize: 32, lineHeight: 38, maxWidth: "100%" },
    intro: { color: palette.heroMuted, fontSize: 19, lineHeight: 29, maxWidth: 840 },
    introCompact: { fontSize: 17, lineHeight: 26 },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 },
    actionsCompact: { flexDirection: "column", alignItems: "stretch" },
    primary: {
      backgroundColor: palette.accent,
      color: palette.accentText,
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: 12,
      fontWeight: "800",
      textDecorationLine: "none"
    },
    actionCompact: { width: "100%", textAlign: "center" },
    secondary: {
      borderColor: palette.accent,
      borderWidth: 1,
      color: palette.link,
      paddingVertical: 11,
      paddingHorizontal: 18,
      borderRadius: 12,
      fontWeight: "800",
      textDecorationLine: "none"
    },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
    primaryPath: { flexBasis: "100%" },
    recommendedCard: { borderColor: palette.accent, borderWidth: 2 },
    recommendation: { color: palette.link, fontWeight: "800", fontSize: 14 },
    card: {
      flexGrow: 1,
      flexBasis: 280,
      backgroundColor: palette.card,
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: 18,
      padding: 22,
      gap: 9
    },
    cardTitle: { color: palette.text, fontSize: 20, fontWeight: "800" },
    cardBody: { color: palette.textMuted, fontSize: 16, lineHeight: 24 },
    footer: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 18,
      borderTopColor: palette.border,
      borderTopWidth: 1,
      paddingVertical: 22
    }
  });
}
