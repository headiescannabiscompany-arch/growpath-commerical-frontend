const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const proOnly = require("../middleware/proOnly");
const upload = require("../middleware/upload");
const Post = require("../models/Post");
const Comment = require("../models/Comment");

// CREATE POST
router.post("/", auth, proOnly, upload.array("photos", 6), async (req, res) => {
  try {
    const photos = (req.files || []).map((f) => `/uploads/posts/${f.filename}`);

    const post = await Post.create({
      user: req.userId,
      text: req.body.text,
      photos,
      plant: req.body.plantId || null,
    });

    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET FEED (pagination)
router.get("/feed", auth, async (req, res) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = 15;
    const skip = (page - 1) * limit;

    const posts = await Post.find({})
      .populate("user", "username avatar")
      .populate("plant", "name strain")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// TRENDING FEED
router.get("/trending", auth, async (req, res) => {
  try {
    const posts = await Post.find({})
      .populate("user", "username avatar")
      .sort({ score: -1 })
      .limit(20);

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// LIKE POST
router.post("/:id/like", auth, proOnly, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Not found" });

    if (!post.likes.map((id) => id.toString()).includes(req.userId)) {
      post.likes.push(req.userId);
      post.likeCount++;
      post.score += 2;
      await post.save();
    }

    res.json({ likeCount: post.likeCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UNLIKE POST
router.post("/:id/unlike", auth, proOnly, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Not found" });

    const before = post.likeCount;
    post.likes = post.likes.filter((id) => id.toString() !== req.userId);
    if (post.likeCount > 0) post.likeCount = post.likes.length;
    post.score = Math.max(0, post.score - 2);
    await post.save();

    res.json({ likeCount: post.likeCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// COMMENT
router.post("/:id/comment", auth, proOnly, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Not found" });

    const comment = await Comment.create({
      user: req.userId,
      post: req.params.id,
      text: req.body.text,
    });

    await Post.findByIdAndUpdate(req.params.id, {
      $push: { comments: comment._id },
      $inc: { score: 1 },
    });

    res.json(comment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET COMMENTS
router.get("/:id/comments", auth, async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.id })
      .populate("user", "username avatar")
      .sort({ createdAt: 1 });

    res.json(comments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
