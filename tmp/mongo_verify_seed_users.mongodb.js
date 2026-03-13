use("growpath");

// 1) Check seeded auth users exist
db.users.find(
  {
    email: {
      $in: [
        "free@growpath.com",
        "pro@growpath.com",
        "commercial@growpath.com",
        "facility@growpath.com"
      ]
    }
  },
  {
    email: 1,
    plan: 1,
    mode: 1,
    facilityId: 1,
    facilitiesAccess: 1,
    createdAt: 1
  }
);

// 2) If users collection differs, uncomment to discover likely auth collections
// db.getCollectionNames().filter((n) => /user|auth|account/i.test(n));

// 3) Replace with actual user id from query #1 if needed
// const USER_OBJECT_ID = ObjectId("REPLACE_WITH_USER_OBJECT_ID");
// db.grows.find(
//   { ownerId: USER_OBJECT_ID },
//   { name: 1, status: 1, updatedAt: 1 }
// ).limit(20);

// 4) Fallback if schema stores user id as string
// db.grows.find(
//   { userId: "REPLACE_WITH_USER_ID_STRING" },
//   { name: 1, status: 1, updatedAt: 1 }
// ).limit(20);

// 5) Quick counts
print("users:", db.users.countDocuments({}));
print("grows:", db.grows.countDocuments({}));
