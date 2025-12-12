module.exports = function proOnly(req, res, next) {
	const user = req.user;
	if (!user || !user.isPro) {
		return res.status(403).json({
			success: false,
			message: "PRO subscription required",
		});
	}
	next();
};
