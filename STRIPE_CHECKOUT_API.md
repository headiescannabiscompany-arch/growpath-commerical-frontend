# Stripe Course Checkout API (for Frontend)

## How to start a course purchase

1. Make a POST request to `/api/courses/:id/checkout` (with authentication).
   - Replace `:id` with the course ID.
   - Example: `/api/courses/12345/checkout`

2. The response will include a Stripe Checkout URL in the `url` field:

   ```json
   { "url": "https://checkout.stripe.com/pay/cs_test_..." }
   ```

3. Redirect the user to this URL to complete payment.

4. After payment, Stripe will handle the webhook and enroll the user automatically.

5. On success, the user will be redirected to `CLIENT_URL/success?session_id=...` (as configured in the backend).

**Note:**

- The frontend does not need to calculate fees or handle secret keys.
- All payment and enrollment logic is handled by the backend and Stripe.
