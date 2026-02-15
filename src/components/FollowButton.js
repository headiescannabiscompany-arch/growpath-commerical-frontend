import React, { useEffect, useState } from "react";
import { TouchableOpacity, Text } from "react-native";
import { followUser, unfollowUser, isFollowing } from "../api/users";

export default function FollowButton({ userId }) {
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await isFollowing(userId);
        const payload = res?.data ?? res;
        const val = payload?.isFollowing ?? false;
        if (mounted) setFollowing(!!val);
      } catch (_err) {
        // ignore
      }
    }
    load();
    return () => (mounted = false);
  }, [userId]);

  async function toggle() {
    try {
      if (following) {
        await unfollowUser(userId);
        setFollowing(false);
      } else {
        await followUser(userId);
        setFollowing(true);
      }
    } catch (_err) {
      // ignore
    }
  }

  return (
    <TouchableOpacity
      onPress={toggle}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: following ? "#ddd" : "#2ecc71"
      }}
    >
      <Text style={{ color: following ? "#333" : "white", fontWeight: "600" }}>
        {following ? "Following" : "Follow"}
      </Text>
    </TouchableOpacity>
  );
}
