# GrowPath AI – Development Environment & Platform Safety Guide

> Status: CANONICAL
> Owner: Engineering/Platform
> Last reviewed: 2026-01-24
> Source of truth for: Tooling, linting, and architectural guardrails

## Core Principle

Linting and tooling are not just for formatting or style. In GrowPath, they are the last line of defense against architectural drift and compliance failure. ESLint, Prettier, and Husky must:

- Prevent illegal backend patterns
- Enforce operating system rules
- Stop compliance drift
- Protect capability-based security

If lint passes but architecture is broken, lint is misconfigured.

---

## What Was Configured (Tooling Basics)

### VS Code Extensions

...existing code...

---

## Mandatory Architectural Rules (Add These to .eslintrc.json backend)

1. **No direct facility role mutation**
   - Block: `PUT /api/users/:id/role`
   - Enforce: `PUT /api/facilities/:facilityId/users/:id/role`
   - Lint rule: no route paths matching `/api/users/.*role`

2. **No hard deletes on immutable collections**
   - For: AuditLog, Verification, Deviation, GreenWaste, SOPTemplate
   - Disallow: `Model.deleteOne()`, `Model.findByIdAndDelete()`
   - Allow only: create, status change, soft archive where defined

3. **All facility routes must require access middleware**
   - Disallow: `router.get("/facilities/:id", handler)`
   - Require: `router.get("/facilities/:id", requireMode("facility"), requireFacilityAccess, handler)`

4. **No frontend-defined access rules**
   - Disallow: `if (user.plan === "free") showFeature()`
   - Require: `if (capabilities.analytics) showFeature()`

5. **Money must be integer cents**
   - Disallow: `price: 9.99`
   - Require: `priceCents: 999`

---

## New “Never Edit Manually” List

Add these to your system contracts:

- AUTH_CONTRACT.md
- FACILITY_OS_PRIMITIVES.md
- PAYMENTS_SPEC.md
- FRONTEND_SCREEN_MAP.md

These are not config files. They are architectural contracts.

---

## New Daily Command (Missing)

Add this to your workflow:

`npm run arch:check`

Which should:

- scan for forbidden patterns
- verify middleware presence
- block illegal deletes
- flag missing audit writes

This is your platform integrity test, not just lint.

---

### 1. Install Node.js

Node.js is not currently installed on your system. Download and install:

- **Node.js LTS**: https://nodejs.org/
- Recommended: v18.x or v20.x LTS

After installation, verify:

```powershell
node --version
npm --version
```

### 2. Install Backend Dependencies

```powershell
cd backend
npm install
```

This will install:

- eslint
- prettier
- eslint-config-prettier
- eslint-plugin-prettier
- husky (pre-commit hooks)
- lint-staged

### 3. Install Frontend Dependencies

```powershell
cd ..
npm install
```

This will install:

- eslint
- prettier
- eslint-config-prettier
- eslint-plugin-prettier
- eslint-plugin-react
- eslint-plugin-react-hooks
- eslint-plugin-react-native
- husky
- lint-staged

### 4. Create your local env file

```powershell
cp .env.test .env.development
```

Then edit `.env.development` to point `EXPO_PUBLIC_API_URL` at your running backend (defaults to `http://127.0.0.1:5001`). Expo CLI automatically loads `.env.development` for local runs, so the app knows where to send auth/login requests.

### 5. Initialize Husky (Git Hooks)

After npm install, run:

```powershell
# In backend folder
cd backend
npx husky install

# In root folder
cd ..
npx husky install
```

This enables automatic code quality checks before commits.

## How to Use (Muscle Memory)

### Auto-Format on Save

...existing code...

### Manual Linting

...existing code...

### View Problems Panel

Press `Ctrl + Shift + M` to see all errors and warnings across your project.

### Pre-Commit Hook

...existing code...

---

## Redefining “Best Practices”

Replace this:

✅ Don't fight the linter — it's catching real bugs

With this:

✅ If lint passes but architecture feels wrong, the linter is wrong.

The linter must protect:

- shell boundaries
- capability flow
- authority layers
- immutability rules
  Not just semicolons.

---

## What Each Tool Does

### ESLint

- Detects bugs, errors, and anti-patterns
- Enforces code quality standards
- Shows red squiggles under problematic code

### Prettier

- Auto-formats code consistently
- Fixes indentation, spacing, quotes
- Removes formatting debates from code reviews

### Error Lens

- Shows errors inline (not just squiggles)
- Makes debugging 10x faster
- Highlights issues in bright colors

### EditorConfig

- Ensures consistent formatting across editors
- Sets tab size, line endings, charset
- Works in VS Code, Sublime, Vim, etc.

### Type Checking (jsconfig.json)

VS Code will now show warnings for:

- ❌ Undefined variables
- ❌ Wrong function signatures
- ❌ Invalid imports
- ❌ Type mismatches

## Configuration Details

### ESLint Rules

- `prettier/prettier: error` - Format issues are errors
- `no-unused-vars: warn` - Unused variables show warnings
- `no-undef: error` - Undefined variables are errors
- `react/prop-types: off` - PropTypes not required (using TypeScript-style checking)
- `react/react-in-jsx-scope: off` - React 17+ doesn't need import

### Prettier Rules

- Double quotes for strings
- 2-space indentation
- Semicolons required
- No trailing commas
- 90 character line width

### Pre-Commit Hook

Only staged files are checked (fast commits!)
Files are auto-fixed before commit if possible.

## Troubleshooting

### "ESLint is disabled"

1. Open Command Palette: `Ctrl + Shift + P`
2. Type: `ESLint: Restart ESLint Server`

### "Prettier not formatting"

1. Check bottom-right of VS Code
2. Click on file type (e.g., "JavaScript")
3. Select "Configure File Association for '.js'"
4. Choose "JavaScript"

### "Error: Cannot find module 'eslint'"

Run `npm install` in both root and backend folders.

### Git hooks not working

```powershell
cd backend
npx husky install

cd ..
npx husky install
```

## Testing the Setup

### 1. Test Auto-Format

Open [backend/server.js](backend/server.js) and add:

```javascript
const x = 1 + 2;
```

Press `Ctrl + S`. It should auto-format to:

```javascript
const x = 1 + 2;
```

### 2. Test ESLint Errors

Add this invalid code:

```javascript
undefinedFunction();
```

You should see:

- Red squiggle under `undefinedFunction`
- Error message from Error Lens
- Entry in Problems Panel (`Ctrl + Shift + M`)

### 3. Test Pre-Commit Hook

```powershell
git add .
git commit -m "test"
```

If any linting errors exist, the commit will be blocked.

---

## The Real Pattern

Old meaning of lint:
“Make code pretty and consistent.”

Your meaning now:
“Make illegal systems impossible to commit.”

That’s a completely different class of tooling.

---

## Professional Benefits

✅ **Catch bugs before runtime**

- Undefined variables detected instantly
- Invalid function calls highlighted
- Type mismatches shown

✅ **Consistent code style**

- Everyone's code looks the same
- No formatting arguments
- Auto-fixed on save

✅ **Faster code reviews**

- No comments about formatting
- Focus on logic, not style
- Pre-commit hooks ensure quality

✅ **Better onboarding**

- New developers see errors immediately
- Code quality enforced automatically
- Best practices baked in

## VS Code Keyboard Shortcuts

| Action           | Windows/Linux      | Mac                  |
| ---------------- | ------------------ | -------------------- |
| Problems Panel   | `Ctrl + Shift + M` | `Cmd + Shift + M`    |
| Command Palette  | `Ctrl + Shift + P` | `Cmd + Shift + P`    |
| Format Document  | `Shift + Alt + F`  | `Shift + Option + F` |
| Quick Fix        | `Ctrl + .`         | `Cmd + .`            |
| Go to Definition | `F12`              | `F12`                |
| Find References  | `Shift + F12`      | `Shift + F12`        |

## Recommended Next Steps

1. **Install Node.js** (required for npm packages)
2. **Run `npm install`** in both folders
3. **Initialize Husky** with `npx husky install`
4. **Test the setup** by editing and saving a file
5. **Open Problems Panel** with `Ctrl + Shift + M`
6. **Start fixing errors** one by one until clean

Your development environment is now platform-grade. 🚀

After your architectural reset, linting is no longer about style.
It’s about preventing another year of drift.

## Capability-Driven UI Gating

All feature access in the app is now controlled by a capability-driven system. User capabilities are determined by their plan, role, and entitlements, which are provided by the backend and processed in the frontend (see `AuthContext` and `src/utils/entitlements.js`).

**Supported user types:**

- Free
- Pro
- Influencer
- Commercial
- Facility
- Guild member (users with one or more guilds)

UI elements and features are automatically gated based on these capabilities. To add new user types or features, update the entitlements logic and ensure the backend returns the correct user fields (`plan`, `role`, `subscriptionStatus`, `guilds`, etc.).

## Automated Testing for All User Types

The test suite covers all user types and capability-driven UI gating. Acceptance and QA tests use static mocks to simulate different user types and feature access.

**To run all tests:**

```powershell
npm test
```

- All tests must pass before merging or deploying.
- If you add new user types or change entitlements, update the tests and mocks accordingly.

**Troubleshooting:**

- If a test fails due to missing entitlements or user fields, check your mock data and ensure the user object includes all required fields (plan, role, subscriptionStatus, guilds, etc.).
- For real backend issues, verify the API returns the correct user shape.
