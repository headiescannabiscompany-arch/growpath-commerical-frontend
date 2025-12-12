# Quick Reference: ESLint + Prettier Commands

## Installation (After Node.js is installed)

### Backend
```powershell
cd backend
npm install
npx husky install
```

### Frontend
```powershell
cd ..
npm install
npx husky install
```

## Daily Commands

### Check for errors
```powershell
npm run lint
```

### Auto-fix errors
```powershell
npm run lint:fix
```

### Format all files
```powershell
npm run format
```

### Start backend server
```powershell
cd backend
npm run dev
```

### Start Expo app
```powershell
npm start
```

## VS Code Shortcuts

- `Ctrl + Shift + M` - Open Problems Panel
- `Ctrl + Shift + P` - Command Palette
- `Shift + Alt + F` - Format current file
- `Ctrl + .` - Quick fix for error under cursor
- `Ctrl + S` - Save (auto-formats)

## Common Fixes

### Unused variable warning
```javascript
// Before (warns)
const unused = 123;

// Fix 1: Use it
console.log(unused);

// Fix 2: Prefix with underscore
const _unused = 123;

// Fix 3: Remove it
```

### Missing import
```javascript
// Error: 'React' is not defined
// Fix: Add import
import React from 'react';
```

### Undefined variable
```javascript
// Error: 'foo' is not defined
const x = foo; // ❌

// Fix: Define it first
const foo = "bar";
const x = foo; // ✅
```

### Wrong quotes
```javascript
// Auto-fixed by Prettier
const name = 'John'; // → const name = "John";
```

## Git Pre-Commit

When you commit, automatically:
1. ✅ Lints changed files
2. ✅ Formats changed files
3. ✅ Blocks commit if errors

To bypass (not recommended):
```powershell
git commit --no-verify -m "message"
```

## Files to Never Edit Manually

- `.eslintrc.json` - ESLint config (already optimal)
- `.prettierrc` - Prettier config (already optimal)
- `.editorconfig` - Editor config (already optimal)

Let the tools handle formatting!

## Troubleshooting

### Extensions not working
1. Reload VS Code: `Ctrl + Shift + P` → "Reload Window"
2. Check extensions installed: `Ctrl + Shift + X`

### npm commands fail
Install Node.js from https://nodejs.org/

### Linting too slow
Add more patterns to `.eslintignore`:
```
node_modules/
uploads/
public/
```

### Want different rules?
Edit `.eslintrc.json` rules section:
```json
"rules": {
  "no-unused-vars": "off",  // Disable unused vars warning
  "no-console": "warn"      // Warn on console.log
}
```

## Best Practices

✅ **Save often** - Auto-format keeps code clean
✅ **Check Problems Panel** - Fix errors before committing
✅ **Trust the auto-fix** - Prettier knows best
✅ **Don't fight the linter** - It's catching real bugs
✅ **Run `npm run lint`** before pushing

## Project Structure

```
GrowPathAI-UI/
├── .vscode/
│   └── settings.json          ← VS Code auto-format config
├── backend/
│   ├── .eslintrc.json         ← Backend linting rules
│   ├── .prettierrc            ← Backend format rules
│   ├── jsconfig.json          ← Type checking
│   └── package.json           ← Scripts + dependencies
├── src/                       ← Frontend React Native code
├── .eslintrc.json             ← Frontend linting rules
├── .prettierrc                ← Frontend format rules
├── .editorconfig              ← Editor consistency
├── jsconfig.json              ← Type checking
└── package.json               ← Scripts + dependencies
```

## Status Check

Run this to verify setup:
```powershell
# Check Node.js
node --version

# Check npm
npm --version

# Check ESLint
npx eslint --version

# Check Prettier
npx prettier --version

# List installed VS Code extensions
code --list-extensions | Select-String "eslint|prettier|error"
```

Should show:
- Node: v18.x or v20.x
- npm: v9.x or v10.x
- ESLint: v8.x
- Prettier: v3.x
- Extensions: dbaeumer.vscode-eslint, esbenp.prettier-vscode, usernamehw.errorlens

✅ All configured and ready!
