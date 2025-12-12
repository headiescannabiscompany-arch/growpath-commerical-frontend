const express = require("express");
const router = express.Router();
const stripe = require("../config/stripe");
const bodyParser = require("body-parser");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const Earning = require("../models/Earning");

router.post(
  "/",
  bodyParser.raw({ type: "application/json" }),
  async (req, res) => {
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"],
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      try {
        const session = event.data.object;
        const { courseId, userId } = session.metadata;

        const course = await Course.findById(courseId);

        // Mark enrollment as paid
        const enroll = await Enrollment.findOneAndUpdate(
          { user: userId, course: courseId },
          {
            paid: true,
            pricePaid: course.price,
            transactionId: session.payment_intent,
          },
          { new: true, upsert: true }
        );

        // Calculate revenue share
        const platformFeePercent = process.env.PLATFORM_FEE_PERCENT || 20;
        const platformFee = Math.round(course.price * (platformFeePercent / 100));
        const creatorAmount = course.price - platformFee;

        await Earning.create({
          creator: course.creator,
          enrollment: enroll._id,
          amount: creatorAmount,
          platformFee,
        });
      } catch (err) {
        console.error("Error processing checkout session:", err);
      }
    }

    res.json({ received: true });
  }
);

module.exports = router;