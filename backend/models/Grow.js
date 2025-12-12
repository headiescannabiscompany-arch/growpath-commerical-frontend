const mongoose = require('mongoose');

const GrowSchema = new mongoose.Schema({
	title: { type: String, required: true },
	body: { type: String, required: true },
	user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
	createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Grow', GrowSchema);
