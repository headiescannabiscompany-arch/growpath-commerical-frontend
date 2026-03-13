use("growpath");

// Read-only: list user emails and basic auth context.
db.users.find({}, { email: 1, plan: 1, mode: 1 }).toArray();
