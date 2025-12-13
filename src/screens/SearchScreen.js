import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  FlatList,
  StyleSheet,
  ScrollView
} from "react-native";

import ScreenContainer from "../components/ScreenContainer";
import { search } from "../api/search";

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [tab, setTab] = useState("all");
  const [filter, setFilter] = useState("all");
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search
  useEffect(() => {
    const delay = setTimeout(() => {
      if (query.length > 0) {
        setIsSearching(true);
        runSearch();
      } else {
        setResults(null);
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [query]);

  async function runSearch() {
    try {
      const res = await search(query);
      setResults(res.data || res);
      setIsSearching(false);
    } catch (err) {
      setIsSearching(false);
    }
  }

  const categories = [
    { key: "all", label: "All", icon: "🔍", color: "#3B82F6" },
    { key: "users", label: "People", icon: "👥", color: "#8B5CF6" },
    { key: "posts", label: "Posts", icon: "📝", color: "#10B981" },
    { key: "strains", label: "Strains", icon: "🌿", color: "#F59E0B" },
    { key: "tags", label: "Tags", icon: "#️⃣", color: "#EF4444" }
  ];

  const getAllResults = () => {
    if (!results) return [];
    const all = [];
    if (results.users) all.push(...results.users.map((u) => ({ ...u, type: "user" })));
    if (results.posts) all.push(...results.posts.map((p) => ({ ...p, type: "post" })));
    if (results.strains)
      all.push(...results.strains.map((s) => ({ ...s, type: "strain" })));
    if (results.tags) all.push(...results.tags.map((t) => ({ ...t, type: "tag" })));
    return all;
  };

  const getFilteredResults = () => {
    if (!results) return [];
    if (tab === "all") return getAllResults();
    return (results[tab] || []).map((item) => ({ ...item, type: tab.slice(0, -1) }));
  };

  return (
    <ScreenContainer>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🔍 Discover</Text>
          <Text style={styles.headerSubtitle}>Find growers, strains, tips & more</Text>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            placeholder="Search users, tags, strains, posts..."
            placeholderTextColor="#95a5a6"
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} style={styles.clearButton}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* CATEGORY PILLS */}
        {(results || query.length > 0) && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
            contentContainerStyle={styles.categoriesContent}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                onPress={() => setTab(cat.key)}
                style={[
                  styles.categoryPill,
                  tab === cat.key && { backgroundColor: cat.color }
                ]}
              >
                <Text style={styles.categoryIcon}>{cat.icon}</Text>
                <Text
                  style={[
                    styles.categoryLabel,
                    tab === cat.key && styles.categoryLabelActive
                  ]}
                >
                  {cat.label}
                </Text>
                {results && results[cat.key] && (
                  <View style={[styles.badge, tab === cat.key && styles.badgeActive]}>
                    <Text
                      style={[
                        styles.badgeText,
                        tab === cat.key && styles.badgeTextActive
                      ]}
                    >
                      {cat.key === "all"
                        ? getAllResults().length
                        : results[cat.key]?.length || 0}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* LOADING STATE */}
        {isSearching && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>🔍 Searching...</Text>
          </View>
        )}

        {/* EMPTY STATE */}
        {!results && query.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🌱</Text>
            <Text style={styles.emptyTitle}>Discover GrowPath</Text>
            <Text style={styles.emptyText}>
              Search for growers, strains, grow techniques, and community posts
            </Text>
            <View style={styles.suggestionsContainer}>
              <Text style={styles.suggestionsTitle}>Popular Searches:</Text>
              {["OG Kush", "LST training", "nutrient burn", "hydro setup"].map((term) => (
                <TouchableOpacity
                  key={term}
                  style={styles.suggestionPill}
                  onPress={() => setQuery(term)}
                >
                  <Text style={styles.suggestionText}>{term}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* NO RESULTS */}
        {results && getFilteredResults().length === 0 && !isSearching && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🤷</Text>
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptyText}>
              Try different keywords or browse categories
            </Text>
          </View>
        )}

        {/* RESULTS */}
        {results && getFilteredResults().length > 0 && (
          <FlatList
            data={getFilteredResults()}
            keyExtractor={(item, idx) => item._id || item.tag || idx.toString()}
            contentContainerStyle={styles.resultsContainer}
            renderItem={({ item }) => {
              if (item.type === "user" || (tab === "users" && !item.type)) {
                return (
                  <TouchableOpacity
                    style={styles.resultCard}
                    onPress={() => navigation.navigate("Profile", { id: item._id })}
                  >
                    <View style={styles.userCard}>
                      <Image
                        source={{ uri: item.avatar || "https://placehold.co/100" }}
                        style={styles.userAvatar}
                      />
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{item.username || item.name}</Text>
                        <Text style={styles.userMeta}>
                          👥 {(item.followers || []).length} followers •
                          {item.bio ? ` ${item.bio.substring(0, 40)}...` : " Grower"}
                        </Text>
                      </View>
                      <View style={styles.userBadge}>
                        <Text style={styles.userBadgeText}>👤</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }

              if (item.type === "post" || (tab === "posts" && !item.type)) {
                return (
                  <TouchableOpacity
                    style={styles.resultCard}
                    onPress={() =>
                      navigation.navigate("ForumPostDetail", { id: item._id })
                    }
                  >
                    <View style={styles.postCard}>
                      {item.photos?.[0] && (
                        <Image
                          source={{ uri: item.photos[0] }}
                          style={styles.postImage}
                        />
                      )}
                      <View style={styles.postContent}>
                        <Text style={styles.postText} numberOfLines={3}>
                          {item.content || item.title}
                        </Text>
                        <View style={styles.postMeta}>
                          <Text style={styles.postAuthor}>
                            by {item.user?.name || item.user?.username || "Anonymous"}
                          </Text>
                          <View style={styles.postStats}>
                            <Text style={styles.postStat}>
                              ❤️ {item.likes?.length || 0}
                            </Text>
                            <Text style={styles.postStat}>
                              💬 {item.commentCount || 0}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }

              if (item.type === "tag" || (tab === "tags" && !item.type)) {
                return (
                  <TouchableOpacity
                    style={styles.resultCard}
                    onPress={() =>
                      navigation.navigate("TagDetail", { tag: item.tag || item._id })
                    }
                  >
                    <View style={styles.tagCard}>
                      <View style={styles.tagIcon}>
                        <Text style={styles.tagIconText}>#</Text>
                      </View>
                      <View style={styles.tagInfo}>
                        <Text style={styles.tagName}>#{item.tag || item._id}</Text>
                        <Text style={styles.tagCount}>{item.count || 0} posts</Text>
                      </View>
                      <Text style={styles.tagArrow}>→</Text>
                    </View>
                  </TouchableOpacity>
                );
              }

              if (item.type === "strain" || (tab === "strains" && !item.type)) {
                return (
                  <TouchableOpacity
                    style={styles.resultCard}
                    onPress={() => navigation.navigate("TagDetail", { tag: item._id })}
                  >
                    <View style={styles.strainCard}>
                      <View style={styles.strainIcon}>
                        <Text style={styles.strainIconText}>🌿</Text>
                      </View>
                      <View style={styles.strainInfo}>
                        <Text style={styles.strainName}>{item._id}</Text>
                        <Text style={styles.strainCount}>{item.count || 0} grows</Text>
                      </View>
                      <Text style={styles.strainArrow}>→</Text>
                    </View>
                  </TouchableOpacity>
                );
              }

              return null;
            }}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    padding: 20,
    paddingBottom: 16
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#7f8c8d"
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#e0e0e0"
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 12
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#2c3e50"
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center"
  },
  clearText: {
    fontSize: 14,
    color: "#7f8c8d"
  },
  categoriesScroll: {
    marginBottom: 16
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 8
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 2,
    borderColor: "#e0e0e0"
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50"
  },
  categoryLabelActive: {
    color: "#fff"
  },
  badge: {
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8
  },
  badgeActive: {
    backgroundColor: "rgba(255,255,255,0.3)"
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2c3e50"
  },
  badgeTextActive: {
    color: "#fff"
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center"
  },
  loadingText: {
    fontSize: 16,
    color: "#7f8c8d"
  },
  emptyState: {
    padding: 40,
    alignItems: "center"
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 8
  },
  emptyText: {
    fontSize: 15,
    color: "#7f8c8d",
    textAlign: "center",
    lineHeight: 22
  },
  suggestionsContainer: {
    marginTop: 24,
    width: "100%"
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2c3e50",
    marginBottom: 12
  },
  suggestionPill: {
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#27ae60"
  },
  suggestionText: {
    fontSize: 14,
    color: "#27ae60",
    fontWeight: "600"
  },
  resultsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  resultCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    boxShadow: "0px 2px 4px rgba(0,0,0,0.1)",
    elevation: 3
  },
  // User Card
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#e0e0e0",
    marginRight: 16
  },
  userInfo: {
    flex: 1
  },
  userName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 4
  },
  userMeta: {
    fontSize: 13,
    color: "#7f8c8d",
    lineHeight: 18
  },
  userBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#8B5CF6",
    justifyContent: "center",
    alignItems: "center"
  },
  userBadgeText: {
    fontSize: 18
  },
  // Post Card
  postCard: {
    overflow: "hidden"
  },
  postImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#e0e0e0"
  },
  postContent: {
    padding: 16
  },
  postText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#2c3e50",
    marginBottom: 12
  },
  postMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  postAuthor: {
    fontSize: 13,
    color: "#7f8c8d"
  },
  postStats: {
    flexDirection: "row",
    gap: 12
  },
  postStat: {
    fontSize: 13,
    color: "#7f8c8d"
  },
  // Tag Card
  tagCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16
  },
  tagIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FEE2E2",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16
  },
  tagIconText: {
    fontSize: 24,
    color: "#EF4444",
    fontWeight: "700"
  },
  tagInfo: {
    flex: 1
  },
  tagName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 4
  },
  tagCount: {
    fontSize: 13,
    color: "#7f8c8d"
  },
  tagArrow: {
    fontSize: 24,
    color: "#e0e0e0"
  },
  // Strain Card
  strainCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16
  },
  strainIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16
  },
  strainIconText: {
    fontSize: 24
  },
  strainInfo: {
    flex: 1
  },
  strainName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#2c3e50",
    marginBottom: 4
  },
  strainCount: {
    fontSize: 13,
    color: "#7f8c8d"
  },
  strainArrow: {
    fontSize: 24,
    color: "#e0e0e0"
  }
});
