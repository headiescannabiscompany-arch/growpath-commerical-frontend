const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authOptional = require('../middleware/authOptional');
const User = require('../models/User');
const ForumPost = require('../models/ForumPost');
const GrowLog = require('../models/GrowLog');
const Certificate = require('../models/Certificate');
const stripe = require('../config/stripe');

// FOLLOW
router.post('/follow/:id', auth, async (req, res) => {
  try {
    const targetId = req.params.id;
    const userId = req.userId;

    if (targetId === userId) {
      return res.status(400).json({ message: 'You cannot follow yourself.' });
    }

    const user = await User.findById(userId);
    const target = await User.findById(targetId);

    if (!target) return res.status(404).json({ message: 'User not found' });

    if (!user.following.includes(targetId)) {
      user.following.push(targetId);
      target.followers.push(userId);

      await user.save();
      await target.save();
    }

    res.json({ following: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// FOLLOW (new implementation)
router.post('/:id/follow', auth, async (req, res) => {
  const userId = req.userId;
  const targetId = req.params.id;

  try {
    await User.findByIdAndUpdate(userId, {
      $addToSet: { following: targetId }
    });

    await User.findByIdAndUpdate(targetId, {
      $addToSet: { followers: userId }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UNFOLLOW
router.post('/unfollow/:id', auth, async (req, res) => {
  try {
    const targetId = req.params.id;
    const userId = req.userId;

    const user = await User.findById(userId);
    const target = await User.findById(targetId);

    if (!target) return res.status(404).json({ message: 'User not found' });

    user.following = user.following.filter((id) => id.toString() !== targetId);
    target.followers = target.followers.filter((id) => id.toString() !== userId);

    await user.save();
    await target.save();

    res.json({ following: false });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UNFOLLOW (new implementation)
router.post('/:id/unfollow', auth, async (req, res) => {
  const userId = req.userId;
  const targetId = req.params.id;

  try {
    await User.findByIdAndUpdate(userId, {
      $pull: { following: targetId }
    });

    await User.findByIdAndUpdate(targetId, {
      $pull: { followers: userId }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// CHECK IF FOLLOWING
router.get('/is-following/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const isFollowing = user.following.includes(req.params.id);
    res.json({ isFollowing });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET FOLLOWERS & FOLLOWING
router.get('/followers/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('followers', 'name avatar');
    res.json(user.followers || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/following/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('following', 'name avatar');
    res.json(user.following || []);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PROFILE
router.get('/profile/:id', authOptional, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('followers', 'name avatar')
      .populate('following', 'name avatar');

    if (!user) return res.status(404).json({ message: 'User not found' });

    const posts = await ForumPost.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const growlogs = await GrowLog.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ user, posts, growlogs });
  } catch (err) {
    res.status(500).json({ message: 'Error loading profile' });
  }
});

// Update avatar
router.post('/avatar', auth, async (req, res) => {
  try {
    const { avatar } = req.body;
    const user = await User.findById(req.userId);
    user.avatar = avatar;
    await user.save();
    res.json({ avatar });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update banner
router.post('/banner', auth, async (req, res) => {
  try {
    const { banner } = req.body;
    const user = await User.findById(req.userId);
    user.banner = banner;
    await user.save();
    res.json({ banner });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update bio
router.post('/bio', auth, async (req, res) => {
  try {
    const { bio } = req.body;
    const user = await User.findById(req.userId);
    user.bio = bio;
    await user.save();
    res.json({ bio });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Creator Stripe Connect onboarding
router.post('/creator/onboard', auth, async (req, res) => {
  try {
    const { refreshUrl, returnUrl } = req.body;
    
    const account = await stripe.accounts.create({
      type: 'express',
    });

    const link = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    const user = await User.findByIdAndUpdate(req.userId, {
      stripeAccountId: account.id,
    }, { new: true });

    res.json({ url: link.url, accountId: account.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET user's certificates
router.get('/certificates', auth, async (req, res) => {
  try {
    const certificates = await Certificate.find({ user: req.userId })
      .populate('course', 'title')
      .sort({ completedAt: -1 });

    res.json(certificates);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
