const express = require("express");
const router = express.Router();

const User = require("../models/User");
const ForumPost = require("../models/ForumPost");

router.get("/", async (req, res) => {
  try {
    const q = req.query.q?.trim() || "";
    if (!q) return res.json({ users: [], posts: [], tags: [], strains: [] });

    // USER SEARCH
    const users = await User.find({
      name: { $regex: q, $options: "i" }
    })
      .limit(20)
      .select("name avatar followers");

    // POST CONTENT SEARCH
    const posts = await ForumPost.find({
      content: { $regex: q, $options: "i" }
    })
      .limit(20)
      .populate("user", "name avatar");

    // TAG SEARCH via aggregation on posts
    const tagsAgg = await ForumPost.aggregate([
      { $unwind: "$tags" },
      { $match: { tags: { $regex: q, $options: "i" } } },
      { $group: { _id: "$tags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
      { $project: { tag: "$_id", count: 1, _id: 0 } }
    ]);

    // STRAIN SEARCH (posts with strain matching)
    const strains = await ForumPost.aggregate([
      {
        $match: {
          strain: { $regex: q, $options: "i" }
        }
      },
      {
        $group: {
          _id: "$strain",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    res.json({ users, posts, tags: tagsAgg, strains });
  } catch (err) {
    console.error("Search Error:", err);
    res.status(500).json({ message: "Search failed" });
  }
});

module.exports = router;
