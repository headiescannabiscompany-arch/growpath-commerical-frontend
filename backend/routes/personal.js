// backend/routes/personal.js
const express = require("express");
const router = express.Router();

// Mock data for personal mode grows
const mockGrows = [
  {
    id: "grow-1",
    name: "Indoor Blueberry V1",
    startDate: "2025-11-15",
    strain: "Blueberry OG",
    location: "Tent 1 (4x4)",
    status: "vegetating",
    createdAt: new Date("2025-11-15").toISOString(),
    updatedAt: new Date("2026-02-06").toISOString()
  },
  {
    id: "grow-2",
    name: "Outdoor Tomato 2026",
    startDate: "2026-01-20",
    strain: "Cherry Tomato",
    location: "South Garden",
    status: "vegetating",
    createdAt: new Date("2026-01-20").toISOString(),
    updatedAt: new Date("2026-02-05").toISOString()
  }
];

// Mock data for personal mode logs
const mockLogs = [
  {
    id: "log-1",
    growId: "grow-1",
    date: "2026-02-06",
    title: "Day 84 - RH trending up",
    notes: "Increased VPD slightly, monitoring for mold. Temperature 76°F, RH 62%.",
    createdAt: new Date("2026-02-06T14:30:00").toISOString(),
    updatedAt: new Date("2026-02-06T14:30:00").toISOString()
  },
  {
    id: "log-2",
    growId: "grow-1",
    date: "2026-02-05",
    title: "Day 83 - Increased feeding",
    notes: "Added extra nitrogen to reservoir. Parameters stable.",
    createdAt: new Date("2026-02-05T10:15:00").toISOString(),
    updatedAt: new Date("2026-02-05T10:15:00").toISOString()
  },
  {
    id: "log-3",
    growId: "grow-2",
    date: "2026-02-04",
    title: "Initial setup",
    notes: "Planted seedlings in raised beds. Soil pH 6.5, well-draining mix.",
    createdAt: new Date("2026-02-04T09:00:00").toISOString(),
    updatedAt: new Date("2026-02-04T09:00:00").toISOString()
  }
];

// Mock data for personal mode tasks
const mockTasks = [
  {
    id: "task-1",
    growId: "grow-1",
    title: "Check water level",
    description: "Top off reservoir if below 50%",
    dueDate: "2026-02-07",
    completed: false,
    createdAt: new Date("2026-02-06").toISOString()
  },
  {
    id: "task-2",
    growId: "grow-1",
    title: "EC/pH check",
    description: "Test nutrient solution pH and electrical conductivity",
    dueDate: "2026-02-08",
    completed: false,
    createdAt: new Date("2026-02-06").toISOString()
  },
  {
    id: "task-3",
    growId: "grow-2",
    title: "Install drip irrigation",
    description: "Set up drip lines for tomato plants",
    dueDate: "2026-02-10",
    completed: false,
    createdAt: new Date("2026-02-06").toISOString()
  }
];

// GET /api/personal/grows
// Returns all grows for authenticated user (personal mode)
router.get("/grows", async (req, res) => {
  try {
    // In real backend: const userId = req.user?.id; verify auth
    // For now, return demo data for personal mode
    return res.json({
      ok: true,
      data: {
        grows: mockGrows
      }
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch grows"
      }
    });
  }
});

// GET /api/personal/logs
// Returns logs for authenticated user, optionally filtered by growId
// Query params: ?growId=<id>
router.get("/logs", async (req, res) => {
  try {
    const { growId } = req.query;

    let results = mockLogs;
    if (growId) {
      results = mockLogs.filter((log) => log.growId === growId);
    }

    return res.json({
      ok: true,
      data: {
        logs: results
      }
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch logs"
      }
    });
  }
});

// GET /api/personal/tasks
// Returns tasks for authenticated user, optionally filtered by growId
// Query params: ?growId=<id>
router.get("/tasks", async (req, res) => {
  try {
    const { growId } = req.query;

    let results = mockTasks;
    if (growId) {
      results = mockTasks.filter((task) => task.growId === growId);
    }

    return res.json({
      ok: true,
      data: {
        tasks: results
      }
    });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch tasks"
      }
    });
  }
});

module.exports = router;
