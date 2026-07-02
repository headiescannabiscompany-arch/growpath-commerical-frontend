import React from "react";
import { Redirect } from "expo-router";

/**
 * Personal home redirect.
 *
 * This route exists to forward legacy personal entry points into tabs.
 */
export default function PersonalHomeRedirect() {
  return <Redirect href="/home/personal" />;
}
