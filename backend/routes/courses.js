const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Review = require('../models/Review');
const CourseQuestion = require('../models/CourseQuestion');
const CourseAnswer = require('../models/CourseAnswer');
const Certificate = require('../models/Certificate');
const auth = require('../middleware/auth');
const authOptional = require('../middleware/authOptional');
const stripe = require('../config/stripe');
const { v4: uuidv4 } = require('uuid');
const generateCertificatePDF = require('../utils/generateCertificatePDF');

const PLATFORM_FEE_PERCENT = 20;
const subcategories = require('../config/subcategories');
const recommendCourses = require('../utils/recommendEngine');

// PUBLIC: Get all published courses
router.get('/', authOptional, async (req, res) => {
	try {
		const courses = await Course.find({ isPublished: true })
			.sort({ createdAt: -1 })
			.populate('creator', 'username avatar');

		res.json(courses);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Get all courses for current creator
router.get('/mine', auth, async (req, res) => {
	try {
		const courses = await Course.find({ creator: req.userId }).sort({ createdAt: -1 });
		res.json(courses);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Get single course + its lessons
router.get('/:id', authOptional, async (req, res) => {
	try {
		const course = await Course.findById(req.params.id).populate('creator', 'username avatar');
		if (!course) return res.status(404).json({ message: 'Course not found' });

		const lessons = await Lesson.find({ course: course._id }).sort({ order: 1 });

		let enrollment = null;
		if (req.userId) {
			enrollment = await Enrollment.findOne({
				user: req.userId,
				course: course._id,
			});
		}

		// Track view events to preferences when authenticated
		if (req.userId) {
			try {
				await User.findByIdAndUpdate(req.userId, {
					$addToSet: {
						"preferences.viewedCourses": course._id.toString(),
						"preferences.viewedCategories": course.category,
						"preferences.preferredTags": { $each: course.tags || [] },
					},
				});
			} catch (prefErr) {
				console.log('Pref tracking error:', prefErr.message);
			}
		}

		res.json({ course, lessons, enrollment });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Create course (creator)
router.post('/', auth, async (req, res) => {
	try {
		const { title, description, contentUrl, priceCents, coverImage } = req.body;
		const course = await Course.create({
			title,
			description,
			contentUrl,
			priceCents: priceCents || 0,
			coverImage,
			creator: req.userId
		});
		await course.populate('creator', 'name');
		res.json(course);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Enroll user in a course (free or stubbed paid)
router.post('/:id/enroll', auth, async (req, res) => {
	try {
		const course = await Course.findById(req.params.id);
		if (!course) return res.status(404).json({ message: 'Course not found' });

		// check if already enrolled
		const existing = await Enrollment.findOne({
			user: req.userId,
			course: course._id,
		});

		if (existing) return res.json(existing);

		// for now: free enrollment OR payment stub
		const enroll = await Enrollment.create({
			user: req.userId,
			course: course._id,
			paid: course.price === 0,
			pricePaid: course.price === 0 ? 0 : null,
			transactionId: null,
		});

		// add student to course
		if (!course.students.includes(req.userId)) {
			course.students.push(req.userId);
			await course.save();
		}

		// Track enrollment in preferences
		try {
			await User.findByIdAndUpdate(req.userId, {
				$addToSet: { "preferences.enrolledCourses": course._id.toString() },
			});
		} catch (prefErr) {
			console.log('Pref enroll error:', prefErr.message);
		}

		res.json(enroll);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Check enrollment status
router.get('/:id/enrollment-status', auth, async (req, res) => {
	try {
		const enroll = await Enrollment.findOne({
			user: req.userId,
			course: req.params.id,
		});

		res.json({ enrolled: !!enroll });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Buy paid course (Stripe)
router.post('/:id/buy', auth, async (req, res) => {
	try {
		const course = await Course.findById(req.params.id).populate('creator');
		if (!course) return res.status(404).json({ message: 'Course not found' });

		if (course.priceCents === 0) {
			return res.status(400).json({ message: 'This course is free. Use /enroll endpoint.' });
		}

		const user = await User.findById(req.userId);

		let customerId = user.stripeCustomerId;
		if (!customerId) {
			const customer = await stripe.customers.create({
				email: user.email,
				name: user.name
			});
			user.stripeCustomerId = customer.id;
			await user.save();
			customerId = customer.id;
		}

		const feeAmount = Math.round(course.priceCents * (PLATFORM_FEE_PERCENT / 100));

		const session = await stripe.checkout.sessions.create({
			mode: 'payment',
			customer: customerId,
			line_items: [
				{
					price_data: {
						currency: 'usd',
						product_data: {
							name: course.title,
							description: course.description
						},
						unit_amount: course.priceCents
					},
					quantity: 1
				}
			],
			metadata: {
				courseId: course._id.toString(),
				type: 'course_purchase'
			},
			payment_intent_data: {
				application_fee_amount: feeAmount
			},
			success_url: `https://yourapp.com/course-success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `https://yourapp.com/course-cancel`
		});

		res.json({ url: session.url });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

	// CREATE COURSE (alternate /create)
	router.post('/create', auth, async (req, res) => {
		try {
			const { title, description, category, coverImage, price, priceCents } = req.body;

			const course = await Course.create({
				creator: req.userId,
				title,
				description,
				category,
				coverImage,
				price: price ?? priceCents ?? 0,
				isPublished: false
			});

			res.json(course);
		} catch (err) {
			res.status(500).json({ message: err.message });
		}
	});

	// ADD LESSON
	router.post('/:id/lesson', auth, async (req, res) => {
		try {
			const { title, content, videoUrl, pdfUrl, order } = req.body;

			const course = await Course.findById(req.params.id);
			if (!course) return res.status(404).json({ message: 'Course not found' });

			if (course.creator.toString() !== req.userId)
				return res.status(403).json({ message: 'Not allowed' });

			const lesson = await Lesson.create({
				course: course._id,
				title,
				content,
				videoUrl,
				pdfUrl,
				order
			});

			res.json(lesson);
		} catch (err) {
			res.status(500).json({ message: err.message });
		}
	});

	// EDIT COURSE
	router.put('/:id', auth, async (req, res) => {
		try {
			const updates = req.body;

			const course = await Course.findById(req.params.id);
			if (!course) return res.status(404).json({ message: 'Course not found' });

			if (course.creator.toString() !== req.userId)
				return res.status(403).json({ message: 'Not allowed' });

			Object.assign(course, updates);
			await course.save();

			res.json(course);
		} catch (err) {
			res.status(500).json({ message: err.message });
		}
	});

	// EDIT LESSON
	router.put('/lesson/:lessonId', auth, async (req, res) => {
		try {
			const lesson = await Lesson.findById(req.params.lessonId);
			if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

			const course = await Course.findById(lesson.course);
			if (course.creator.toString() !== req.userId)
				return res.status(403).json({ message: 'Not allowed' });

			Object.assign(lesson, req.body);
			await lesson.save();

			res.json(lesson);
		} catch (err) {
			res.status(500).json({ message: err.message });
		}
	});

	// DELETE LESSON
	router.delete('/lesson/:lessonId', auth, async (req, res) => {
		try {
			const lesson = await Lesson.findById(req.params.lessonId);
			if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

			const course = await Course.findById(lesson.course);
			if (course.creator.toString() !== req.userId)
				return res.status(403).json({ message: 'Not allowed' });

			await lesson.deleteOne();
			res.json({ message: 'Lesson deleted' });
		} catch (err) {
			res.status(500).json({ message: err.message });
		}
	});

	// PUBLISH COURSE
	router.put('/:id/publish', auth, async (req, res) => {
		try {
			const course = await Course.findById(req.params.id);
			if (!course) return res.status(404).json({ message: 'Course not found' });

			if (course.creator.toString() !== req.userId)
				return res.status(403).json({ message: 'Not allowed' });

			course.isPublished = true;
			await course.save();

			res.json({ published: true });
		} catch (err) {
			res.status(500).json({ message: err.message });
		}
	});

// Mark lesson as complete
router.post('/lesson/:lessonId/complete', auth, async (req, res) => {
	try {
		const { lessonId } = req.params;
		const { courseId } = req.body;

		const enrollment = await Enrollment.findOne({
			user: req.userId,
			course: courseId,
		});

		if (!enrollment)
			return res.status(403).json({ message: 'Not enrolled' });

		if (!enrollment.completedLessons.includes(lessonId)) {
			enrollment.completedLessons.push(lessonId);
		}

		enrollment.lastLessonId = lessonId;
		await enrollment.save();

		// Track analytics
		const lesson = await Lesson.findById(lessonId);
		if (lesson) {
			lesson.analytics.completedCount += 1;
			await lesson.save();
		}

		// CHECK IF COURSE IS 100% COMPLETE
		const totalLessons = await Lesson.countDocuments({ course: courseId });
		const completedCount = enrollment.completedLessons.length;

		if (completedCount === totalLessons) {
			const existing = await Certificate.findOne({
				user: req.userId,
				course: courseId,
			});

			if (!existing) {
				try {
					const course = await Course.findById(courseId).populate('creator');
					const user = await User.findById(req.userId);

					const certificateId = uuidv4();
					const pdfPath = `./certificates/${certificateId}.pdf`;
					const verificationUrl = `${process.env.APP_URL || 'http://localhost:5000'}/verify/${certificateId}`;

					await generateCertificatePDF({
						studentName: user.fullName || user.username,
						courseTitle: course.title,
						creatorName: course.creator.username,
						creatorSignatureUrl: course.creator.signatureUrl,
						certificateId,
						completionDate: new Date().toLocaleDateString(),
						outputPath: pdfPath,
						verificationUrl,
						watermarkPath: './assets/watermark_leaf.png',
					});

					await Certificate.create({
						user: req.userId,
						course: courseId,
						certificateId,
						pdfUrl: pdfPath,
						completedAt: new Date(),
					});
				} catch (certErr) {
					console.log('Certificate generation error:', certErr.message);
					// Don't fail the lesson completion if certificate fails
				}
			}
		}

		// Track completion in preferences
		try {
			await User.findByIdAndUpdate(req.userId, {
				$addToSet: { "preferences.completedCourses": courseId },
			});
		} catch (prefErr) {
			console.log('Pref completion error:', prefErr.message);
		}

		res.json({
			completed: enrollment.completedLessons,
			lastLessonId: enrollment.lastLessonId,
			courseComplete: completedCount === totalLessons,
		});
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Create or update a review (student can only review once)
router.post('/:id/review', auth, async (req, res) => {
	try {
		const { rating, text } = req.body;
		const courseId = req.params.id;

		const course = await Course.findById(courseId);
		if (!course) return res.status(404).json({ message: 'Course not found' });

		// Must be enrolled
		const enroll = await Enrollment.findOne({ user: req.userId, course: courseId });
		if (!enroll) return res.status(403).json({ message: 'You must enroll to review' });

		// Check if review already exists
		let review = await Review.findOne({ user: req.userId, course: courseId });

		if (review) {
			// Update review
			review.rating = rating;
			review.text = text;
			await review.save();
		} else {
			// Create new review
			review = await Review.create({
				course: courseId,
				user: req.userId,
				rating,
				text,
			});

			// Update course summary numbers
			course.ratingCount += 1;
		}

		// Recalculate average
		const allReviews = await Review.find({ course: courseId });
		const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

		course.rating = avg;
		await course.save();

		res.json(review);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Get all reviews for a course
router.get('/:id/reviews', async (req, res) => {
	try {
		const reviews = await Review.find({ course: req.params.id })
			.populate('user', 'username avatar')
			.sort({ createdAt: -1 });

		res.json(reviews);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Delete a review
router.delete('/:id/review', auth, async (req, res) => {
	try {
		const courseId = req.params.id;

		const review = await Review.findOne({ course: courseId, user: req.userId });
		if (!review) return res.status(404).json({ message: 'Review not found' });

		await review.deleteOne();

		// Recalculate course stats
		const remaining = await Review.find({ course: courseId });
		const newCount = remaining.length;
		const newRating =
			newCount === 0
				? 0
				: remaining.reduce((sum, r) => sum + r.rating, 0) / newCount;

		await Course.findByIdAndUpdate(courseId, {
			rating: newRating,
			ratingCount: newCount,
		});

		res.json({ message: 'Review deleted' });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Get all questions (with answers)
router.get('/:courseId/questions', async (req, res) => {
	try {
		const questions = await CourseQuestion.find({ course: req.params.courseId })
			.populate('user', 'username avatar')
			.sort({ createdAt: -1 });

		const answers = await CourseAnswer.find({
			question: { $in: questions.map((q) => q._id) }
		})
			.populate('user', 'username avatar')
			.sort({ createdAt: 1 });

		// attach answers to each question
		const structured = questions.map((q) => ({
			...q._doc,
			answers: answers.filter((a) => a.question._id.toString() === q._id.toString()),
		}));

		res.json(structured);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Ask a question (only enrolled students)
router.post('/:courseId/questions', auth, async (req, res) => {
	try {
		const { text } = req.body;

		const enroll = await Enrollment.findOne({
			user: req.userId,
			course: req.params.courseId,
		});

		if (!enroll)
			return res.status(403).json({ message: 'Enroll to ask questions.' });

		const question = await CourseQuestion.create({
			course: req.params.courseId,
			user: req.userId,
			text,
		});

		res.json(question);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Answer a question
router.post('/:courseId/questions/:questionId/answer', auth, async (req, res) => {
	try {
		const { text } = req.body;

		const answer = await CourseAnswer.create({
			question: req.params.questionId,
			user: req.userId,
			text,
		});

		res.json(answer);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Delete a question (owner or creator)
router.delete('/:courseId/questions/:questionId', auth, async (req, res) => {
	try {
		const q = await CourseQuestion.findById(req.params.questionId);
		if (!q) return res.status(404).json({ message: 'Not found' });

		const course = await Course.findById(q.course);

		// question owner OR course creator
		if (q.user.toString() !== req.userId && course.creator.toString() !== req.userId)
			return res.status(403).json({ message: 'Not allowed' });

		await q.deleteOne();
		res.json({ deleted: true });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Delete an answer
router.delete('/:courseId/answers/:answerId', auth, async (req, res) => {
	try {
		const a = await CourseAnswer.findById(req.params.answerId);
		if (!a) return res.status(404).json({ message: 'Not found' });

		const question = await CourseQuestion.findById(a.question);
		const course = await Course.findById(question.course);

		if (
			a.user.toString() !== req.userId &&
			course.creator.toString() !== req.userId
		)
			return res.status(403).json({ message: 'Not allowed' });

		await a.deleteOne();
		res.json({ deleted: true });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Get recommended courses (weighted scoring system)
router.get('/:id/recommendations', async (req, res) => {
	try {
		const courseId = req.params.id;

		const course = await Course.findById(courseId);
		if (!course) return res.status(404).json({ message: 'Course not found' });

		// Get all other published courses
		const all = await Course.find({
			_id: { $ne: courseId },
			isPublished: true,
		}).populate('creator', 'username avatar');

		// Scoring system
		const recommendations = all
			.map((c) => {
				let score = 0;

				// 1. Category match (strongest signal)
				if (c.category === course.category) score += 40;

				// 2. Same creator
				if (c.creator._id.toString() === course.creator.toString()) score += 20;

				// 3. High rating boosts visibility
				score += c.rating * 4;

				// 4. Popular courses get boosted
				score += c.ratingCount * 1.5;

				return { course: c, score };
			})
			.sort((a, b) => b.score - a.score)
			.slice(0, 6); // top 6 recommended

		res.json(recommendations.map((r) => r.course));
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// GET user's certificates
router.get('/user/certificates', auth, async (req, res) => {
	try {
		const certificates = await Certificate.find({ user: req.userId })
			.populate('course', 'title')
			.sort({ completedAt: -1 });

		res.json(certificates);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// GET certificate by ID (public verification)
router.get('/verify/:certificateId', async (req, res) => {
	try {
		const { certificateId } = req.params;
		const certificate = await Certificate.findOne({ certificateId })
			.populate('user', 'fullName username')
			.populate('course', 'title');

		if (!certificate) {
			return res.status(404).json({ message: 'Certificate not found' });
		}

		res.json({
			valid: true,
			student: certificate.user.fullName || certificate.user.username,
			course: certificate.course.title,
			completedAt: certificate.completedAt,
			certificateId: certificate.certificateId,
		});
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Track lesson view
router.post('/lessons/:lessonId/view', auth, async (req, res) => {
	try {
		const { lessonId } = req.params;

		const lesson = await Lesson.findById(lessonId);
		if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

		// Track unique views using enrollment
		const enrollment = await Enrollment.findOne({
			user: req.userId,
			course: lesson.course,
		});

		if (!enrollment) {
			return res.status(403).json({ message: 'Not enrolled' });
		}

		if (!enrollment.viewedLessons) enrollment.viewedLessons = [];

		lesson.analytics.views += 1;

		if (!enrollment.viewedLessons.includes(lessonId)) {
			lesson.analytics.uniqueViews += 1;
			enrollment.viewedLessons.push(lessonId);
			await enrollment.save();
		}

		await lesson.save();
		res.json({ success: true });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Track video watch time
router.post('/lessons/:lessonId/watch', auth, async (req, res) => {
	try {
		const { seconds } = req.body;
		const { lessonId } = req.params;

		const lesson = await Lesson.findById(lessonId);
		if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

		lesson.analytics.totalWatchTime += seconds;
		await lesson.save();

		res.json({ success: true });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Track dropoff point
router.post('/lessons/:lessonId/dropoff', auth, async (req, res) => {
	try {
		const { seconds } = req.body;
		const lesson = await Lesson.findById(req.params.lessonId);

		if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

		lesson.analytics.dropoffPoints.push(seconds);
		await lesson.save();

		res.json({ success: true });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// SEARCH: Fuzzy search by title, description, category, tags
router.get('/search', async (req, res) => {
	try {
		const { q } = req.query;

		if (!q) {
			const all = await Course.find({ isPublished: true }).populate('creator', 'username avatar');
			return res.json(all);
		}

		const regex = new RegExp(q, 'i'); // case-insensitive fuzzy

		const results = await Course.find({
			isPublished: true,
			$or: [
				{ title: regex },
				{ description: regex },
				{ category: regex },
				{ tags: regex },
			],
		}).populate('creator', 'username avatar');

		res.json(results);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// FILTER: Filter courses by category, difficulty, price, rating
router.get('/filter', async (req, res) => {
	try {
		const {
			category,
			difficulty,
			minPrice,
			maxPrice,
			minRating,
			sort,
		} = req.query;

		let query = { isPublished: true };

		if (category) query.category = category;
		if (difficulty) query.difficulty = difficulty;
		if (minPrice) query.price = { $gte: Number(minPrice) };
		if (maxPrice) query.price = { ...(query.price || {}), $lte: Number(maxPrice) };
		if (minRating) query.rating = { $gte: Number(minRating) };

		let results = Course.find(query).populate('creator', 'username avatar');

		if (sort === 'rating') results = results.sort({ rating: -1 });
		if (sort === 'students') results = results.sort({ students: -1 });
		if (sort === 'newest') results = results.sort({ createdAt: -1 });

		results = await results;
		res.json(results);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// LIST: Paginated/infinite scroll course list
router.get('/list', async (req, res) => {
	try {
		const page = Number(req.query.page || 1);
		const limit = 12;
		const skip = (page - 1) * limit;

		const courses = await Course.find({ isPublished: true })
			.skip(skip)
			.limit(limit)
			.populate('creator', 'username avatar');

		const total = await Course.countDocuments({ isPublished: true });

		res.json({
			courses,
			total,
			hasMore: page * limit < total,
		});
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// CATEGORIES: Get all distinct categories
router.get('/categories', async (req, res) => {
	try {
		const categories = await Course.distinct('category', { isPublished: true });

		const mapped = categories.map((cat) => ({
			name: cat,
			banner: `/category_banners/${String(cat || '').toLowerCase().replace(/\s+/g, '_')}.jpg`,
		}));

		res.json(mapped);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// CATEGORY: Get courses by category
router.get('/category/:category', async (req, res) => {
	try {
		const courses = await Course.find({
			category: req.params.category,
			isPublished: true,
		})
			.sort({ createdAt: -1 })
			.populate('creator', 'username avatar');

		res.json(courses);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Personalized recommendations
router.get('/recommended', auth, async (req, res) => {
	try {
		const list = await recommendCourses(req.userId);
		res.json(list);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// SUBCATEGORIES: Get subcategories for a category
router.get('/subcategories/:category', async (req, res) => {
	try {
		const category = req.params.category;
		const subs = subcategories[category] || [];
		res.json(subs);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// TRENDING TAGS: Simple aggregation on tags + ratingCount
router.get('/trending-tags', async (req, res) => {
	try {
		const trending = await Course.aggregate([
			{ $match: { isPublished: true } },
			{ $unwind: '$tags' },
			{
				$group: {
					_id: '$tags',
					score: { $sum: { $add: ['$ratingCount', { $size: { $ifNull: ['$students', []] } }] } },
				},
			},
			{ $sort: { score: -1 } },
			{ $limit: 10 },
		]);

		res.json(trending.map((t) => t._id));
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

module.exports = router;

