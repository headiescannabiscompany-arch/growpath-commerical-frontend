import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Alert
} from "react-native";

import FollowButton from "../components/FollowButton";
import { getProfile, updateNotificationPreferences } from "../api/users";
import { updateCourse } from "../api/courses";
import { useAuth } from "../context/AuthContext";
import { getEntitlements } from "../utils/entitlements";

const DEFAULT_PREFS = {
  forumNotifications: true,
  forumAggregated: true,
  forumReactions: true
};

function deriveNotificationPrefs(preferences) {
  return {
    ...DEFAULT_PREFS,
    ...(preferences || {})
  };
}

export default function ProfileScreen({ route, navigation }) {
  const { user: currentUser, isPro: currentIsPro, isEntitled: currentIsEntitled } = useAuth();
  const resolvedUserId =
    route?.params?.userId ||
    route?.params?.id ||
    currentUser?._id ||
    currentUser?.id ||
    global.user?._id ||
    global.user?.id ||
    null;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("posts");
  const [notifPrefs, setNotifPrefs] = useState(DEFAULT_PREFS);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [courseUpdatingId, setCourseUpdatingId] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function loadProfile(id) {
      try {
        setLoading(true);
        setError(null);
        const res = await getProfile(id);
        const payload = res?.data ?? res;
        if (!mounted) return;
        setProfile(payload);
        setNotifPrefs(deriveNotificationPrefs(payload?.user?.preferences));
        setLoading(false);
      } catch (err) {
        if (!mounted) return;
        console.error("Profile load failed:", err);
        setError(err?.message || "Could not load profile");
        setLoading(false);
      }
    }

    if (resolvedUserId) {
      loadProfile(resolvedUserId);
    } else {
      setProfile(null);
      setLoading(false);
      setError("No profile selected");
    }

    return () => {
      mounted = false;
    };
  }, [resolvedUserId, refreshNonce]);

  function triggerReload() {
    if (!resolvedUserId) return;
    setProfile(null);
    setError(null);
    setLoading(true);
    setRefreshNonce((n) => n + 1);
  }

  async function handleTogglePref(key, nextValue) {
    const optimistic = { ...notifPrefs, [key]: nextValue };
    setNotifPrefs(optimistic);
    setSavingPrefs(true);
    try {
      await updateNotificationPreferences({ [key]: nextValue });
    } catch (err) {
      console.error("Preference update failed:", err);
      setNotifPrefs((prev) => ({ ...prev, [key]: !nextValue }));
      Alert.alert("Update failed", "Unable to update notification preferences right now.");
    } finally {
      setSavingPrefs(false);
    }
  }

  function courseReady(course) {
    if (!course) return false;
    if (typeof course.readyToPublish === "boolean") return course.readyToPublish;
    const lessonsCount =
      typeof course.lessonsCount === "number" ? course.lessonsCount : 0;
    return lessonsCount > 0 || !!course.contentUrl;
  }

  async function handleCoursePublishToggle(course, nextValue) {
    if (!course?._id) return;
    const ready = courseReady(course);
    if (nextValue && !ready) {
      Alert.alert("Add content first", "Add lessons or a course link before publishing.");
      return;
    }
    setCourseUpdatingId(course._id);
    try {
      await updateCourse(course._id, { isPublished: nextValue });
      setProfile((prev) => {
        if (!prev?.courses) return prev;
        const updatedCourses = prev.courses.map((item) =>
          item._id === course._id ? { ...item, isPublished: nextValue } : item
        );
        return { ...prev, courses: updatedCourses };
      });
    } catch (err) {
      Alert.alert("Update failed", err?.message || "Unable to update course status.");
    } finally {
      setCourseUpdatingId(null);
    }
  }

  const viewerId = currentUser?._id || currentUser?.id || global.user?._id || global.user?.id;
  const isOwnProfile = viewerId && resolvedUserId && viewerId === resolvedUserId;

  const profileData = useMemo(() => {
    if (!profile) {
      return {
        user: {},
        posts: [],
        growlogs: []
      };
    }
    return {
      user: profile.user || {},
      posts: Array.isArray(profile.posts) ? profile.posts : [],
      growlogs: Array.isArray(profile.growlogs) ? profile.growlogs : [],
      courses: Array.isArray(profile.courses) ? profile.courses : []
    };
  }, [profile]);

  const { user, posts, growlogs, courses: profileCourses } = profileData;
  const myCourses = isOwnProfile ? profileCourses : [];
  const { isPro: profileIsPro, isEntitled: profileIsEntitled } = getEntitlements(user);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 16 }}>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
        <Text style={{ fontSize: 16, textAlign: "center", marginBottom: 12 }}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={triggerReload}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View>
        <Image
          source={{
            uri:
              user.banner ||
              "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80"
          }}
          style={styles.banner}
        />
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri:
                user.avatar ||
                "https://images.unsplash.com/photo-1521579971123-1192931a1452?auto=format&fit=crop&w=200&q=80"
            }}
            style={styles.avatar}
          />
          <Text style={styles.username}>
            {user.name || user.displayName || user.username || "GrowPath Member"}
          </Text>
          {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
          <View style={styles.entitlementPill}>
            <Text style={styles.entitlementText}>
              {profileIsPro
                ? "✨ Pro Member"
                : profileIsEntitled
                  ? "Guild Member"
                  : "Free Member"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.stat}>{user.followers?.length || 0}</Text>
          <Text>Followers</Text>
        </View>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.stat}>{user.following?.length || 0}</Text>
          <Text>Following</Text>
        </View>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.stat}>{(posts || []).length}</Text>
          <Text>Posts</Text>
        </View>
      </View>

      {!isOwnProfile && user._id ? (
        <View style={{ alignItems: "center", marginVertical: 10 }}>
          <FollowButton userId={user._id} />
        </View>
      ) : null}

      {isOwnProfile && (
        <View style={styles.courseShelf}>
          <View style={styles.courseShelfHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.courseShelfTitle}>My Courses</Text>
              <Text style={styles.courseShelfSubtitle}>
                Drafts stay private until you publish. Toggle visibility when you're ready.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.courseShelfCreate}
              onPress={() => navigation.navigate("CreateCourse")}
            >
              <Text style={styles.courseShelfCreateText}>+ New</Text>
            </TouchableOpacity>
          </View>

          {myCourses.length === 0 ? (
            <Text style={styles.courseShelfEmpty}>
              No courses yet. Tap “+ New” to start building your first lesson.
            </Text>
          ) : (
            myCourses.map((course) => {
              const ready = courseReady(course);
              const lessonsCount =
                typeof course.lessonsCount === "number" ? course.lessonsCount : 0;
              return (
                <View key={course._id} style={styles.creatorCourseCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.creatorCourseTitle} numberOfLines={1}>
                      {course.title || "Untitled course"}
                    </Text>
                    <Text style={styles.creatorCourseMeta}>
                      {lessonsCount} lesson{lessonsCount === 1 ? "" : "s"} ·{" "}
                      {course.isPublished ? "Published" : "Draft"}
                    </Text>
                    {!ready && (
                      <Text style={styles.publishHint}>
                        Add lessons or a course link to enable publishing.
                      </Text>
                    )}
                  </View>
                  <View style={styles.publishRow}>
                    <Text style={styles.publishLabel}>Published</Text>
                    <Switch
                      value={!!course.isPublished}
                      onValueChange={(value) => handleCoursePublishToggle(course, value)}
                      disabled={
                        courseUpdatingId === course._id ||
                        (!ready && !course.isPublished)
                      }
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.manageCourseBtn}
                    onPress={() => navigation.navigate("ManageCourse", { id: course._id })}
                  >
                    <Text style={styles.manageCourseText}>Manage Course</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* SUBSCRIPTION STATUS (Own Profile Only) */}
      {isOwnProfile && (
        <View style={styles.subscriptionCard}>
          <View style={styles.subscriptionHeader}>
            <View>
              <Text style={styles.subscriptionTitle}>
                {currentIsPro ? "✨ Pro Member" : "🌱 Free Plan"}
              </Text>
              <Text style={styles.subscriptionSubtitle}>
                {currentIsPro
                  ? "All features unlocked"
                  : currentIsEntitled 
                    ? "Guild Access Active • Pro unlock available"
                    : "Limited features • Upgrade to unlock AI & more"}
              </Text>
            </View>
            {!currentIsPro && (
              <TouchableOpacity
                style={styles.upgradeBtn}
                onPress={() => navigation.navigate("Subscription")}
              >
                <Text style={styles.upgradeBtnText}>Upgrade</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* NOTIFICATION PREFERENCES (Own Profile Only) */}
      {isOwnProfile && (
        <View style={styles.notifPrefsCard}>
          <Text style={styles.notifPrefsTitle}>Notification Preferences</Text>
          <View style={styles.notifPrefRow}>
            <Text style={styles.notifPrefLabel}>Forum Notifications</Text>
            <Switch
              value={notifPrefs.forumNotifications}
              onValueChange={(v) => handleTogglePref("forumNotifications", v)}
              disabled={savingPrefs}
            />
          </View>
          <View style={styles.notifPrefRow}>
            <Text style={styles.notifPrefLabel}>Aggregate Likes</Text>
            <Switch
              value={notifPrefs.forumAggregated}
              onValueChange={(v) => handleTogglePref("forumAggregated", v)}
              disabled={savingPrefs}
            />
          </View>
          <View style={styles.notifPrefRow}>
            <Text style={styles.notifPrefLabel}>Individual Reactions</Text>
            <Switch
              value={notifPrefs.forumReactions}
              onValueChange={(v) => handleTogglePref("forumReactions", v)}
              disabled={savingPrefs}
            />
          </View>
        </View>
      )}

      {/* EDIT PROFILE BUTTON */}
      {isOwnProfile && (
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate("EditProfile")}
        >
          <Text style={styles.editText}>Edit Profile</Text>
        </TouchableOpacity>
      )}

      {/* TABS */}
      <View style={styles.tabs}>
        <TouchableOpacity
          onPress={() => setTab("posts")}
          style={[styles.tab, tab === "posts" && styles.activeTab]}
        >
          <Text style={styles.tabText}>Posts</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTab("growlogs")}
          style={[styles.tab, tab === "growlogs" && styles.activeTab]}
        >
          <Text style={styles.tabText}>Grow Logs</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTab("courses")}
          style={[styles.tab, tab === "courses" && styles.activeTab]}
        >
          <Text style={styles.tabText}>Courses</Text>
        </TouchableOpacity>
      </View>

      {/* TAB CONTENT */}
      {tab === "posts" && (posts || []).length > 0 && (
        <View>
          {(posts || []).map((p) => (
            <TouchableOpacity
              key={p._id}
              style={styles.postCard}
              onPress={() => navigation.navigate("ForumPostDetail", { id: p._id })}
            >
              {p.photos && p.photos[0] && (
                <Image source={{ uri: p.photos[0] }} style={styles.postImage} />
              )}
              <Text>{p.content}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {tab === "growlogs" && (growlogs || []).length > 0 && (
        <View>
          {(growlogs || []).map((g) => (
            <TouchableOpacity
              key={g._id}
              style={styles.postCard}
              onPress={() => navigation.navigate("GrowLogDetail", { id: g._id })}
            >
              {g.photos && g.photos[0] && (
                <Image source={{ uri: g.photos[0] }} style={styles.postImage} />
              )}
              <Text>{g.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {tab === "courses" && (
        <View>
          <Text>Courses coming soon…</Text>
        </View>
      )}

      {/* ABOUT SECTION */}
      <View
        style={{
          marginTop: 30,
          marginBottom: 40,
          alignItems: "center",
          paddingHorizontal: 24
        }}
      >
        <Text style={{ fontWeight: "bold", fontSize: 16, marginBottom: 8 }}>About</Text>
        {/* GrowPath Philosophy */}
        <Text
          style={{ fontSize: 15, color: "#444", textAlign: "center", marginBottom: 14 }}
        >
          GrowPath is built on the belief that growth is a journey, not a race. We empower
          you to cultivate your own path, guided by curiosity, reflection, and community.
          Our tools are designed to help you discover your why, celebrate progress, and
          embrace learning—so you can grow with intention, at your own pace.
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate("PrivacyPolicy")}>
          <Text
            style={{ color: "#3498db", fontSize: 15, textDecorationLine: "underline" }}
          >
            Privacy Policy
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  retryBtn: {
    backgroundColor: "#2ecc71",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8
  },
  retryText: {
    color: "white",
    fontWeight: "600"
  },
  notifPrefsCard: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  notifPrefsTitle: {
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 10
  },
  notifPrefRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10
  },
  notifPrefLabel: {
    fontSize: 15,
    color: "#333"
  },
  banner: { width: "100%", height: 140 },
  avatarContainer: {
    alignItems: "center",
    marginTop: -40
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "#fff"
  },
  username: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 6
  },
  bio: {
    textAlign: "center",
    marginTop: 4,
    color: "#555"
  },
  entitlementPill: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#E0E7FF"
  },
  entitlementText: {
    color: "#1E3A8A",
    fontWeight: "600",
    fontSize: 13
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 10
  },
  stat: {
    fontWeight: "600"
  },
  courseShelf: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0E7FF"
  },
  courseShelfHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 12
  },
  courseShelfTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E1B4B"
  },
  courseShelfSubtitle: {
    color: "#4338CA",
    marginTop: 4,
    fontSize: 13
  },
  courseShelfCreate: {
    backgroundColor: "#4338CA",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999
  },
  courseShelfCreateText: {
    color: "white",
    fontWeight: "600"
  },
  courseShelfEmpty: {
    color: "#4B5563",
    fontStyle: "italic"
  },
  creatorCourseCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 10
  },
  creatorCourseTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827"
  },
  creatorCourseMeta: {
    marginTop: 4,
    color: "#4B5563"
  },
  publishHint: {
    color: "#DC2626",
    marginTop: 4,
    fontSize: 12
  },
  publishRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10
  },
  publishLabel: {
    color: "#4B5563",
    fontWeight: "600"
  },
  manageCourseBtn: {
    marginTop: 12,
    backgroundColor: "#0EA5E9",
    paddingVertical: 10,
    borderRadius: 8
  },
  manageCourseText: {
    color: "white",
    textAlign: "center",
    fontWeight: "600"
  },
  editBtn: {
    backgroundColor: "#ddd",
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 50,
    marginBottom: 10
  },
  editText: {
    textAlign: "center",
    fontWeight: "600"
  },
  subscriptionCard: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB"
  },
  subscriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4
  },
  subscriptionSubtitle: {
    fontSize: 13,
    color: "#6B7280"
  },
  upgradeBtn: {
    backgroundColor: "#667eea",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  upgradeBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#eee",
    borderRadius: 8,
    marginVertical: 10
  },
  tab: {
    flex: 1,
    paddingVertical: 10
  },
  activeTab: {
    backgroundColor: "#2ecc71"
  },
  tabText: {
    textAlign: "center",
    color: "white",
    fontWeight: "700"
  },
  postCard: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10
  },
  postImage: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginBottom: 8
  }
});
