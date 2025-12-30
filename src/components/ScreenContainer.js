import React, { forwardRef } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { colors } from "../theme/theme";

const ScreenContainer = forwardRef(function ScreenContainer(
  { children, scroll = false, innerRef = null },
  ref
) {
  const Comp = scroll ? ScrollView : View;
  return (
    <Comp
      ref={innerRef || ref}
      style={styles.container}
      contentContainerStyle={scroll && styles.scrollContent}
    >
      {children}
    </Comp>
  );
});

export default ScreenContainer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 20,
    paddingTop: 32
  },
  scrollContent: {
    paddingBottom: 40
  }
});
