const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Grow = require('../models/Grow');

// Create grow
router.post('/', auth, async (req, res) => {
	try {
		const grow = new Grow({ ...req.body, user: req.user.id });
		await grow.save();
		res.json(grow);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// List grows
router.get('/', async (req, res) => {
	try {
		const items = await Grow.find().populate('user', 'name email').sort({ createdAt: -1 });
		res.json(items);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

module.exports = router;
