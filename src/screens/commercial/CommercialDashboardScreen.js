import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ScreenContainer from "../../components/ScreenContainer.js";
import Card from "../../components/Card.js";
import EmptyState from "../../components/EmptyState.js";
import PrimaryButton from "../../components/PrimaryButton.js";
import { Colors, Typography, Spacing } from "../../theme/theme.js";
import { useAuth } from "../../context/AuthContext.js";

const ChecklistItem = ({ label, done }) => {
  return (
    <View style={styles.checklistRow}>
      <MaterialCommunityIcons
        name={done ? "check-circle" : "checkbox-blank-circle-outline"}
        size={20}
        color={done ? Colors.primary : Colors.textSecondary}
      />
      <Text style={[styles.checklistLabel, done && styles.checklistDone]}>{label}</Text>
    </View>
  );
};

const StatPill = ({ label, value, muted }) => (
  <View style={[styles.statPill, muted && styles.statPillMuted]}>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={[styles.statLabel, muted && styles.statLabelMuted]}>{label}</Text>
  </View>
);

const ActionTile = ({ icon, title, subtitle, onPress }) => (
  <TouchableOpacity style={styles.actionTile} onPress={onPress}>
    <View style={styles.actionIconWrap}>
      <MaterialCommunityIcons name={icon} size={22} color={Colors.primary} />
    </View>
    <View style={styles.actionTextWrap}>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSubtitle}>{subtitle}</Text>
    </View>
    <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.textSecondary} />
  </TouchableOpacity>
);

export default function CommercialDashboardScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const businessName =
    user?.business?.name ||
    user?.businessName ||
    user?.companyName ||
    "Commercial workspace";
  const businessType =
    user?.business?.type || user?.businessType || user?.companyType || "Business";
  const hasLogo = Boolean(user?.business?.logoUrl || user?.profileImage || user?.avatar);
  const hasContact = Boolean(
    user?.business?.contactEmail || user?.email || user?.business?.phone
  );
  const hasDescription = Boolean(user?.business?.description || user?.bio);
  const educationPosts =
    user?.metrics?.educationPosts || user?.stats?.educationPosts || user?.postCount || 0;
  const coursesCreated =
    user?.metrics?.coursesCreated || user?.stats?.coursesCreated || 0;
  const toolsRuns = user?.metrics?.toolsRuns || user?.stats?.toolsRuns || 0;

  const checklist = useMemo(
    () => [
      {
        id: "profile",
        label: "Add business name, type, and logo",
        done: Boolean(businessName && businessType && hasLogo)
      },
      {
        id: "story",
        label: "Add a description and contact so buyers can reach you",
        done: Boolean(hasDescription && hasContact)
      },
      {
        id: "post",
        label: "Publish one education post",
        done: educationPosts > 0
      },
      {
        id: "course",
        label: "Submit a course for approval",
        done: coursesCreated > 0
      },
      {
        id: "tools",
        label: "Run any commercial tool once",
        done: toolsRuns > 0
      }
    ],
    [
      businessName,
      businessType,
      hasLogo,
      hasDescription,
      hasContact,
      educationPosts,
      coursesCreated,
      toolsRuns
    ]
  );

  const completionCount = checklist.filter((item) => item.done).length;
  const completionPct = Math.round((completionCount / checklist.length) * 100) || 0;

  const handleCreateEducationPost = () => {
    navigation.navigate("ForumNewPost", {
      postType: "education",
      workspace: "commercial"
    });
  };

  const handlePublishCourse = () => {
    navigation.navigate("CreateCourse", {
      workspace: "commercial"
    });
  };

  const handleOpenTools = () => {
    navigation.navigate("CommercialTools");
  };
  const handleOpenReports = () => {
    navigation.navigate("CommercialReports");
  };

  const hasProfileBasics = Boolean(businessName && businessType);
  const hasCourses = coursesCreated > 0;
  const hasEducationPosts = educationPosts > 0;

  return (
    <ScreenContainer scroll contentContainerStyle={styles.scrollContent}>
      <Card style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View>
            <Text style={styles.heroLabel}>Commercial Workspace</Text>
            <Text style={styles.heroTitle}>{businessName}</Text>
            <Text style={styles.heroSubtitle}>{businessType}</Text>
          </View>
          <StatPill label="Completed" value={`${completionCount}/5`} muted={false} />
        </View>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${completionPct}%` }]} />
        </View>
        <Text style={styles.progressHint}>
          Stay honest: finish the checklist and focus on education posts, clear offers,
          and tools that buyers actually need.
        </Text>
      </Card>

      <Card style={styles.ctaCard}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.ctaRow}>
          <PrimaryButton
            title="Create education post"
            onPress={handleCreateEducationPost}
            style={styles.ctaButton}
            textStyle={styles.ctaButtonText}
            accessibilityRole="button"
            disabled={false}
          >
            Create education post
          </PrimaryButton>
          <PrimaryButton
            title="Publish course"
            onPress={handlePublishCourse}
            style={styles.ctaButton}
            textStyle={styles.ctaButtonText}
            accessibilityRole="button"
            disabled={false}
          >
            Publish course
          </PrimaryButton>
          <PrimaryButton
            title="Open tools"
            onPress={handleOpenTools}
            style={styles.ctaButton}
            textStyle={styles.ctaButtonText}
            accessibilityRole="button"
            disabled={false}
          >
            Open tools
          </PrimaryButton>
          <PrimaryButton
            title="Reports"
            onPress={handleOpenReports}
            style={styles.ctaButton}
            textStyle={styles.ctaButtonText}
            accessibilityRole="button"
            disabled={false}
          >
            Reports
          </PrimaryButton>
        </View>
      </Card>

      <Card style={styles.checklistCard}>
        <Text style={styles.sectionTitle}>Profile completion</Text>
        <View style={styles.checklistWrap}>
          {checklist.map((item) => (
            <ChecklistItem key={item.id} label={item.label} done={item.done} />
          ))}
        </View>
      </Card>

      <Card style={styles.statusCard}>
        <Text style={styles.sectionTitle}>Content and offers</Text>
        <View style={styles.statusRow}>
          <StatPill
            label="Education posts"
            value={educationPosts || 0}
            muted={!hasEducationPosts}
          />
          <StatPill label="Courses" value={coursesCreated || 0} muted={!hasCourses} />
          <StatPill label="Tools runs" value={toolsRuns || 0} muted={!toolsRuns} />
        </View>
        {!hasEducationPosts && (
          <EmptyState
            icon="book-outline"
            title="No education posts yet"
            subtitle="Share a how-to or lesson before pitching offers."
            actionLabel="Create education post"
            onAction={handleCreateEducationPost}
          />
        )}
        {!hasCourses && (
          <EmptyState
            icon="school-outline"
            title="No courses submitted"
            subtitle="Submit a course for approval with price and outline."
            actionLabel="Publish a course"
            onAction={handlePublishCourse}
          />
        )}
      </Card>

      <Card style={styles.profileCard}>
        <Text style={styles.sectionTitle}>Business profile</Text>
        {hasProfileBasics ? (
          <View style={styles.profileDetails}>
            <ActionTile
              icon="account-tie"
              title="Business basics"
              subtitle={`${businessName} · ${businessType}`}
              onPress={() => navigation.navigate("CommercialProfile")}
            />
            <ActionTile
              icon="card-text-outline"
              title="Story & contact"
              subtitle={
                hasDescription && hasContact
                  ? "Ready for buyers"
                  : "Add description and contact"
              }
              onPress={() => navigation.navigate("CommercialProfile")}
            />
          </View>
        ) : (
          <EmptyState
            icon="briefcase-outline"
            title="Profile is missing"
            subtitle="Add your business name, type, logo, and contact details."
            actionLabel="Complete profile"
            onAction={() => navigation.navigate("CommercialProfile")}
          />
        )}
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: Spacing.xl
  },
  heroCard: {
    gap: Spacing.md
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  heroLabel: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    fontWeight: 600
  },
  heroTitle: {
    fontSize: Typography.size.h2,
    fontWeight: 700,
    color: Colors.text,
    marginTop: Spacing.xs
  },
  heroSubtitle: {
    fontSize: Typography.size.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs
  },
  progressBarTrack: {
    height: 10,
    borderRadius: 6,
    backgroundColor: Colors.accentSoft,
    overflow: "hidden"
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 6
  },
  progressHint: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary
  },
  ctaCard: {
    marginTop: Spacing.lg,
    gap: Spacing.sm
  },
  sectionTitle: {
    fontSize: Typography.size.subtitle,
    fontWeight: 600,
    color: Colors.text
  },
  ctaRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap"
  },
  ctaButton: {
    flexGrow: 1,
    minWidth: 120,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 14
  },
  ctaButtonText: {
    fontSize: Typography.size.caption,
    fontWeight: 600
  },
  checklistCard: {
    marginTop: Spacing.lg
  },
  checklistWrap: {
    marginTop: Spacing.sm,
    gap: Spacing.sm
  },
  checklistRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm
  },
  checklistLabel: {
    color: Colors.text,
    fontSize: Typography.size.body
  },
  checklistDone: {
    color: Colors.textSecondary,
    textDecorationLine: "line-through"
  },
  statusCard: {
    marginTop: Spacing.lg,
    gap: Spacing.md
  },
  statusRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap"
  },
  statPill: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.accentSoft,
    borderRadius: 12,
    minWidth: 110
  },
  statPillMuted: {
    backgroundColor: "#F4F6F8"
  },
  statValue: {
    fontSize: Typography.size.h3,
    fontWeight: 700,
    color: Colors.text
  },
  statLabel: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    marginTop: 2
  },
  statLabelMuted: {
    color: "#9BA4A8"
  },
  profileCard: {
    marginTop: Spacing.lg,
    gap: Spacing.md
  },
  profileDetails: {
    gap: Spacing.xs
  },
  actionTile: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md
  },
  actionTextWrap: {
    flex: 1
  },
  actionTitle: {
    fontSize: Typography.size.body,
    fontWeight: 600,
    color: Colors.text
  },
  actionSubtitle: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    marginTop: 2
  }
});
