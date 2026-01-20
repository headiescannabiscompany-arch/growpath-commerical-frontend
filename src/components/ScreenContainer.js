import React, { forwardRef, useRef, useCallback } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { colors } from "../theme/theme.js";
import useTabPressScrollReset from "../hooks/useTabPressScrollReset.js";

/**
 * @typedef {Object} ScreenContainerProps
 * @property {React.ReactNode} children
 * @property {boolean} [scroll]
 * @property {any} [innerRef]
 * @property {any} [style]
 * @property {any} [contentContainerStyle]
 * @property {boolean} [resetOnTabPress]
 * @property {string} [testID]
 */

/**
 * @type {import('react').ForwardRefExoticComponent<ScreenContainerProps & React.RefAttributes<any>>}
 */
const ScreenContainer = forwardRef(function ScreenContainer(
  {
    children,
    scroll = false,
    innerRef = null,
    style,
    contentContainerStyle,
    resetOnTabPress = scroll,
    ...rest
  },
  ref
) {
  const Comp = scroll ? ScrollView : View;
  const fallbackRef = useRef(null);
  const resolvedStyle = [styles.container, style].filter(Boolean);
  const resolvedContentStyle = scroll
    ? [styles.scrollContent, contentContainerStyle].filter(Boolean)
    : contentContainerStyle;
  const setRefs = useCallback(
    (node) => {
      fallbackRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
      if (typeof innerRef === "function") {
        innerRef(node);
      } else if (innerRef) {
        innerRef.current = node;
      }
    },
    [ref, innerRef]
  );

  const handleTabPressReset = useCallback(() => {
    if (!scroll || !resetOnTabPress) return;
    const target = fallbackRef.current;
    if (target?.scrollTo) {
      target.scrollTo({ y: 0, animated: false });
    } else if (target?.scrollToOffset) {
      target.scrollToOffset({ offset: 0, animated: false });
    }
  }, [scroll, resetOnTabPress]);

  useTabPressScrollReset(handleTabPressReset);

  return (
    <Comp
      ref={scroll ? setRefs : innerRef || ref}
      style={resolvedStyle}
      contentContainerStyle={resolvedContentStyle}
      {...rest}
    >
      {children}
    </Comp>
  );
});

export default ScreenContainer;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "yellow", // DEBUG: force visible background
    paddingHorizontal: 20,
    paddingTop: 32
  },
  scrollContent: {
    paddingBottom: 40
  }
});
