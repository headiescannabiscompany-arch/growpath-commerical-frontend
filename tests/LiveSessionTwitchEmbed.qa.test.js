import React from "react";
import { render } from "@testing-library/react-native";

import LiveSessionTwitchEmbed from "../src/screens/LiveSessionTwitchEmbed";

jest.mock("react-native-webview", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { WebView: (props) => React.createElement(View, props) };
});

describe("LiveSessionTwitchEmbed viewer controls", () => {
  const originalParent = process.env.EXPO_PUBLIC_TWITCH_PARENT_HOST;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_TWITCH_PARENT_HOST = "growpathai.com";
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_TWITCH_PARENT_HOST = originalParent;
  });

  it("keeps live playback under the viewer's control", () => {
    const screen = render(<LiveSessionTwitchEmbed twitchChannel="growpath" />);
    const player = screen.getByLabelText("Twitch live player");

    expect(player.props.source.uri).toContain("autoplay=false");
    expect(player.props.allowsFullscreenVideo).toBe(true);
    expect(player.props.mediaPlaybackRequiresUserAction).toBe(true);
    expect(screen.getByText(/play, pause, volume, mute, and fullscreen/i)).toBeTruthy();
  });

  it("labels seeking as a replay capability", () => {
    const screen = render(
      <LiveSessionTwitchEmbed twitchChannel="v123" embedType="vod" />
    );

    expect(screen.getByLabelText("Twitch replay player").props.source.uri).toContain(
      "video=v123"
    );
    expect(screen.getByText(/Replays also support seeking/i)).toBeTruthy();
  });
});
