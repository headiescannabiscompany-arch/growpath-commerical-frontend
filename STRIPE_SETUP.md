# Stripe Payment Integration Setup

## ✅ Completed

- Backend Stripe package installed
- Checkout session endpoint created (`POST /api/subscription/create-checkout-session`)
- Webhook handler for subscription events (`POST /api/subscription/webhook`)
- User model includes Stripe fields (stripeCustomerId, stripeSubscriptionId)
- Frontend SubscriptionScreen wired to Stripe API
- Environment variables configured

## 🔧 Setup Steps

### 1. Get Stripe API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/register)
2. Sign up or log in
3. Navigate to Developers → API Keys
4. Copy your **Publishable key** (pk*test*...) and **Secret key** (sk*test*...)

### 2. Update Backend Environment Variables

Edit `backend/.env`:

```
STRIPE_SECRET_KEY=sk_test_YourActualSecretKeyHere
```

### 3. Set Up Stripe Webhook (for production)

1. Go to Developers → Webhooks in Stripe Dashboard
2. Click "Add endpoint"
3. Endpoint URL: `https://your-backend.com/api/subscription/webhook`
4. Select events: `checkout.session.completed`, `customer.subscription.deleted`
5. Copy the webhook secret and add to `.env`:

```
STRIPE_WEBHOOK_SECRET=whsec_YourWebhookSecretHere
```

### 4. Test Payment Flow

1. Start backend: `cd backend && npm start`
2. Start frontend: `npm start`
3. Log in to your account
4. Navigate to Subscription screen
5. Click "Subscribe Now"
6. Use Stripe test card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any 5 digits (e.g., 12345)

## 📋 What Happens

1. User clicks "Subscribe Now"
2. Frontend calls `/api/subscription/create-checkout-session`
3. Backend creates Stripe Checkout Session
4. User is redirected to Stripe's hosted payment page
5. User enters card details and pays
6. Stripe redirects back to app with `?subscription=success`
7. Stripe webhook notifies backend
8. Backend updates user: `plan: 'pro', subscriptionStatus: 'active'`

## 🎯 Current State

- ✅ Stripe integration code complete
- ⚠️ Need to add real Stripe API keys to backend/.env
- ⚠️ Testing with test cards will work once keys are added

## 💡 Test Cards (Stripe)

- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **3D Secure**: 4000 0025 0000 3155

## Next: Course Creation Form

Once Stripe keys are added and tested, proceed to course creation system.
