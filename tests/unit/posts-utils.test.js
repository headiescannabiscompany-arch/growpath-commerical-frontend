import { describe, it, expect } from "@jest/globals";
import {
  applyLikeMetadata,
  normalizePostList,
  userHasLiked
} from "../../src/utils/posts.js";

describe("post utility helpers", () => {
  it("normalizePostList unwraps supported payload shapes", () => {
    const direct = [{ _id: "1" }];
    expect(normalizePostList(direct)).toBe(direct);

    const withData = normalizePostList({ data: [{ _id: "2" }] });
    expect(withData).toEqual([{ _id: "2" }]);

    const withPosts = normalizePostList({ posts: [{ _id: "3" }] });
    expect(withPosts).toEqual([{ _id: "3" }]);

    expect(normalizePostList({})).toEqual([]);
  });

  it("userHasLiked handles string ids and populated docs", () => {
    const userId = "user-1";
    const post = {
      likes: [
        { _id: "user-0" },
        "user-1",
        {
          toString() {
            return "user-2";
          }
        }
      ]
    };

    expect(userHasLiked(post, userId)).toBe(true);
    expect(userHasLiked(post, "missing")).toBe(false);
  });

  it("applyLikeMetadata adds/removes the current user", () => {
    const basePost = { _id: "p1", likeCount: 2, likes: ["one", "two"] };
    const liked = applyLikeMetadata(basePost, "three", undefined, true);
    expect(liked.likeCount).toBe(3);
    expect(liked.likes.includes("three")).toBe(true);

    const unliked = applyLikeMetadata(liked, "three", 1, false);
    expect(unliked.likeCount).toBe(1);
    expect(unliked.likes.includes("three")).toBe(false);
  });
});
