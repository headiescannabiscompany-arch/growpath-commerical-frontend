import React from "react";

export function BadWrongCondition({ isPro }) {
  if (isPro) {
    return <span>Exclusive cannabis secrets</span>;
  }

  return <span>General info</span>;
}

export default BadWrongCondition;
