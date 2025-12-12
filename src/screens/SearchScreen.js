import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet
} from "react-native";

import ScreenContainer from "../components/ScreenContainer";
import { search } from "../api/search";

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [tab, setTab] = useState("users");

  // Debounce search
  useEffect(() => {
    const delay = setTimeout(() => {
      if (query.length > 0) runSearch();
      else setResults(null);
    }, 300);
    return () => clearTimeout(delay);
  }, [query]);

  async function runSearch() {
    try {
      const res = await search(query);
      setResults(res.data || res);
    } catch (err) {
      // Search failed
    }
  }

  return (
    <ScreenContainer>
      {/* SEARCH BAR */}
      <TextInput
        placeholder="Search users, tags, strains, posts..."
        value={query}
        onChangeText={setQuery}
        style={styles.input}
      />

      {/* TABS */}
      {results && (
        <View style={styles.tabs}>
          {["users", "posts", "tags", "strains"].map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tab, tab === t && styles.activeTab]}
            >
              <Text style={styles.tabText}>{t.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* RESULTS */}
      {results && (
        <FlatList
          data={results[tab]}
          keyExtractor={(item) => item._id || item.tag || item._id}
          renderItem={({ item }) => {
            if (tab === "users") {
              return (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => navigation.navigate("Profile", { id: item._id })}
                >
                  <Image
                    source={{ uri: item.avatar || "https://placehold.co/100" }}
                    style={styles.avatar}
                  />
                  <View>
                    <Text style={styles.username}>{item.username || item.name}</Text>
                    <Text style={styles.sub}>
                      {(item.followers || []).length} followers
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }

            if (tab === "posts") {
              return (
                <TouchableOpacity
                  style={styles.postRow}
                  onPress={() => navigation.navigate("ForumPostDetail", { id: item._id })}
                >
                  {item.photos?.[0] && (
                    <Image source={{ uri: item.photos[0] }} style={styles.thumb} />
                  )}
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={2}>{item.content}</Text>
                    <Text style={styles.sub}>
                      by {item.user?.name || item.user?.username}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }

            if (tab === "tags") {
              return (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => navigation.navigate("TagDetail", { tag: item.tag })}
                >
                  <Text style={styles.tag}>#{item.tag}</Text>
                  <Text style={styles.sub}>{item.count} posts</Text>
                </TouchableOpacity>
              );
            }

            if (tab === "strains") {
              return (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => navigation.navigate("TagDetail", { tag: item._id })}
                >
                  <Text style={styles.strain}>{item._id}</Text>
                  <Text style={styles.sub}>{item.count} posts</Text>
                </TouchableOpacity>
              );
            }
          }}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: "#eee",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10
  },
  tabs: {
    flexDirection: "row",
    marginBottom: 10
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: "#ddd"
  },
  activeTab: {
    backgroundColor: "#2ecc71"
  },
  tabText: {
    textAlign: "center",
    color: "white",
    fontWeight: "700"
  },
  row: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
    alignItems: "center"
  },
  username: { fontWeight: "700" },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  sub: { color: "#777", fontSize: 12 },
  postRow: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#eee"
  },
  thumb: { width: 60, height: 60, borderRadius: 8, marginRight: 10 },
  tag: { fontSize: 18, fontWeight: "700", marginRight: 10 },
  strain: { fontSize: 18, fontWeight: "600", marginRight: 10 }
});
