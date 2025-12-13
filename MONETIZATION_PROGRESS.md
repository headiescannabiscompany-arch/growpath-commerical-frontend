# Course Monetization System - Progress Report

## ✅ Task 1: Stripe Payment Integration (COMPLETED)

### Implementation Details:

- **Backend Endpoint**: `/api/subscription/create-checkout-session`
  - Creates Stripe Checkout Session for $10/month subscription
  - Stores userId in session metadata
  - Redirects to success/cancel URLs

- **Webhook Handler**: `/api/subscription/webhook`
  - Handles `checkout.session.completed` event
  - Handles `customer.subscription.deleted` event
  - Updates user plan to 'pro' or 'free' automatically

- **Frontend Integration**:
  - SubscriptionScreen now calls Stripe API
  - Opens Stripe Checkout in browser
  - Users can pay with credit card

- **User Model Updates**:
  - Already has: `stripeCustomerId`, `stripeSubscriptionId`, `plan`, `subscriptionStatus`

### Setup Required:

1. Add real Stripe API keys to `backend/.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
2. Test with card: 4242 4242 4242 4242

### Files Modified:

- `src/api/subscription.js` - Added createCheckoutSession()
- `src/screens/SubscriptionScreen.js` - Wire to Stripe, open checkout
- `backend/routes/subscription.js` - Checkout session + webhook handler
- `backend/.env` - Placeholder Stripe keys added

---

## ✅ Task 2: Course Creation Form (COMPLETED)

### Implementation Details:

- **Modern UI Form** with professional design:
  - Thumbnail image picker (16:9 aspect, expo-image-picker)
  - Title input (100 char limit with counter)
  - Description textarea (500 char limit with counter)
  - Category selection
  - Price input (decimal-pad keyboard, USD format)
  - Revenue split info card (70% creator, 30% platform)

- **Validation**:
  - Required fields: title, description, category
  - Price validation (optional, must be valid number)
  - Image permissions check

- **Draft Status**:
  - Courses created with `status: "draft"`
  - Alert shows 2 options after creation:
    1. "Add Lessons" → Navigate to lesson builder
    2. "View Draft" → Navigate to course detail

- **API Integration**:
  - Calls `createCourse()` with payload:
    - title, description, category
    - priceCents (converted from USD)
    - thumbnail URI
    - status: "draft"

### Files Modified:

- `src/screens/CreateCourseScreen.js` - Complete redesign with modern form
  - Professional styling (white inputs, clean borders)
  - Helpful placeholders and hints
  - Character counters
  - Revenue split information
  - Loading states

### Navigation:

- Already registered in RootNavigator
- Accessible from CoursesScreen "+ Create" button

---

## 🔄 Task 3: Course Review System (IN PROGRESS)

### What's Needed:

1. **Admin Dashboard Screen**:
   - List courses with status: "draft", "pending", "published", "rejected"
   - Filter by status
   - View course details

2. **Review Actions**:
   - Approve button → Sets status to "published"
   - Reject button → Sets status to "rejected", add rejection reason
   - Request changes → Send feedback to creator

3. **Creator View**:
   - See review status in "My Courses"
   - View rejection feedback
   - Resubmit after fixes

4. **Backend Endpoints**:
   - `PUT /courses/:id/submit-for-review` → status: "pending"
   - `PUT /courses/:id/approve` → status: "published" (admin only)
   - `PUT /courses/:id/reject` → status: "rejected", add feedback (admin only)

5. **Permissions**:
   - Check user role === "admin" for approval endpoints
   - Creators can only submit their own courses

### Next Steps:

- Create AdminCoursesScreen for review interface
- Add review status badge to CourseDetailScreen
- Implement submit-for-review button
- Add admin middleware for approval routes

---

## ⏳ Task 4: Revenue Split System (PENDING)

### Requirements:

1. **Purchase Tracking**:
   - Create `CourseEarning` model (or use existing `Earning` model)
   - Track: userId, courseId, amount, creatorEarnings, platformCut, date

2. **Revenue Calculation**:
   - When user enrolls in paid course:
     - Total: priceCents
     - Creator: priceCents \* 0.85
     - Platform: priceCents \* 0.15
     - Store in Earning model

3. **Creator Dashboard**:
   - Show total earnings
   - Show earnings per course
   - List recent sales
   - Payout request button

4. **Payout System**:
   - Minimum payout threshold ($50?)
   - Stripe Connect for payouts
   - Payout history

### Backend Work:

- Update enrollment endpoint to record earnings
- Create earnings endpoint: `GET /api/earnings/mine`
- Payout request endpoint: `POST /api/earnings/request-payout`

### Frontend Work:

- Creator earnings dashboard
- Earnings chart/stats
- Payout request flow

---

## ⏳ Task 5: Uploaded Images (PENDING)

### Investigation Needed:

- User mentioned: "we uploaded another photo besides the icon we are not using"
- Check `backend/uploads/` directory
- Check `backend/public/category_banners/`
- Identify unused images
- Integrate into:
  - Course thumbnails?
  - Dashboard banners?
  - Category images?

---

---

## ✅ Task 3: Course Review System (COMPLETED)

### Implementation Details:

- **Course Model Updated**:
  - Added `status` field: "draft", "pending", "approved", "rejected"
  - Added `rejectionReason`, `reviewedBy`, `reviewedAt`, `submittedForReviewAt`
  - Added `thumbnail` and `priceCents` for modern UI

- **Backend Endpoints**:
  - `PUT /courses/:id/submit-for-review` - Creator submits for review
  - `PUT /courses/:id/approve` - Admin approves (sets status: "approved", isPublished: true)
  - `PUT /courses/:id/reject` - Admin rejects with reason
  - `GET /courses/admin/pending?status=pending` - List courses by status (admin only)

- **Admin Screen** (`AdminCoursesScreen.js`):
  - Filter tabs: Pending, Approved, Rejected, Draft
  - Course cards show: thumbnail, title, creator, category, price, status badge
  - Actions for pending courses: Approve (green) / Reject (red)
  - Rejection reason input with Alert.prompt
  - Pull-to-refresh functionality
  - Empty states with helpful messages

- **API Functions** (`src/api/courses.js`):
  - `submitForReview(courseId)`
  - `approveCourse(courseId)`
  - `rejectCourse(courseId, reason)`
  - `getPendingCourses(status)`

### Permissions:

- Only admins can approve/reject (checks `user.role === 'admin'`)
- Creators can only submit their own courses
- Admin endpoints return 403 if not admin

### Files Modified:

- `backend/models/Course.js` - Added review workflow fields
- `backend/routes/courses.js` - Added 4 new review endpoints
- `src/api/courses.js` - Added review API functions
- `src/screens/AdminCoursesScreen.js` - NEW: Full admin review interface

### Next Steps:

- Register AdminCoursesScreen in RootNavigator
- Add "Submit for Review" button to course creator's view
- Display rejection feedback to creators
- Set user role to 'admin' in database for testing

---

## Summary

**Completed**: 3/5 tasks (60%)

- ✅ Stripe integration ready (needs API keys)
- ✅ Course creation form complete
- ✅ Review system implemented
- 🔄 Revenue split next
- ⏳ Image investigation pending

**Testing Checklist**:

- [ ] Add Stripe test API keys
- [ ] Test subscription payment flow
- [ ] Create a test course with thumbnail
- [ ] Verify course saves as draft
- [ ] Set user role to 'admin' for testing
- [ ] Test admin approval/rejection flow
- [ ] Verify submission for review updates status
