import React from "react";

export function GoodGated({ isGuildMember }) {
  if (isGuildMember) {
    return <span>Targeted cannabis coaching</span>;
  }

  return <span>General grow coaching</span>;
}

export default GoodGated;
