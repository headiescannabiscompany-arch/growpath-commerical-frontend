import React, { useEffect, useState } from "react";
import { TouchableOpacity, Text } from "react-native";
import { followUser, unfollowUser, isFollowing } from "../api/users";
import { radius } from "../theme/theme";
import { useAppTheme } from "../theme/appTheme";

export default function FollowButton({ userId }) {
  const [following, setFollowing] = useState(false);
  const { palette } = useAppTheme();

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
        borderRadius: radius.card,
        backgroundColor: following ? palette.surfaceMuted : palette.accent
      }}
    >
      <Text
        style={{
          color: following ? palette.text : palette.accentText,
          fontWeight: "600"
        }}
      >
        {following ? "Following" : "Follow"}
      </Text>
    </TouchableOpacity>
  );
}
