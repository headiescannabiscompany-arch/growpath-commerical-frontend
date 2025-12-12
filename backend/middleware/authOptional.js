const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

module.exports = function (req, res, next) {
	const authHeader = req.headers.authorization || '';
	const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

	if (token) {
		try {
			const decoded = jwt.verify(token, process.env.JWT_SECRET || 'change_this_secret');
			req.user = decoded.user || decoded;
			req.userId = req.user?.id || req.user?._id;
		} catch (err) {
			console.log('Invalid token:', err.message);
		}
	}

	next();
};
