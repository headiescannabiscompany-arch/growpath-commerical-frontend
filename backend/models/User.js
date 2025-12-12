const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
	name: { type: String, required: true },
	email: { type: String, required: true, unique: true },
	password: { type: String, required: true },
	role: { type: String, default: 'user' },
	plan: { type: String, default: 'free' },
	pushToken: { type: String },
	stripeCustomerId: { type: String },
	stripeSubscriptionId: { type: String },
	stripeConnectId: { type: String },
	stripeAccountId: { type: String },
	subscriptionStatus: {
		type: String,
		enum: ["free", "trial", "active", "expired"],
		default: "free",
	},
	subscriptionExpiry: {
		type: Date,
		default: null,
	},
	trialUsed: {
		type: Boolean,
		default: false,
	},
	subscriptionSource: { type: String }, // 'iap', 'stripe', etc.
	avatar: { type: String, default: "" },
	banner: { type: String, default: "" },
	bio: { type: String, default: "" },

	preferences: {
		viewedCategories: [String],
		viewedCourses: [String],
		enrolledCourses: [String],
		completedCourses: [String],
		preferredTags: [String],
		growStyle: String,
	},

	followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
	following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

	savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
	createdAt: { type: Date, default: Date.now }
});

UserSchema.virtual("isPro").get(function () {
	const now = new Date();
	if (
		this.subscriptionStatus === "active" ||
		this.subscriptionStatus === "trial"
	) {
		if (!this.subscriptionExpiry) return true;
		return this.subscriptionExpiry > now;
	}
	return false;
});

UserSchema.set("toJSON", { virtuals: true });
UserSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model('User', UserSchema);
