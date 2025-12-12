const express = require("express");
const router = express.Router();
const stripe = require("../config/stripe");
const User = require("../models/User");
const auth = require("../middleware/auth");

router.post("/create-checkout-session", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

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

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: process.env.PRICE_ID,
          quantity: 1
        }
      ],
      success_url: `https://yourapp.com/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://yourapp.com/cancel`
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
