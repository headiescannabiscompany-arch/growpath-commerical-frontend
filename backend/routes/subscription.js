const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Get current user's subscription info
router.get('/me', auth, async (req, res) => {
	try {
		const user = await User.findById(req.userId);
		if (!user) return res.status(404).json({ message: 'User not found' });

		res.json({
			plan: user.plan || 'free',
			subscriptionStatus: user.subscriptionStatus || 'inactive',
			source: user.subscriptionSource // 'iap', 'stripe', etc.
		});
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

module.exports = router;
