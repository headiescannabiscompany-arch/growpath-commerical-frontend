import React from "react";
import { Text, type StyleProp, type TextStyle } from "react-native";

export default function CourseContentPolicyNotice({ style }: { style?: StyleProp<TextStyle> }) {
  return (
    <Text style={style}>
      Courses must not include cannabis-related text or images. A course that breaks
      this rule may be taken down, including from existing learners. Course records
      and purchase history are preserved. This does not change your private grow tools.
    </Text>
  );
}
