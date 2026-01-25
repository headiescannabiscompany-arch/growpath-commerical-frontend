// backend/fanoutNotifications.js
// Fanout notifications to all relevant users based on growInterests

// In-memory stub for demo: in real backend, use DB queries
const { v4: uuidv4 } = require("uuid");

// Simulate a user DB
const users = [
  {
    id: "user-1",
    email: "demo@growpath.com",
    name: "Demo User",
    plan: "commercial",
    role: "user",
    growInterests: [
      "genetics",
      "living-soil",
      "hydroponics",
      "blueberry",
      "tissue-culture",
      "indoor"
    ],
    pushToken: "demo-push-token"
  }
  // Add more users as needed
];

// In-memory notification store
if (!global.mockNotifications) global.mockNotifications = [];

const sendPush = require("./sendPush");
async function fanoutNotifications(post) {
  // Find users whose growInterests match post tags
  const tags = post.meta?.tags || [];
  const recipients = users.filter(
    (user) => user.growInterests && tags.some((tag) => user.growInterests.includes(tag))
  );
  for (const user of recipients) {
    // Don't send push to the author (if post.authorId exists)
    if (post.authorId && user.id === post.authorId) continue;
    global.mockNotifications.push({
      _id: uuidv4(),
      user: user.id,
      type: "post",
      title: post.title,
      body: post.meta?.summary || post.title,
      postId: post.id,
      read: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    if (user.pushToken) {
      await sendPush(user.pushToken, post.title, post.meta?.summary || post.title, {
        postId: post.id
      });
    }
  }
}

module.exports = fanoutNotifications;
