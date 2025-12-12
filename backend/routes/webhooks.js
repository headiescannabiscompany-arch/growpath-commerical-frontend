const express = require("express");
const router = express.Router();
const stripe = require("../config/stripe");
const User = require("../models/User");
const Course = require("../models/Course");

router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    switch (event.type) {
      case "checkout.session.completed":
        const session = event.data.object;
        const customerId = session.customer;
        const user = await User.findOne({ stripeCustomerId: customerId });

        if (!user) break;

        // Handle subscription purchase
        if (session.mode === "subscription" || !session.metadata?.type) {
          user.plan = "pro";
          user.subscriptionStatus = "active";
          user.subscriptionSource = "stripe";
          user.stripeSubscriptionId = session.subscription;
          await user.save();
        }

        // Handle course purchase
        if (session.metadata?.type === "course_purchase" && session.metadata?.courseId) {
          const courseId = session.metadata.courseId;
          const course = await Course.findById(courseId);

          if (course && !course.students.includes(user._id)) {
            course.students.push(user._id);
            await course.save();
          }
        }
        break;

      case "customer.subscription.deleted":
        const sub = event.data.object;
        const u = await User.findOne({ stripeSubscriptionId: sub.id });

        if (u) {
          u.plan = "free";
          u.subscriptionStatus = "canceled";
          await u.save();
        }
        break;
    }

    res.json({ received: true });
  }
);

module.exports = router;
