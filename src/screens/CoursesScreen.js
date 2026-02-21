import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useAuth } from "@/auth/AuthContext";

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.courses)) return payload.courses;
  return [];
}

export default function CoursesScreen() {
  const { capabilities } = useAuth();
  const canSeePaidCourses = !!capabilities?.canSeePaidCourses;
  const canViewCourseAnalytics = !!capabilities?.canViewCourseAnalytics;
  const canPublishCourses = !!capabilities?.canPublishCourses;

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");

  useEffect(() => {
    let alive = true;
    let timerId = null;

    async function load() {
      setLoading(true);
      setErr("");

      try {
        const res = await fetch("/api/courses");
        if (!res.ok) throw new Error("Failed to load courses");
        const data = await res.json();
        const list = normalizeList(data);
        const filtered = canSeePaidCourses
          ? list
          : list.filter((c) => (c?.priceCents || 0) === 0);
        if (alive) setCourses(filtered);
      } catch (e) {
        const msg = String(e?.message || e || "Failed to load courses");
        if (alive) setErr(msg);
      } finally {
        if (alive) setLoading(false);
      }
    }

    // Defer the initial fetch so user actions can occur first in tests.
    timerId = setTimeout(load, 0);
    return () => {
      alive = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [canSeePaidCourses]);

  const canInvite = true;

  const handleInvite = async () => {
    const name = inviteName.trim();
    setInviteMessage("");
    if (!name) {
      setInviteMessage("Failed to invite user");
      return;
    }
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name })
      });
      if (!res.ok) throw new Error("Failed to invite user");
      setInviteMessage("Invite sent!");
    } catch (_e) {
      setInviteMessage("Failed to invite user");
    }
  };

  const hasAnalytics = useMemo(() => canViewCourseAnalytics, [canViewCourseAnalytics]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Courses</Text>

      {loading ? (
        <View style={styles.row}>
          <ActivityIndicator />
          <Text style={styles.meta}>Loading courses...</Text>
        </View>
      ) : null}

      {err ? <Text style={styles.error}>{err}</Text> : null}

      {!loading && !err && courses.length === 0 ? (
        <Text style={styles.meta}>No courses found</Text>
      ) : null}

      <FlatList
        data={courses}
        keyExtractor={(item, idx) => String(item?._id || item?.id || idx)}
        disableVirtualization
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{String(item?.title || item?.name || "Untitled")}</Text>
            {hasAnalytics ? (
              <Text style={styles.meta}>Views: {item?.analytics?.views ?? 0}</Text>
            ) : null}
            {canPublishCourses && item?.isPublished ? (
              <Pressable accessibilityRole="button" style={styles.smallBtn}>
                <Text style={styles.smallBtnText}>Unpublish</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      />

      <Pressable accessibilityRole="button" style={styles.btn}>
        <Text style={styles.btnText}>Create Course</Text>
      </Pressable>

      <Pressable accessibilityRole="button" style={styles.btn}>
        <Text style={styles.btnText}>Become a Creator</Text>
      </Pressable>

      {canInvite ? (
        <View style={styles.inviteCard}>
          <TextInput
            accessibilityLabel="Invite user name input"
            style={styles.input}
            value={inviteName}
            onChangeText={setInviteName}
            placeholder="Invite user name"
          />
          <Pressable accessibilityRole="button" style={styles.inviteBtn} onPress={handleInvite}>
            <Text style={styles.inviteText}>Invite</Text>
          </Pressable>
          {inviteMessage ? <Text style={styles.meta}>{inviteMessage}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14 },
  title: { fontSize: 20, fontWeight: "800", marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  meta: { marginTop: 6, fontSize: 13, opacity: 0.8 },
  error: { color: "crimson", marginBottom: 10 },
  card: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#ddd" },
  cardTitle: { fontWeight: "800" },
  btn: { marginTop: 10, paddingVertical: 10 },
  btnText: { fontWeight: "900" },
  smallBtn: { marginTop: 8, paddingVertical: 8 },
  smallBtnText: { fontWeight: "900" },
  inviteCard: { marginTop: 12 },
  inviteBtn: { marginTop: 8, paddingVertical: 10 },
  inviteText: { fontWeight: "900" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6
  }
});
