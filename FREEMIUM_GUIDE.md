# PRO Feature Gating - Implementation Guide

## Overview
The freemium model is now implemented with backend enforcement and frontend helpers.

## Backend (Already Done)
- ✅ User model has `subscriptionStatus`, `subscriptionExpiry`, `trialUsed`, and `isPro` virtual
- ✅ Auth middleware fetches full user with `isPro` available
- ✅ `proOnly` middleware gates PRO features (returns 403 if not PRO)
- ✅ PRO gating applied to:
  - Plants: 1-plant limit for free users
  - Posts: create, like, unlike, comment (PRO only)
  - Tasks: create, complete (PRO only)
  - Templates: create, apply (PRO only)
  - AI Diagnose: all endpoints (PRO only)
  - AI Feeding: all endpoints (PRO only)
  - AI Environment: all endpoints (PRO only)

## Frontend Setup (Already Done)
- ✅ AuthContext provides `isPro` state
- ✅ Paywall and SubscriptionStatus screens created
- ✅ Subscribe API routes created
- ✅ proHelper utility for gating UI actions

## How to Add PRO Checks in Screens

### 1. Import Required Hooks and Helpers
```javascript
import { useAuth } from "../context/AuthContext";
import { requirePro, handleApiError } from "../utils/proHelper";
```

### 2. Get isPro from Auth Context
```javascript
export default function MyScreen({ navigation }) {
  const { isPro } = useAuth();
  // ... rest of component
}
```

### 3. Check Before PRO Actions

#### Pattern A: Inline Check
```javascript
const handleCreatePost = () => {
  if (!isPro) {
    navigation.navigate("Paywall");
    return;
  }
  
  // Proceed with action
  createPost();
};
```

#### Pattern B: Using requirePro Helper
```javascript
const handleCreatePost = () => {
  requirePro(navigation, isPro, () => {
    createPost();
  });
};
```

### 4. Handle API 403 Errors
```javascript
try {
  const result = await someApiCall();
  // Handle success
} catch (error) {
  // Handle 403 PRO-required errors automatically
  if (!handleApiError(error, navigation)) {
    // Handle other errors
    Alert.alert("Error", error.message);
  }
}
```

### 5. Show PRO Badge on UI Elements
```javascript
<TouchableOpacity onPress={handleProAction}>
  <Text>Create Post</Text>
  {!isPro && <Text style={styles.proBadge}>PRO</Text>}
</TouchableOpacity>
```

## Example: DiagnoseScreen (Updated)
See `src/screens/DiagnoseScreen.js` for a complete example showing:
- Import useAuth and proHelper
- Check isPro before API calls
- Handle 403 errors with handleApiError
- Redirect to Paywall when needed

## Subscription Management

### Start Trial
```javascript
import { startSubscription } from "../api/subscribe";

const handleStartTrial = async () => {
  try {
    const result = await startSubscription("trial", token);
    if (result.success) {
      // Refresh pro status
      refreshProStatus();
    }
  } catch (error) {
    // Handle error
  }
};
```

### Check Status
```javascript
import { getSubscriptionStatus } from "../api/subscribe";

const loadStatus = async () => {
  const result = await getSubscriptionStatus(token);
  // result.isPro, result.status, result.expiry, result.trialUsed
};
```

### Cancel Subscription
```javascript
import { cancelSubscription } from "../api/subscribe";

const handleCancel = async () => {
  const result = await cancelSubscription(token);
};
```

## Free Tier Limits
- ✅ 1 plant maximum
- ❌ No social posting/liking/commenting
- ❌ No task creation/completion
- ❌ No AI tools (diagnose, feeding, environment)
- ❌ No template creation/application
- ✅ View-only access to feed, marketplace, courses

## PRO Benefits
- ✅ Unlimited plants
- ✅ Full social features
- ✅ Task management
- ✅ All AI tools
- ✅ Template creation & marketplace
- ✅ 7-day free trial (one-time)

## Testing
1. Default users start as "free"
2. Use Paywall screen to start trial or subscribe
3. Test 403 responses for gated features
4. Verify automatic paywall redirects
5. Check SubscriptionStatus screen for current state

## Next Steps for Integration
Apply PRO checks to these screens:
- [ ] CreatePostScreen - check before submitting
- [ ] FeedScreen - disable like/comment buttons for free users
- [ ] TasksTodayScreen - disable complete button for free users
- [ ] CreateTaskScreen - check at mount or submit
- [ ] TemplatesMarketplaceScreen - disable "Apply" for free users
- [ ] FeedingLabelScreen - check before upload
- [ ] EnvironmentAssistantScreen - check before analyze
- [ ] Any plant creation flow - check plant count limit

## Example Implementation for Other Screens

### CreatePostScreen
```javascript
import { useAuth } from "../context/AuthContext";

export default function CreatePostScreen({ navigation }) {
  const { isPro } = useAuth();

  const handleSubmit = () => {
    if (!isPro) {
      navigation.navigate("Paywall");
      return;
    }
    // Submit post
  };
}
```

### FeedScreen (Disable UI for Free Users)
```javascript
const { isPro } = useAuth();

<TouchableOpacity 
  onPress={() => isPro ? handleLike() : navigation.navigate("Paywall")}
  disabled={!isPro}
>
  <Text style={!isPro && styles.disabled}>❤️ Like</Text>
</TouchableOpacity>
```
