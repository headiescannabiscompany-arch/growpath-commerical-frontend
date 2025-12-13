import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch
} from "react-native";

import FollowButton from "../components/FollowButton";
import { getProfile, updateNotificationPreferences } from "../api/profile";

export default function ProfileScreen({ route, navigation }) {
  // Notification preferences state (for current user only)
  const [notifPrefs, setNotifPrefs] = useState({
    forumReactions: false,
    forumAggregated: true,
    forumNotifications: true
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const userId = route.params?.id || global.user._id;

  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("posts");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const res = await getProfile(userId);
      setProfile(res.data || res);
      setError(null);
    } catch (err) {
      console.error("Profile load error:", err);
      // Create a minimal profile if fetching fails
      setProfile({
        user: {
          _id: userId,
          username: "User",
          email: global.user?.email || "",
          plan: "free",
          avatar: null,
          banner: null,
          bio: "",
          followers: [],
          following: []
        },
        posts: [],
        growlogs: []
      });
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontSize: 16 }}>Loading profile...</Text>
      </View>
    );

  const { user, posts, growlogs } = profile;

  // Set notification prefs from profile (if own profile)
  useEffect(() => {
    if (profile && userId === global.user._id && profile.user.preferences) {
      setNotifPrefs({
        forumReactions: !!profile.user.preferences.forumReactions,
        forumAggregated: profile.user.preferences.forumAggregated !== false,
        forumNotifications: profile.user.preferences.forumNotifications !== false
      });
    }
  }, [profile, userId]);

  async function handleTogglePref(key, value) {
    const newPrefs = { ...notifPrefs, [key]: value };
    setNotifPrefs(newPrefs);
    setSavingPrefs(true);
    try {
      await updateNotificationPreferences(newPrefs);
    } catch (err) {
      // Optionally show error
    }
    setSavingPrefs(false);
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* BANNER */}
      <Image
        source={{ uri: user.banner || "https://placehold.co/600x200" }}
        style={styles.banner}
      />

      {/* AVATAR */}
      <View style={styles.avatarContainer}>
        <Image
          source={{ uri: user.avatar || "https://placehold.co/200" }}
          style={styles.avatar}
        />
      </View>

      {/* USER INFO */}
      <View style={{ alignItems: "center" }}>
        <Text style={styles.username}>{user.username || user.name}</Text>
        {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
      </View>

      {/* FOLLOW BUTTON */}
      {userId !== global.user._id && (
        <View style={{ marginVertical: 10, alignItems: "center" }}>
          <FollowButton userId={userId} />
        </View>
      )}

      {/* STATS */}
      <View style={styles.statsRow}>
        <TouchableOpacity
          onPress={() => navigation.navigate("FollowersList", { id: userId })}
        >
          <Text style={styles.stat}>{(user.followers || []).length} Followers</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate("FollowingList", { id: userId })}
        >
          <Text style={styles.stat}>{(user.following || []).length} Following</Text>
        </TouchableOpacity>

        <Text style={styles.stat}>{(posts || []).length} Posts</Text>
      </View>

      {/* SUBSCRIPTION STATUS (Own Profile Only) */}
      {userId === global.user._id && (
        <View style={styles.subscriptionCard}>
          <View style={styles.subscriptionHeader}>
            <View>
              <Text style={styles.subscriptionTitle}>
                {user.plan === "pro" ? "✨ Pro Member" : "🌱 Free Plan"}
              </Text>
              <Text style={styles.subscriptionSubtitle}>
                {user.plan === "pro"
                  ? "All features unlocked"
                  : "Limited features • Upgrade to unlock AI & more"}
              </Text>
            </View>
            {user.plan !== "pro" && (
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
      {userId === global.user._id && (
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
      {userId === global.user._id && (
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
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 10
  },
  stat: {
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
