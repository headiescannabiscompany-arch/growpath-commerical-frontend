import { describe, it } from "node:test";
import assert from "node:assert";
import {
  applyLikeMetadata,
  normalizePostList,
  userHasLiked
} from "../../src/utils/posts.js";

describe("post utility helpers", () => {
  it("normalizePostList unwraps supported payload shapes", () => {
    const direct = [{ _id: "1" }];
    assert.strictEqual(normalizePostList(direct), direct);

    const withData = normalizePostList({ data: [{ _id: "2" }] });
    assert.deepStrictEqual(withData, [{ _id: "2" }]);

    const withPosts = normalizePostList({ posts: [{ _id: "3" }] });
    assert.deepStrictEqual(withPosts, [{ _id: "3" }]);

    assert.deepStrictEqual(normalizePostList({}), []);
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

    assert.strictEqual(userHasLiked(post, userId), true);
    assert.strictEqual(userHasLiked(post, "missing"), false);
  });

  it("applyLikeMetadata adds/removes the current user", () => {
    const basePost = { _id: "p1", likeCount: 2, likes: ["one", "two"] };
    const liked = applyLikeMetadata(basePost, "three", undefined, true);
    assert.strictEqual(liked.likeCount, 3);
    assert.ok(liked.likes.includes("three"));

    const unliked = applyLikeMetadata(liked, "three", 1, false);
    assert.strictEqual(unliked.likeCount, 1);
    assert.ok(!unliked.likes.includes("three"));
  });
});
