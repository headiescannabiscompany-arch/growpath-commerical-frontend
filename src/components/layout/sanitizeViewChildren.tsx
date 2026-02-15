import React from "react";
import { Text } from "react-native";

/**
 * RN / RN-Web safety:
 * View cannot have raw text children. Wrap any accidental string/number nodes in <Text>.
 * Drop whitespace-only nodes to avoid random layout gaps.
 */
export function sanitizeViewChildren(
  node: React.ReactNode,
  source?: string
): React.ReactNode {
  return React.Children.toArray(node).map((child, idx) => {
    if (typeof child === "string" || typeof child === "number") {
      const s = String(child);

      // drop pure whitespace
      if (!s.trim()) return null;

      // dev-only breadcrumb (optional but useful)
      if (__DEV__ && source) {
        console.warn(`[SANITIZE_VIEW_CHILDREN] ${source} wrapped text node:`, s);
      }

      return <Text key={`__txt_${idx}`}>{s}</Text>;
    }
    return child;
  });
}
