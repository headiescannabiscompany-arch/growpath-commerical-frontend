import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet
} from "react-native";

import ScreenContainer from "../components/ScreenContainer";
import FollowButton from "../components/FollowButton";
import { getProfile } from "../api/profile";

export default function ProfileScreen({ route, navigation }) {
  const userId = route.params?.id || global.user._id;

  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState("posts");

  async function load() {
    const res = await getProfile(userId);
    setProfile(res.data || res);
  }

  useEffect(() => {
    load();
  }, []);

  if (!profile) return <ScreenContainer><Text>Loading...</Text></ScreenContainer>;

  const { user, posts, growlogs } = profile;

  return (
    <ScreenContainer scroll>
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
      <View style={{ alignItems: 'center' }}>
        <Text style={styles.username}>{user.username || user.name}</Text>
        {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
      </View>

      {/* FOLLOW BUTTON */}
      {userId !== global.user._id && (
        <View style={{ marginVertical: 10, alignItems: 'center' }}>
          <FollowButton userId={userId} />
        </View>
      )}

      {/* STATS */}
      <View style={styles.statsRow}>
        <TouchableOpacity onPress={() => navigation.navigate("FollowersList", { id: userId })}>
          <Text style={styles.stat}>{(user.followers || []).length} Followers</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("FollowingList", { id: userId })}>
          <Text style={styles.stat}>{(user.following || []).length} Following</Text>
        </TouchableOpacity>

        <Text style={styles.stat}>{(posts || []).length} Posts</Text>
      </View>

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
        <TouchableOpacity onPress={() => setTab("posts")}
          style={[styles.tab, tab === "posts" && styles.activeTab]}>
          <Text style={styles.tabText}>Posts</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setTab("growlogs")}
          style={[styles.tab, tab === "growlogs" && styles.activeTab]}>
          <Text style={styles.tabText}>Grow Logs</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setTab("courses")}
          style={[styles.tab, tab === "courses" && styles.activeTab]}>
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

    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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


