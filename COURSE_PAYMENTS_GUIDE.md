# Course Purchase & Creator Payments - How It Works

## Frontend Payment Authority

The frontend never grants course or subscription access from a local payment
success callback. Stripe Checkout, native in-app purchase callbacks, and free
trial requests only start or submit payment work.

Access is shown as unlocked only after the backend confirms status through the
course enrollment/payment endpoints, subscription status endpoints, or the
canonical `/api/auth/me` capability context after refresh.

Frontend payment screens should send users to a confirmation/status screen
after checkout or receipt submission. They must not mutate local capabilities,
plans, enrollments, or course access based on browser redirects or native IAP
purchase objects.

## 💰 Revenue Split: 70/30

When a user buys a course for $10:

- **Creator receives: $7.00 (70%)**
- **Platform (you) receive: $3.00 (30%)**

---

## 📊 How The System Works

### 1. User Buys Course

**Flow:**

```
User clicks "Buy Course" ($10)
↓
Stripe charges user's card
↓
Payment success
↓
Backend creates Enrollment
↓
Backend creates Earning record:
  - totalAmount: $10.00
  - creatorEarning: $7.00 (70%)
  - platformFee: $3.00 (30%)
  - paidOut: false
↓
User gets access to course
```

**Code Location:** `backend/routes/courses.js` (line 104+)

---

### 2. Creator Views Earnings

**Creator Dashboard Shows:**

- Total earned (all time)
- Total paid out
- Pending payout (not yet paid)
- Earnings by course
- Individual sales

**API Endpoint:** `GET /api/earnings/mine`

**Example Response:**

```json
{
  "earnings": [
    {
      "course": "Advanced Growing",
      "buyer": "john@example.com",
      "totalAmount": 10.0,
      "creatorEarning": 7.0,
      "paidOut": false,
      "createdAt": "2025-12-12"
    }
  ],
  "stats": {
    "totalEarned": "70.00",
    "totalPaidOut": "0.00",
    "pendingPayout": "70.00",
    "totalSales": 10
  }
}
```

---

### 3. Creator Requests Payout

**Requirements:**

- Minimum balance: **$50.00**
- Unpaid earnings only

**Flow:**

```
Creator clicks "Request Payout"
↓
System checks balance >= $50
↓
If yes:
  - Marks all unpaid earnings as "requested"
  - You get notification
  - You send money manually (PayPal/Venmo/Zelle)
  - Mark as paid
↓
If no:
  - Shows error: "Minimum payout is $50. Current: $XX.XX"
```

**API Endpoint:** `POST /api/earnings/request-payout`

---

### 4. YOU Pay Creator (Current System - Manual)

**Option A: Manual Payouts (Current)**

1. Creator requests payout ($70 pending)
2. You see request in admin panel or database
3. You send $70 via:
   - PayPal
   - Venmo
   - Zelle
   - Bank transfer
4. You mark as paid:
   ```javascript
   POST /api/admin/mark-paid/:creatorId
   ```
5. Creator sees updated balance

**Option B: Automated (Future - Stripe Connect)**

1. Creator connects their Stripe account
2. Stripe splits payments automatically
3. Creator gets paid directly
4. No manual work needed

---

## 🧪 Testing Course Purchases

### Test Scenario 1: Buy a Course

**Setup:**

1. Create test creator account
2. Creator creates course (price: $10)
3. Create test student account
4. Student buys course

**Expected:**

- Enrollment created
- Earning record created:
  - Total: $10
  - Creator gets: $7
  - Platform gets: $3
- Student can access course

### Test Scenario 2: Check Earnings

**As Creator:**

1. Log in as creator
2. Go to Creator Dashboard
3. Click "Earnings"

**Expected:**

- See all sales
- See total: $7.00
- See pending: $7.00
- See paid out: $0.00

### Test Scenario 3: Request Payout

**As Creator (with $70 earned):**

1. Click "Request Payout"
2. Select payment method

**Expected:**

- Success message
- Earnings marked as "payout requested"
- Admin gets notification

**As Creator (with $30 earned):**

1. Click "Request Payout"

**Expected:**

- Error: "Minimum payout is $50. Current balance: $30.00"

---

## Current Status

**Implemented contract:**

- Course and subscription access must come from backend-confirmed status.
- Enrollment, earning, refund, dispute, and payout state must be idempotent and
  webhook-authoritative where payment processors are involved.
- Frontend checkout or IAP success callbacks route to status/confirmation and
  then refresh backend state.

**Manual operations:**

- Actual payout to creator (you send via PayPal/etc)
- Marking payouts as complete

**Future enhancement:**

- Integrate Stripe Connect
- Automatic payouts
- No manual work

---

## 📝 Quick Reference

**Revenue Split:**

- $10 course → Creator: $7, You: $3
- $20 course → Creator: $14, You: $6
- $50 course → Creator: $35, You: $15

**Minimum Payout:** $50

**Payment Methods (Manual):**

- PayPal
- Venmo
- Zelle
- Bank Transfer

**Key Files:**

- `backend/routes/courses.js` - Purchase logic
- `backend/routes/earnings.js` - Earnings & payouts
- `backend/models/Earning.js` - Database schema
- `src/screens/CreatorDashboardV2.js` - Creator UI
- `src/screens/EarningsScreen.js` - Earnings view

---

## Next Steps

1. Keep frontend access gated by backend-confirmed enrollment and capability
   state.
2. Test course purchase, earnings dashboard, payout request, refund, and dispute
   flows in a payment-provider test environment.
3. Document the manual payout operating process before production launch.
4. Add Stripe Connect later if automatic payouts become required.
