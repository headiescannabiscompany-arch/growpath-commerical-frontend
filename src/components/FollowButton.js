import React, { useEffect, useState } from "react";
import { TouchableOpacity, Text } from "react-native";
import { followUser, unfollowUser, isFollowing } from "../api/users";
import { radius } from "../theme/theme";
import { useAppTheme } from "../theme/appTheme";

export default function FollowButton({ userId }) {
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
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
    if (busy) return;
    setBusy(true);
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
    } finally {
      setBusy(false);
    }
  }

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={following ? "Unfollow user" : "Follow user"}
      accessibilityState={{ busy, disabled: busy }}
      onPress={toggle}
      disabled={busy}
      style={{
        alignItems: "center",
        justifyContent: "center",
        minHeight: 44,
        minWidth: 44,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: radius.card,
        backgroundColor: following ? palette.surfaceMuted : palette.accent,
        opacity: busy ? 0.65 : 1
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
