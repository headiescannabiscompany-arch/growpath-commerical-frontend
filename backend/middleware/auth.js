const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

module.exports = async function (req, res, next) {
	const authHeader = req.headers.authorization || '';
	const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
	if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change_this_secret');
		const userId = decoded.userId || decoded.id || (decoded.user && decoded.user.id);
		
		const user = await User.findById(userId);
		if (!user) return res.status(401).json({ message: 'User not found' });

		req.userId = user._id.toString();
		req.user = user;
		next();
	} catch (err) {
		res.status(401).json({ message: 'Token is not valid' });
	}
};
