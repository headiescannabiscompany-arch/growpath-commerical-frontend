const express = require("express");
const router = express.Router();
// const auth = require("../middleware/auth");
// const CommercialPost = require("../models/CommercialPost"); // Uncomment for real DB

// GET /api/commercial/posts/:id
router.get(
  "/posts/:id",
  /*auth,*/ async (req, res) => {
    const id = req.params.id;

    // Stub mode: use global.mockCommercialPosts
    if (global.mockCommercialPosts) {
      const post = global.mockCommercialPosts.find((p) => p._id === id || p.id === id);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      return res.json({ success: true, post });
    }

    // Real DB mode (uncomment and adjust as needed)
    /*
    try {
      const post = await CommercialPost.findById(id)
        .populate("author", "displayName email role plan subscriptionStatus");
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      return res.json({
        success: true,
        post: {
          id: String(post._id),
          author: post.author
            ? {
                id: String(post.author._id),
                displayName: post.author.displayName || "",
                email: post.author.email || "",
                role: post.author.role || "user",
                plan: post.author.plan ?? null,
                subscriptionStatus: post.author.subscriptionStatus ?? null,
              }
            : null,
          type: post.type,
          title: post.title,
          body: post.body,
          tags: post.tags || [],
          location: post.location || "",
          likeCount: post.likeCount || 0,
          commentCount: post.commentCount || 0,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
        },
      });
    } catch (err) {
      return res.status(500).json({ message: "Failed to load post" });
    }
    */
  }
);

module.exports = router;
