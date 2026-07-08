import React from "react";
import { View, Text, Pressable } from "react-native";
import { useAuth } from "../../auth/AuthContext";

type Author = {
  id: string;
  displayName: string;
  email: string;
  role: string;
  plan: string | null;
  subscriptionStatus: string | null;
};

type CommercialPost = {
  id: string;
  author: Author | null;
  type: string;
  title?: string;
  body: string;
  tags?: string[];
  location?: string;
  engagementCount?: number;
  likeCount?: number;
  linkedProductId?: string;
  linkedCourseId?: string;
  linkedLiveId?: string;
  linkedForumThreadId?: string;
  storefrontSlug?: string;
  createdAt: string;
};

type Props = {
  post: CommercialPost;
};

export default function CommercialFeedCard({ post }: Props) {
  const { user } = useAuth();
  const isOwnPost = user?.id === post.author?.id;
  const engagementCount = Number(post.engagementCount ?? post.likeCount ?? 0);
  const destinationLabel = post.linkedProductId
    ? "View Product"
    : post.linkedCourseId
      ? "View Course"
      : post.linkedLiveId
        ? "View Live"
        : post.storefrontSlug
          ? "Visit Storefront"
          : post.linkedForumThreadId
            ? "Open Forum Q&A"
            : "Learn More";

  return (
    <View
      style={{
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginHorizontal: 12,
        marginVertical: 6
      }}
    >
      {/* Header */}
      <View style={{ marginBottom: 6 }}>
        <Text style={{ fontWeight: "600" }}>{post.author?.displayName || "Unknown"}</Text>
        <Text style={{ fontSize: 12, opacity: 0.6 }}>
          {new Date(post.createdAt).toLocaleString()}
        </Text>
      </View>

      {/* Body */}
      {post.title ? (
        <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 4 }}>
          {post.title}
        </Text>
      ) : null}

      <Text style={{ fontSize: 15, marginBottom: 8 }}>{post.body}</Text>

      <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
        <Pressable
          style={{
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 8,
            borderWidth: 1,
            marginRight: 12
          }}
        >
          <Text>{destinationLabel}</Text>
        </Pressable>

        <Text style={{ opacity: 0.7 }}>{engagementCount} campaign engagements</Text>
      </View>

      {isOwnPost ? (
        <Text style={{ marginTop: 6, fontSize: 11, opacity: 0.5 }}>Your campaign</Text>
      ) : null}
    </View>
  );
}
