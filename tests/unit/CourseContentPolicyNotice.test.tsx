import React from "react";
import { render } from "@testing-library/react-native";
import CourseContentPolicyNotice from "@/components/learning/CourseContentPolicyNotice";

test("course policy explains takedown and preserved history without an automatic image-screening claim", () => {
  const { getByText, queryByText } = render(<CourseContentPolicyNotice />);
  expect(getByText(/must not include cannabis-related text or images/)).toBeTruthy();
  expect(getByText(/including from existing learners/)).toBeTruthy();
  expect(getByText(/purchase history are preserved/)).toBeTruthy();
  expect(getByText(/does not change your private grow tools/)).toBeTruthy();
  expect(queryByText(/automatically scan|Stripe approved/i)).toBeNull();
});
