const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authOptional = require('../middleware/authOptional');
const ForumPost = require('../models/ForumPost');
const Comment = require('../models/Comment');
const User = require('../models/User');
const GrowLog = require('../models/GrowLog');
const { sendPushNotification } = require('../utils/push');

// CREATE POST V2
router.post('/create', auth, async (req, res) => {
	try {
		const { content, photos = [], tags = [], strain = "", growLogId = null } =
			req.body;

		const post = await ForumPost.create({
			user: req.userId,
			content,
			photos,
			tags,
			strain,
			growLogId,
			score: 1, // baseline
			lastInteraction: Date.now()
		});

		res.json(post);
	} catch (err) {
		console.error("Create post error:", err);
		res.status(500).json({ message: "Post creation failed" });
	}
});

// Create post (legacy endpoint)
router.post('/', auth, async (req, res) => {
	try {
		const vipOnlyFlag = req.body.vipOnly === 'true';
		const post = await ForumPost.create({
			author: req.userId,
			title: req.body.title,
			body: req.body.body,
			vipOnly: vipOnlyFlag
		});
		await post.populate('author', 'name');
		res.json(post);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Get posts
router.get('/', async (req, res) => {
	try {
		let posts = await ForumPost.find({ hidden: false })
			.sort({ createdAt: -1 })
			.populate('author', 'name');

		// Filter VIP posts for free users
		if (!global.user || global.user.plan !== 'pro') {
			posts = posts.filter((p) => !p.vipOnly);
		}

		res.json(posts);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Like post
router.post('/:postId/like', auth, async (req, res) => {
	try {
		const post = await ForumPost.findById(req.params.postId);
		if (!post) return res.status(404).json({ message: 'Post not found' });

		post.likes = (post.likes || 0) + 1;
		await post.save();

		// Send push to post owner
		const user = await User.findById(req.userId);
		const postOwner = await User.findById(post.author);

		if (postOwner && user) {
			sendPushNotification(postOwner.pushToken, {
				title: 'Your post got a like!',
				body: `${user.name} liked your grow update.`,
				data: { postId: post._id.toString() }
			});
		}

		res.json({ likes: post.likes });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Comment on post
router.post('/:postId/comments', auth, async (req, res) => {
	try {
		const { text } = req.body;
		const post = await ForumPost.findById(req.params.postId);
		if (!post) return res.status(404).json({ message: 'Post not found' });

		const user = await User.findById(req.userId);
		post.comments.push({ author: req.userId, text });
		await post.save();

		// Send push to post owner
		const postOwner = await User.findById(post.author);

		if (postOwner && user) {
			sendPushNotification(postOwner.pushToken, {
				title: 'New comment on your post!',
				body: `${user.name} commented: "${text}"`,
				data: { postId: post._id.toString() }
			});
		}

		await post.populate('comments.author', 'name');
		res.json(post);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// GET latest posts
router.get('/feed/latest', async (req, res) => {
	try {
		const posts = await ForumPost.find({ hidden: false })
			.sort({ createdAt: -1 })
			.limit(50)
			.populate('user', 'name avatar');

		// Filter VIP posts for free users
		const filtered = !global.user || global.user.plan !== 'pro'
			? posts.filter((p) => !p.vipOnly)
			: posts;

		res.json(filtered);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// GET trending posts
router.get('/feed/trending', async (req, res) => {
	try {
		const posts = await ForumPost.find({ hidden: false })
			.sort({ score: -1, lastInteraction: -1 })
			.limit(50)
			.populate('user', 'name avatar');

		// Filter VIP posts for free users
		const filtered = !global.user || global.user.plan !== 'pro'
			? posts.filter((p) => !p.vipOnly)
			: posts;

		res.json(filtered);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// GET posts from followed users
router.get('/feed/following', async (req, res) => {
	try {
		// Require auth for following feed
		if (!req.userId) {
			return res.status(401).json({ message: 'Unauthorized' });
		}

		const user = await User.findById(req.userId);

		const posts = await ForumPost.find({
			user: { $in: user.following || [] },
			hidden: false
		})
			.sort({ createdAt: -1 })
			.limit(50)
			.populate('user', 'name avatar');

		// Filter VIP posts for free users
		const filtered = !user || user.plan !== 'pro'
			? posts.filter((p) => !p.vipOnly)
			: posts;

		res.json(filtered);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// GET single post by ID
router.get('/:id', async (req, res) => {
	try {
		const post = await ForumPost.findById(req.params.id)
			.populate('user', 'username avatar');
		
		if (!post) {
			return res.status(404).json({ message: 'Post not found' });
		}

		res.json(post);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// ❤️ LIKE A POST
router.post('/like/:id', auth, async (req, res) => {
	try {
		const post = await ForumPost.findById(req.params.id);
		if (!post) return res.status(404).json({ message: 'Post not found' });

		if (!post.likes.includes(req.userId)) {
			post.likes.push(req.userId);
			post.score += 2;
			post.lastInteraction = Date.now();
		}

		await post.save();
		res.json({ likes: post.likes.length });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// 💔 UNLIKE A POST
router.post('/unlike/:id', auth, async (req, res) => {
	try {
		const post = await ForumPost.findById(req.params.id);
		if (!post) return res.status(404).json({ message: 'Post not found' });

		post.likes = post.likes.filter((u) => u.toString() !== req.userId);
		post.score -= 1;
		await post.save();

		res.json({ likes: post.likes.length });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// 💬 CREATE COMMENT
router.post('/:id/comment', auth, async (req, res) => {
	try {
		const { text, parentId } = req.body;

		const post = await ForumPost.findById(req.params.id);
		if (!post) return res.status(404).json({ message: 'Post not found' });

		const comment = await Comment.create({
			post: post._id,
			user: req.userId,
			text,
			parentId: parentId || null
		});

		post.commentCount += 1;
		post.score += 1;
		post.lastInteraction = Date.now();
		await post.save();

		const populated = await Comment.findById(comment._id)
			.populate('user', 'username avatar');

		res.json(populated);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// 💬 GET COMMENTS FOR A POST
router.get('/:id/comments', async (req, res) => {
	try {
		const comments = await Comment.find({ post: req.params.id })
			.sort({ createdAt: 1 })
			.populate('user', 'username avatar');

		res.json(comments);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// 🗑️ DELETE A COMMENT
router.delete('/comment/:commentId', auth, async (req, res) => {
	try {
		const c = await Comment.findById(req.params.commentId);
		if (!c) return res.status(404).json({ message: 'Comment not found' });

		// Only author can delete
		if (c.user.toString() !== req.userId)
			return res.status(403).json({ message: 'Not allowed' });

		await Comment.deleteOne({ _id: c._id });
		await ForumPost.findByIdAndUpdate(c.post, { $inc: { commentCount: -1 } });

		res.json({ message: 'Deleted' });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// 📌 SAVE/BOOKMARK POST
router.post('/save/:id', auth, async (req, res) => {
	try {
		const user = await User.findById(req.userId);
		if (!user.savedPosts.includes(req.params.id)) {
			user.savedPosts.push(req.params.id);
			await user.save();
		}
		res.json({ saved: true });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// 📌 UNSAVE POST
router.post('/unsave/:id', auth, async (req, res) => {
	try {
		const user = await User.findById(req.userId);
		user.savedPosts = user.savedPosts.filter(
			(p) => p.toString() !== req.params.id
		);
		await user.save();
		res.json({ saved: false });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// 🚩 REPORT POST
router.post('/report/:id', auth, async (req, res) => {
	try {
		console.log('Reported post:', req.params.id, 'by user:', req.userId);
		res.json({ message: 'Reported' });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// 📌 SAVE TO GROW LOG
router.post('/to-growlog/:id', auth, async (req, res) => {
	try {
		const post = await ForumPost.findById(req.params.id);
		if (!post) return res.status(404).json({ message: 'Post not found' });

		const newEntry = await GrowLog.create({
			user: req.userId,
			title: 'Imported from Forum',
			notes: post.content,
			photos: post.photos,
			tags: post.tags || [],
			strain: post.strain || ''
		});

		res.json(newEntry);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

module.exports = router;
