# Backend Test Data Setup

This file documents what data needs to exist in the backend for frontend integration tests to pass.

## Test User

Create in backend via signup or direct DB insert:

```javascript
{
  _id: "test-user-playwright",
  email: "equiptest@example.com",
  password: "$2b$10$...", // hashed "Password123"
  displayName: "Equipment Tester",
  businessType: "cultivator",
  facilitiesAccess: [
    {
      facilityId: "facility-1",
      role: "ADMIN",
      roomIds: []
    }
  ]
}
```

## Test Facility

```javascript
{
  _id: "facility-1",
  name: "Test Facility 1",
  ownerId: "test-user-playwright",
  licenseNumber: "TEST-001",
  address: "123 Test St, Test City, TS 12345",
  createdAt: new Date(),
  updatedAt: new Date()
}
```

## Backend Setup Script (Recommended)

Add this to your backend repo at `scripts/seed-test-data.js`:

```javascript
// backend/scripts/seed-test-data.js
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/User");
const Facility = require("../models/Facility");

async function seedTestData() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/growpath-test"
    );

    // Create test user
    const hashedPassword = await bcrypt.hash("Password123", 10);

    const testUser = await User.findOneAndUpdate(
      { email: "equiptest@example.com" },
      {
        email: "equiptest@example.com",
        password: hashedPassword,
        displayName: "Equipment Tester",
        businessType: "cultivator",
        facilitiesAccess: [{ facilityId: "facility-1", role: "ADMIN" }]
      },
      { upsert: true, new: true }
    );

    console.log("✓ Test user created:", testUser.email);

    // Create test facility
    const testFacility = await Facility.findOneAndUpdate(
      { _id: "facility-1" },
      {
        _id: "facility-1",
        name: "Test Facility 1",
        ownerId: testUser._id,
        licenseNumber: "TEST-001",
        address: "123 Test St, Test City, TS 12345"
      },
      { upsert: true, new: true }
    );

    console.log("✓ Test facility created:", testFacility.name);

    process.exit(0);
  } catch (error) {
    console.error("✗ Seed failed:", error);
    process.exit(1);
  }
}

seedTestData();
```

Run with:

```bash
cd backend
node scripts/seed-test-data.js
```

## Alternative: Manual Setup via API

```bash
# 1. Create user
curl -X POST http://127.0.0.1:5001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "equiptest@example.com",
    "password": "Password123",
    "displayName": "Equipment Tester",
    "businessType": "cultivator"
  }'

# 2. Login to get token
TOKEN=$(curl -X POST http://127.0.0.1:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"equiptest@example.com","password":"Password123"}' \
  | jq -r '.token')

# 3. Create facility (if endpoint exists)
curl -X POST http://127.0.0.1:5001/api/facilities \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "_id": "facility-1",
    "name": "Test Facility 1",
    "licenseNumber": "TEST-001"
  }'
```

## Verification

Test that setup worked:

```bash
# Login
curl -X POST http://127.0.0.1:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"equiptest@example.com","password":"Password123"}'

# Should return: { token, user }

# Check facilities access
TOKEN="<from-above>"
curl -X GET http://127.0.0.1:5001/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Should return: { facilitiesAccess: [{ facilityId: "facility-1", ... }] }
```
