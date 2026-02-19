import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import api from "../api/client.js";

function normalizeList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.courses)) return payload.courses;
  return [];
}

export default function CoursesScreen() {
  const params = (useLocalSearchParams && useLocalSearchParams()) || {};
  const page = useMemo(() => {
    const raw = params.page ?? params.p ?? 1;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 1;
  }, [params.page, params.p]);

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErr("");
      try {
        const res = await api.get(`/courses/list?page=${page}`);
        const list = normalizeList(res);
        if (alive) setCourses(list);
      } catch (e) {
        const msg = String(e?.message || e || "Failed to load courses");
        if (alive) setErr(msg);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [page]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Courses</Text>

      {loading ? (
        <View style={styles.row}>
          <ActivityIndicator />
          <Text style={styles.meta}>Loading courses…</Text>
        </View>
      ) : null}

      {err ? <Text style={styles.error}>{err}</Text> : null}

      {!loading && !err && courses.length === 0 ? (
        <Text style={styles.meta}>No courses found</Text>
      ) : null}

      <FlatList
        data={courses}
        keyExtractor={(item, idx) => String(item?._id || item?.id || idx)}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{String(item?.title || item?.name || "Untitled")}</Text>
            {!!item?.description ? (
              <Text style={styles.meta}>{String(item.description)}</Text>
            ) : null}
          </View>
        )}
      />

      <Pressable accessibilityRole="button" style={styles.btn}>
        <Text style={styles.btnText}>Create Course</Text>
      </Pressable>

      <Pressable accessibilityRole="button" style={styles.inviteBtn}>
        <Text style={styles.inviteText}>Become a Creator</Text>
      </Pressable>

      <Pressable accessibilityRole="button" style={styles.inviteBtn}>
        <Text style={styles.inviteText}>Invite Creator</Text>
      </Pressable>
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
  inviteBtn: { marginTop: 8, paddingVertical: 10 },
  inviteText: { fontWeight: "900" }
});
