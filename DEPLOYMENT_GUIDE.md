# App Store Deployment Guide for GrowPath AI

## Prerequisites

### Required Accounts

- [ ] Apple Developer Account ($99/year) - https://developer.apple.com
- [ ] Google Play Developer Account ($25 one-time) - https://play.google.com/console
- [ ] Expo Account (free) - Already have EAS project configured

### Required Software

- [ ] Xcode (for iOS builds) - Mac only
- [ ] Android Studio (optional, for Android builds)
- [ ] EAS CLI installed: `npm install -g eas-cli`

---

## Step 1: Prepare Assets

### 1.1 App Icon (Required)

**Current:** `assets/icon.png`

**Requirements:**

- iOS: 1024x1024 PNG, no transparency, no alpha channel
- Android: 1024x1024 PNG (adaptive icon will be generated)

**Action:** Verify your icon.png meets these requirements. If needed, recreate it.

### 1.2 Splash Screen (Required)

**Current:** `assets/splash.png`

**Requirements:**

- Recommended: 1284x2778 PNG (fits all devices)
- Will be centered and scaled

**Action:** Create a branded splash screen with GrowPath AI logo on dark background.

### 1.3 Adaptive Icon (Android)

Your app.json is configured to use icon.png with green background (#2d5a2d).
This will work, but consider creating a separate foreground layer for better results.

---

## Step 2: Configure EAS Build

### 2.1 Login to EAS

```bash
eas login
```

### 2.2 Configure Project (if not done)

```bash
eas build:configure
```

### 2.3 Update App Credentials

Your eas.json needs these values filled in before production submission:

**For iOS (in eas.json submit.production.ios):**

- `appleId`: Your Apple ID email
- `ascAppId`: App Store Connect App ID (get after creating app listing)
- `appleTeamId`: Your Apple Developer Team ID

---

## Step 3: Create App Listings

### 3.1 Apple App Store Connect

1. **Go to:** https://appstoreconnect.apple.com
2. **Click:** My Apps → + (New App)
3. **Fill in:**
   - Platform: iOS
   - Name: GrowPath AI
   - Primary Language: English
   - Bundle ID: com.growpathai.app (must match app.json)
   - SKU: growpathai-app-001 (any unique identifier)

4. **App Information:**
   - Name: GrowPath AI
   - Subtitle: Smart Cannabis Cultivation Tracking & Education
   - Privacy Policy URL: https://www.growpathai.com/privacy (must be hosted)
   - Category: Education
   - Secondary Category: Productivity

5. **Age Rating:**
   - Complete questionnaire
   - Select "Frequent/Intense" for Drug Use or References
   - Result should be 17+

6. **Pricing:**
   - Free with In-App Purchases
   - Available in all territories (or restrict based on legal compliance)

### 3.2 Google Play Console

1. **Go to:** https://play.google.com/console
2. **Click:** Create app
3. **Fill in:**
   - App name: GrowPath AI
   - Default language: English
   - App or game: App
   - Free or paid: Free
   - Declarations: Accept

4. **Store Listing:**
   - Short description: Smart Cannabis Cultivation Tracking & Education (80 chars)
   - Full description: [Use from APP_STORE_LISTING.md]
   - App icon: Upload icon.png (512x512 or 1024x1024)
   - Feature graphic: 1024x500 (create promotional banner)
   - Screenshots: At least 2, up to 8 per device type

5. **Content Rating:**
   - Complete questionnaire
   - Select "Yes" for drug/alcohol/tobacco references
   - Result should be Mature 17+

6. **App Category:**
   - Category: Education
   - Tags: Lifestyle, Tools

7. **Store Settings:**
   - App: No (not primarily for kids)
   - Contains ads: No

8. **Privacy Policy:**
   - URL: https://www.growpathai.com/privacy (must be hosted)

---

## Step 4: Build for Production

### 4.1 iOS Production Build

```bash
# Build for iOS App Store
eas build --platform ios --profile production

# This will:
# 1. Increment build number automatically
# 2. Create production-optimized build
# 3. Sign with your distribution certificate
# 4. Upload to Expo servers
```

**Wait time:** 10-20 minutes

### 4.2 Android Production Build

```bash
# Build for Google Play
eas build --platform android --profile production

# This will:
# 1. Increment versionCode automatically
# 2. Create AAB (app bundle) for Play Store
# 3. Sign with your upload key
# 4. Upload to Expo servers
```

**Wait time:** 10-20 minutes

### 4.3 Build Both Platforms

```bash
# Build for both platforms
eas build --platform all --profile production
```

---

## Step 5: Test Builds

### 5.1 Internal Testing (Before Submission)

**iOS - TestFlight:**

```bash
# Submit to TestFlight for internal testing
eas submit --platform ios --profile production

# Then in App Store Connect:
# 1. Go to TestFlight tab
# 2. Add internal testers
# 3. Test thoroughly
```

**Android - Internal Testing:**

```bash
# Upload to Google Play Internal Testing
eas submit --platform android --profile production

# Then in Play Console:
# 1. Go to Internal Testing track
# 2. Create release
# 3. Add testers
# 4. Test thoroughly
```

### 5.2 Testing Checklist

- [ ] App launches without crashes
- [ ] Login/signup works correctly
- [ ] All navigation flows work
- [ ] Image upload works (camera + gallery)
- [ ] Payments/subscriptions work correctly
- [ ] Push notifications work (if implemented)
- [ ] App works offline (if applicable)
- [ ] No console errors or warnings
- [ ] Performance is acceptable
- [ ] Legal disclaimers are shown

---

## Step 6: Prepare Screenshots

### 6.1 Screenshot Requirements

**iOS - Required Sizes:**

1. iPhone 6.7" (iPhone 14 Pro Max, 15 Pro Max): 1290 x 2796
2. iPhone 6.5" (iPhone 11 Pro Max, XS Max): 1242 x 2688
3. iPad Pro 12.9" (2nd/3rd gen): 2048 x 2732

**Android - Required:**

- Phone: At least 2 screenshots (320-3840px wide/high)
- 7" Tablet: At least 1 screenshot (optional but recommended)
- 10" Tablet: At least 1 screenshot (optional but recommended)

### 6.2 Capture Screenshots

**Method 1 - iOS Simulator (Mac only):**

```bash
# Start iOS simulator
expo start --ios

# Navigate to screens and capture:
# Cmd + S (saves to Desktop)
```

**Method 2 - Android Emulator:**

```bash
# Start Android emulator
expo start --android

# Use emulator screenshot tool
```

**Method 3 - Using expo-screenshots (automated):**

```bash
npm install -D expo-screenshots
```

### 6.3 Recommended Screenshots (in order)

1. **Login Screen** - Shows beautiful background and logo
2. **Grow Logs List** - Shows multiple grows in progress
3. **Create Grow** - Shows advanced environment tracking fields
4. **AI Diagnostics** - Shows plant analysis feature
5. **Course Marketplace** - Shows available courses
6. **Community/Forum** - Shows social features
7. **Profile** - Shows certificates and achievements

---

## Step 7: Submit for Review

### 7.1 iOS Submission

**In App Store Connect:**

1. **Version Information:**
   - Version: 1.0.0
   - Copyright: 2025 GrowPath AI, Inc.
   - Age Rating: 17+

2. **App Review Information:**
   - Contact Information: Your email/phone
   - Demo Account: test@growpath.com / test123 (critical!)
   - Notes: "This app is for educational purposes and legal cannabis cultivation. Please use demo account to test all features."

3. **Screenshots:**
   - Upload all required screenshot sizes
   - Add captions to describe features

4. **Description:**
   - Copy from APP_STORE_LISTING.md

5. **Keywords:**
   - cannabis,grow,cultivation,hydroponics,marijuana,weed,plant,tracking,grow log,gardening

6. **Support URL:**
   - https://www.growpathai.com/support

7. **Marketing URL:**
   - https://www.growpathai.com

8. **Submit for Review:**
   - Review time: 1-3 days typically
   - Check for rejection reasons and respond quickly

### 7.2 Android Submission

**In Google Play Console:**

1. **Create Production Release:**
   - Upload AAB from EAS build
   - Release name: "1.0.0 - Initial Release"
   - Release notes: Copy "What's New" from APP_STORE_LISTING.md

2. **Complete All Sections:**
   - [ ] Store listing (description, screenshots)
   - [ ] Content rating (complete questionnaire)
   - [ ] App content (privacy policy, ads, etc.)
   - [ ] Target audience (17+, no children)
   - [ ] News apps (not applicable)
   - [ ] COVID-19 contact tracing (no)
   - [ ] Data safety (declare data collection)
   - [ ] Government apps (no)

3. **Pricing & Distribution:**
   - Countries: Select all (or restrict based on legal compliance)
   - Pricing: Free
   - Contains ads: No
   - Primarily for kids: No

4. **Submit for Review:**
   - Review time: 1-7 days typically
   - May require additional info about cannabis content

---

## Step 8: Configure In-App Purchases

### 8.1 iOS In-App Purchases

**In App Store Connect → Features → In-App Purchases:**

1. **Create Subscription Group:**
   - Name: GrowPath AI Pro
   - Reference Name: growpath-pro

2. **Create Auto-Renewable Subscription:**
   - Product ID: com.growpathai.app.pro.monthly
   - Reference Name: Monthly Pro Subscription
   - Subscription Group: GrowPath AI Pro
   - Duration: 1 month
   - Price: $9.99 (or your chosen price)
   - Localization: Add description

3. **Add Additional Subscriptions:**
   - Yearly: com.growpathai.app.pro.yearly ($99.99)

4. **Configure Subscription Features:**
   - Promotional text
   - Benefits list
   - Screenshots (optional)

### 8.2 Google Play Subscriptions

**In Play Console → Monetize → Subscriptions:**

1. **Create Subscription:**
   - Product ID: pro_monthly
   - Name: Monthly Pro Subscription
   - Description: [Benefits list]
   - Billing period: 1 month
   - Price: $9.99
   - Free trial: 7 days (optional)
   - Grace period: 3 days

2. **Add Base Plans:**
   - Monthly: $9.99/month
   - Yearly: $99.99/year (save 17%)

---

## Step 9: Post-Launch Monitoring

### 9.1 Monitor Reviews

- Respond to user reviews promptly
- Address bugs reported in reviews
- Thank users for positive feedback

### 9.2 Analytics

- Set up Firebase Analytics (recommended)
- Monitor crash reports
- Track user engagement
- Monitor conversion rates

### 9.3 Updates

- Fix bugs quickly
- Release updates regularly
- Increment version numbers properly:
  - Major: 1.0.0 → 2.0.0 (breaking changes)
  - Minor: 1.0.0 → 1.1.0 (new features)
  - Patch: 1.0.0 → 1.0.1 (bug fixes)

---

## Troubleshooting Common Issues

### iOS Rejection Reasons

**1. Cannabis Content:**

- **Solution:** Emphasize educational purpose, legal compliance, age gate

**2. Missing Demo Account:**

- **Solution:** Always provide working test credentials

**3. Broken Links:**

- **Solution:** Ensure privacy policy URL is accessible

**4. Crash on Launch:**

- **Solution:** Test thoroughly on TestFlight first

### Android Rejection Reasons

**1. Missing Privacy Policy:**

- **Solution:** Host policy and add URL

**2. Inappropriate Content:**

- **Solution:** Set mature content rating correctly

**3. Misleading Description:**

- **Solution:** Clearly state app purpose and legal requirements

---

## Quick Command Reference

```bash
# Login to EAS
eas login

# Build production iOS
eas build --platform ios --profile production

# Build production Android
eas build --platform android --profile production

# Submit to App Store
eas submit --platform ios --profile production

# Submit to Play Store
eas submit --platform android --profile production

# Check build status
eas build:list

# View build logs
eas build:view [BUILD_ID]

# Update app metadata
eas metadata:push

# Check credentials
eas credentials
```

---

## Estimated Timeline

| Task                        | Time Required              |
| --------------------------- | -------------------------- |
| Asset preparation           | 2-4 hours                  |
| App listings setup          | 1-2 hours                  |
| First iOS build             | 30 min + 15 min build time |
| First Android build         | 30 min + 15 min build time |
| TestFlight/Internal testing | 1-3 days                   |
| Screenshots & descriptions  | 2-3 hours                  |
| iOS review                  | 1-3 days                   |
| Android review              | 1-7 days                   |
| **Total (first launch)**    | **1-2 weeks**              |

---

## Support Resources

- **Expo Documentation:** https://docs.expo.dev
- **EAS Build:** https://docs.expo.dev/build/introduction/
- **EAS Submit:** https://docs.expo.dev/submit/introduction/
- **App Store Review Guidelines:** https://developer.apple.com/app-store/review/guidelines/
- **Play Store Guidelines:** https://play.google.com/about/developer-content-policy/

---

## Next Steps

1. **Host Privacy Policy:** You need a website or use a service like:
   - GitHub Pages (free)
   - Netlify (free)
   - Your own domain

2. **Create Support Page:** Users need a way to contact you

3. **Set up Email:** Create support@growpathai.com

4. **Test Payment Flow:** Ensure Stripe integration works perfectly

5. **Prepare Marketing:** Get ready to promote the launch

---

**Good luck with your app store submission! 🚀**
