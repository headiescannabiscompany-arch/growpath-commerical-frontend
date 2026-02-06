  // Mount commercial routes (for /api/commercial/posts/:id)
  try {
    const commercialRoutes = require("./routes/commercial");
    app.use("/api/commercial", commercialRoutes);
  } catch (e) {
    // Ignore if not present
  }
// Stubs for missing endpoints to prevent 404 errors
module.exports = function (app) {
  // Mount notifications route (for /api/notifications)
  try {
    const notificationsRoutes = require("./routes/notifications");
    app.use("/api/notifications", notificationsRoutes);
  } catch (e) {
    // Ignore if not present
  }
    // Mount events route (for /api/events)
    try {
      const eventsRoutes = require("./routes/events");
      app.use("/api/events", eventsRoutes);
    } catch (e) {
      // Ignore if not present
    }
  // Mount user routes (for PATCH /api/user/interests)
  try {
    const userRoutes = require("./routes/user");
    app.use("/api/user", userRoutes);
  } catch (e) {
    // Ignore if not present
  }

  // Mount personal mode routes (for /api/personal/grows, /logs, /tasks)
  try {
    const personalRoutes = require("./routes/personal");
    app.use("/api/personal", personalRoutes);
  } catch (e) {
    // Ignore if not present
  }

  // --- User stub ---
  const mockUser = {
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
    ]
  };
  // --- Commercial Feed Stubs ---
  // In-memory mock data for demo
  // Add tags to mock posts for filtering
  const mockUser = {
    id: "user-1",
    email: "demo@growpath.com",
    name: "Demo User",
    plan: "commercial",
    role: "user",
    growInterests: ["genetics", "living-soil", "hydroponics", "blueberry", "tissue-culture", "indoor"]
  };
  const mockTasks = [
      // --- POST /api/commercial/post (stubbed post creation) ---
      const fanoutNotifications = require("./fanoutNotifications");
      app.post("/api/commercial/post", async (req, res) => {
        // Simulate post creation
        const { title, meta } = req.body || {};
        const post = {
          id: `post-${Date.now()}`,
          type: "post",
          title: title || "Untitled Post",
          meta: meta || {},
          createdAt: new Date().toISOString(),
          // ...other fields as needed
        };
        // In-memory: add to mockGrowLogs for demo
        mockGrowLogs.push(post);
        // Fanout notifications to relevant users
        await fanoutNotifications(post);
        res.json({ success: true, post });
      });
    {
      id: "task-1",
      type: "task",
      title: "Check irrigation system",
      status: "open",
      facilityId: "facility-1",
      assignedTo: "user-1",
      dueAt: new Date(Date.now() + 86400000).toISOString(),
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      meta: { taskType: "maintenance", tags: ["irrigation", "hydroponics"] }
    },
    {
      id: "task-2",
      type: "task",
      title: "Harvest Room A",
      status: "done",
      facilityId: "facility-1",
      assignedTo: "user-2",
      dueAt: new Date(Date.now() - 86400000).toISOString(),
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      meta: { taskType: "harvest", tags: ["harvest", "living-soil"] }
    }
  ];
  const mockGrowLogs = [
    {
      id: "log-1",
      type: "log",
      title: "Logged pH reading",
      status: "info",
      facilityId: "facility-1",
      growId: "grow-1",
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      meta: { action: "ph", metrics: { value: 6.2 }, tags: ["ph", "hydroponics"] }
    }
  ];
  const mockAlerts = [
    {
      id: "alert-1",
      type: "alert",
      title: "Temperature out of range",
      status: "open",
      facilityId: "facility-1",
      severity: "high",
      createdAt: new Date(Date.now() - 5400000).toISOString(),
      meta: { source: "sensor", threshold: 80, currentValue: 92, tags: ["temperature", "indoor"] }
      // --- /api/commercial/feed ---
      app.get("/api/commercial/feed", (req, res) => {
        // Simulate auth: always use mockUser
        const user = mockUser;
        // Gather all posts
        const allPosts = [...mockTasks, ...mockGrowLogs, ...mockAlerts];
        let items = allPosts;
        // If user has growInterests, filter by tags
        if (user.growInterests && user.growInterests.length) {
          items = items.filter((post) => {
            const tags = post.meta?.tags || [];
            return tags.some((tag) => user.growInterests.includes(tag));
          });
        }
        // Simple cursor pagination (by index)
        const limit = parseInt(req.query.limit) || 20;
        const cursor = req.query.cursor ? parseInt(req.query.cursor) : 0;
        const paged = items.slice(cursor, cursor + limit);
        const nextCursor = cursor + limit < items.length ? String(cursor + limit) : null;
        res.json({ items: paged, nextCursor, hasMore: !!nextCursor });
      });
    }
  ];

  // --- /api/tasks ---
  app.get("/api/tasks", (req, res) => {
    // Filter by facilityId, status, assignedTo, cursor, limit
    let items = mockTasks.filter((t) => t.facilityId === req.query.facilityId);
    if (req.query.status) items = items.filter((t) => t.status === req.query.status);
    if (req.query.assignedTo)
      items = items.filter((t) => t.assignedTo === req.query.assignedTo);
    // Simple cursor pagination (by index)
    const limit = parseInt(req.query.limit) || 20;
    const cursor = req.query.cursor ? parseInt(req.query.cursor) : 0;
    const paged = items.slice(cursor, cursor + limit);
    const nextCursor = cursor + limit < items.length ? String(cursor + limit) : null;
    res.json({ items: paged, nextCursor, hasMore: !!nextCursor });
  });
  app.patch("/api/tasks/:id", (req, res) => {
    const idx = mockTasks.findIndex((t) => t.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: "Task not found" });
    const task = mockTasks[idx];
    if (req.body.status) task.status = req.body.status;
    if (req.body.assignedTo) task.assignedTo = req.body.assignedTo;
    task.updatedAt = new Date().toISOString();
    res.json(task);
  });

  // --- /api/growlog ---
  app.get("/api/growlog", (req, res) => {
    let items = mockGrowLogs.filter((l) => l.facilityId === req.query.facilityId);
    // Simple cursor pagination
    const limit = parseInt(req.query.limit) || 20;
    const cursor = req.query.cursor ? parseInt(req.query.cursor) : 0;
    const paged = items.slice(cursor, cursor + limit);
    const nextCursor = cursor + limit < items.length ? String(cursor + limit) : null;
    res.json({ items: paged, nextCursor, hasMore: !!nextCursor });
  });

  // --- /api/alerts ---
  app.get("/api/alerts", (req, res) => {
    let items = mockAlerts.filter((a) => a.facilityId === req.query.facilityId);
    if (req.query.status) items = items.filter((a) => a.status === req.query.status);
    if (req.query.severity)
      items = items.filter((a) => a.severity === req.query.severity);
    // Simple cursor pagination
    const limit = parseInt(req.query.limit) || 20;
    const cursor = req.query.cursor ? parseInt(req.query.cursor) : 0;
    const paged = items.slice(cursor, cursor + limit);
    const nextCursor = cursor + limit < items.length ? String(cursor + limit) : null;
    res.json({ items: paged, nextCursor, hasMore: !!nextCursor });
  });
  app.patch("/api/alerts/:id", (req, res) => {
    const idx = mockAlerts.findIndex((a) => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: "Alert not found" });
    const alert = mockAlerts[idx];
    if (req.body.status) alert.status = req.body.status;
    alert.updatedAt = new Date().toISOString();
    res.json(alert);
  });

  // Existing stubs
  app.get("/api/links", (req, res) => res.json([]));
  app.get("/api/campaigns", (req, res) => res.json([]));
  app.get("/api/social/accounts", (req, res) => res.json([]));
};
