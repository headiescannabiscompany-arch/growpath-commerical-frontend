# GrowPath AI - App Store Readiness Checklist

## ✅ Configuration Files

- [x] **app.json** - Updated with permissions, bundle IDs, and proper configuration
- [x] **eas.json** - Configured for production builds with proper settings
- [x] **package.json** - Dependencies and scripts properly configured

## ✅ Legal Documents

- [x] **PRIVACY_POLICY.md** - Comprehensive privacy policy created
- [x] **TERMS_OF_SERVICE.md** - Complete terms of service created
- [ ] **Host Privacy Policy Online** - Must be accessible via URL before submission
- [ ] **Host Terms of Service Online** - Must be accessible via URL

## ⚠️ Assets (Need Review)

- [ ] **App Icon (icon.png)** - Verify it's 1024x1024 PNG with no transparency
- [ ] **Splash Screen (splash.png)** - Should be 1284x2778 with GrowPath AI branding
- [ ] **Feature Graphic** - Create 1024x500 banner for Google Play
- [ ] **Screenshots** - Capture 6-7 screenshots for each platform

## 📱 Platform Setup

### iOS App Store

- [ ] Apple Developer Account ($99/year)
- [ ] Create app listing in App Store Connect
- [ ] Configure bundle identifier: com.growpathai.app
- [ ] Set up age rating (17+)
- [ ] Add demo account: test@growpath.com / test123
- [ ] Upload screenshots (6.7", 6.5", iPad sizes)
- [ ] Submit for review

### Android Play Store

- [ ] Google Play Developer Account ($25 one-time)
- [ ] Create app listing in Play Console
- [ ] Configure package name: com.growpathai.app
- [ ] Set content rating (Mature 17+)
- [ ] Complete data safety form
- [ ] Upload screenshots (phone + tablets)
- [ ] Submit for review

## 🔧 Technical Requirements

- [x] **Permissions Configured** - Camera, photo library with descriptions
- [x] **Build Configuration** - EAS production profile ready
- [ ] **Code Signing** - iOS certificates and Android keystore
- [ ] **Test Build** - Create and test production build before submission
- [ ] **TestFlight/Internal Testing** - Test with real users first

## 🧹 Code Quality

- [x] **Logger Utility** - Created production-safe logger (src/utils/logger.js)
- [ ] **Remove Console.logs** - Replace with logger utility throughout app
- [ ] **Error Boundaries** - Add React error boundaries for graceful failures
- [ ] **Loading States** - Ensure all API calls show loading indicators
- [ ] **Offline Handling** - Handle network errors gracefully
- [ ] **Performance** - Test on older devices, optimize if needed

## 💰 Monetization

- [ ] **Stripe Configuration** - Verify production keys
- [ ] **iOS In-App Purchases** - Configure subscriptions in App Store Connect
- [ ] **Android Subscriptions** - Configure in Play Console
- [ ] **Test Purchase Flow** - Verify users can subscribe successfully
- [ ] **Subscription Management** - Test cancellation and renewal

## 📝 Store Listing Content

- [x] **App Description** - Comprehensive description created (APP_STORE_LISTING.md)
- [x] **Keywords** - SEO keywords identified
- [x] **What's New** - Version 1.0.0 release notes ready
- [x] **Promotional Text** - iOS promotional text prepared
- [ ] **App Preview Video** - Optional but recommended (15-30 seconds)

## 🌐 Supporting Infrastructure

- [ ] **Website/Landing Page** - For marketing and support
- [ ] **Support Email** - support@growpathai.com (create and monitor)
- [ ] **Privacy Policy URL** - Host and add to app listings
- [ ] **Support URL** - Create FAQ or support page
- [ ] **Social Media** - Set up accounts for marketing

## 🚀 Pre-Launch Checklist

### Before First Build

- [ ] Update version numbers if needed
- [ ] Remove all debug code
- [ ] Test on multiple devices/simulators
- [ ] Verify all images load correctly
- [ ] Test with slow network conditions
- [ ] Verify legal disclaimers show properly

### Before Submission

- [ ] Run production build locally and test thoroughly
- [ ] Submit to TestFlight (iOS) or Internal Testing (Android)
- [ ] Get beta testers to try the app
- [ ] Fix any bugs found in testing
- [ ] Prepare demo account with sample data
- [ ] Double-check all URLs in app listings

### After Submission

- [ ] Monitor for approval/rejection emails
- [ ] Respond quickly to any reviewer questions
- [ ] Prepare marketing materials for launch
- [ ] Plan post-launch support strategy

## 📊 Post-Launch Monitoring

- [ ] Set up crash reporting (e.g., Sentry)
- [ ] Configure analytics (e.g., Firebase)
- [ ] Monitor user reviews daily
- [ ] Track key metrics (downloads, active users, subscriptions)
- [ ] Plan first update (bug fixes and improvements)

## ⚠️ Known Issues to Address

- [ ] **Backend URL** - Ensure production backend URL is configured
- [ ] **API Keys** - Use production API keys, not development
- [ ] **SSL Certificate** - Verify backend has valid SSL
- [ ] **Rate Limiting** - Implement on backend to prevent abuse
- [ ] **Database Backups** - Set up automated MongoDB backups

## 🎯 Priority Actions (Do These First)

1. **Verify Assets**

   ```bash
   # Check icon size
   file assets/icon.png
   # Should show: 1024x1024
   ```

2. **Host Legal Documents**
   - Use GitHub Pages, Netlify, or your domain
   - Create simple HTML pages for privacy policy and terms

3. **Create Demo Account with Sample Data**

   ```bash
   # Add sample grows, posts, courses to test account
   ```

4. **Test Production Build Locally**

   ```bash
   eas build --platform ios --profile production --local
   ```

5. **Capture Screenshots**
   - Use simulator/emulator
   - Include all required screens
   - Show app's best features

## 📞 Need Help?

**Expo Documentation:**

- Build & Submit: https://docs.expo.dev/build/introduction/
- App Store Guidelines: https://docs.expo.dev/submit/ios/
- Play Store Guidelines: https://docs.expo.dev/submit/android/

**Common Issues:**

- If build fails: Check eas build logs
- If submission rejected: Read rejection carefully, address all points
- If stuck: Expo Discord community is very helpful

---

## Estimated Timeline to Launch

| Phase                  | Duration      | Status     |
| ---------------------- | ------------- | ---------- |
| Asset preparation      | 2-4 hours     | ⏳ Pending |
| Host legal docs        | 1 hour        | ⏳ Pending |
| Create app listings    | 1-2 hours     | ⏳ Pending |
| First production build | 1 hour        | ⏳ Pending |
| Internal testing       | 1-3 days      | ⏳ Pending |
| Screenshot creation    | 2-3 hours     | ⏳ Pending |
| Store submission       | 1 hour        | ⏳ Pending |
| Review process         | 1-7 days      | ⏳ Pending |
| **Total**              | **1-2 weeks** |            |

---

**Last Updated:** December 12, 2025
**Version:** 1.0.0
