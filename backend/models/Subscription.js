const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema({
	user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
	plan: { type: String },
	status: { type: String, default: 'active' },
	startedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Subscription', SubscriptionSchema);
