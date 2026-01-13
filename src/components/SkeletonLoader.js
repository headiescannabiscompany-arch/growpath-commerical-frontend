import React from "react";
import { View, StyleSheet } from "react-native";
import { Colors, Spacing } from "../theme/theme.js";

/**
 * SkeletonLoader Component
 * Displays animated placeholder while content is loading
 */

const SkeletonLoader = ({ width = "100%", height = 50, borderRadius = 8, style }) => {
  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius
        },
        style
      ]}
    />
  );
};

// Skeleton for marketplace cards
export const ContentCardSkeleton = () => (
  <View style={styles.cardSkeleton}>
    <SkeletonLoader height={100} style={styles.thumbnail} />
    <SkeletonLoader height={16} width="80%" style={styles.title} />
    <SkeletonLoader height={14} width="60%" style={styles.subtitle} />
    <View style={styles.row}>
      <SkeletonLoader height={14} width="40%" />
      <SkeletonLoader height={14} width="30%" />
    </View>
  </View>
);

// Skeleton for upload cards
export const UploadCardSkeleton = () => (
  <View style={styles.uploadSkeleton}>
    <View style={styles.uploadHeader}>
      <SkeletonLoader height={40} width={40} borderRadius={4} />
      <View style={styles.uploadInfo}>
        <SkeletonLoader height={16} width="70%" style={styles.mb8} />
        <SkeletonLoader height={12} width="50%" />
      </View>
    </View>
    <View style={[styles.row, styles.mt16]}>
      <SkeletonLoader height={14} width="25%" />
      <SkeletonLoader height={14} width="25%" />
      <SkeletonLoader height={14} width="25%" />
    </View>
  </View>
);

// Skeleton for guild cards
export const GuildCardSkeleton = () => (
  <View style={styles.guildSkeleton}>
    <View style={styles.guildHeader}>
      <SkeletonLoader height={40} width={40} borderRadius={20} />
      <View style={styles.guildInfo}>
        <SkeletonLoader height={16} width="70%" style={styles.mb8} />
        <SkeletonLoader height={12} width="50%" />
      </View>
    </View>
    <View style={[styles.row, styles.mt12]}>
      <SkeletonLoader height={12} width="35%" />
      <SkeletonLoader height={12} width="35%" />
    </View>
  </View>
);

// Skeleton for campaign cards
export const CampaignCardSkeleton = () => (
  <View style={styles.campaignSkeleton}>
    <View style={styles.campaignHeader}>
      <SkeletonLoader height={16} width="60%" style={styles.mb8} />
      <SkeletonLoader height={14} width="40%" />
    </View>
    <View style={[styles.row, styles.mt12]}>
      <SkeletonLoader height={12} width="30%" />
      <SkeletonLoader height={12} width="30%" />
    </View>
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: Spacing.sm
  },
  cardSkeleton: {
    width: "48%",
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 8
  },
  thumbnail: {
    marginBottom: Spacing.sm
  },
  title: {
    marginBottom: Spacing.xs
  },
  subtitle: {
    marginBottom: Spacing.sm
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  uploadSkeleton: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 8
  },
  uploadHeader: {
    flexDirection: "row",
    alignItems: "center"
  },
  uploadInfo: {
    flex: 1,
    marginLeft: Spacing.md
  },
  guildSkeleton: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 8
  },
  guildHeader: {
    flexDirection: "row",
    alignItems: "center"
  },
  guildInfo: {
    flex: 1,
    marginLeft: Spacing.md
  },
  campaignSkeleton: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: 8
  },
  campaignHeader: {
    marginBottom: Spacing.sm
  },
  mb8: {
    marginBottom: 8
  },
  mt12: {
    marginTop: Spacing.md
  },
  mt16: {
    marginTop: 16
  }
});

export default SkeletonLoader;
