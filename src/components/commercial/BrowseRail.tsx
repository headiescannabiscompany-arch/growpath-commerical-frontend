import React, { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

/** Explicit controls supplement touch, trackpad, keyboard and the visible scrollbar. */
export default function BrowseRail({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  const { palette } = useAppTheme();
  const scroll = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [offset, setOffset] = useState(0);
  const maxOffset = Math.max(0, contentWidth - width);
  function move(direction: number) {
    scroll.current?.scrollTo({
      x: Math.max(0, Math.min(maxOffset, offset + direction * Math.max(272, width - 48))),
      animated: true
    });
  }
  return (
    <View>
      {maxOffset > 1 ? (
        <View style={styles.controls}>
          {([-1, 1] as const).map((direction) => {
            const disabled = direction < 0 ? offset <= 1 : offset >= maxOffset - 1;
            const name = direction < 0 ? "Previous" : "Next";
            return (
              <Pressable
                key={name}
                accessibilityRole="button"
                accessibilityLabel={`${name} ${label}`}
                accessibilityState={{ disabled }}
                disabled={disabled}
                onPress={() => move(direction)}
                style={[
                  styles.button,
                  {
                    backgroundColor: palette.surface,
                    borderColor: palette.border,
                    opacity: disabled ? 0.45 : 1
                  }
                ]}
              >
                <Text style={{ color: palette.text }}>
                  {direction < 0 ? "← Previous" : "Next →"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <ScrollView
        ref={scroll}
        horizontal
        showsHorizontalScrollIndicator
        accessibilityLabel={`${label} browsing row`}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        onContentSizeChange={(nextWidth) => setContentWidth(nextWidth)}
        onScroll={(event) => setOffset(event.nativeEvent.contentOffset.x)}
        scrollEventThrottle={16}
        contentContainerStyle={styles.rail}
      >
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginBottom: 8 },
  button: {
    borderWidth: 1,
    borderRadius: radius.card,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14
  },
  rail: { gap: 12, paddingBottom: 12, paddingRight: 16 }
});
