const express = require("express");
const router = express.Router();
const stripe = require("../config/stripe");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const Earning = require("../models/Earning");

router.post("/checkout/:courseId", async (req, res) => {
  try {
    const { userId, successUrl, cancelUrl } = req.body;
    const course = await Course.findById(req.params.courseId).populate("creator");

    if (!course) return res.status(404).json({ message: "Course not found" });

    const platformFeePercent = process.env.PLATFORM_FEE_PERCENT || 20;
    const platformFee = Math.round(course.price * (platformFeePercent / 100)) * 100;

    const sessionConfig = {
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(course.price * 100),
            product_data: {
              name: course.title,
              description: course.description,
              images: course.coverImage ? [course.coverImage] : [],
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        courseId: course._id.toString(),
        userId,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    };

    // If creator has Stripe Connect account, add application fee and transfer
    if (course.creator.stripeAccountId) {
      sessionConfig.payment_intent_data = {
        application_fee_amount: platformFee,
        transfer_data: {
          destination: course.creator.stripeAccountId,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;