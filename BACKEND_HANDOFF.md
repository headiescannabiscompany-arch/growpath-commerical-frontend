# Backend Handoff: CoursesScreen.js

## Overview

This document summarizes all backend API requirements, integration points, and expected data structures for CoursesScreen.js. The frontend is fully stubbed and ready for backend integration.

---

## API Endpoints Needed

### 1. Fetch Courses

- **Endpoint:** `GET /api/courses`
- **Returns:** Array of course objects
- **Course Object Example:**
  ```json
  {
    "_id": "string",
    "title": "string",
    "creator": "string",
    "thumbnail": "string (url)",
    "priceCents": 0,
    "lessons": [ ... ],
    "analytics": { "views": 0, "enrollments": 0 },
    "isPublished": true|false
  }
  ```
- **Plan-based filtering:**
  - Free: Only courses with `priceCents === 0`
  - Pro/Influencer/Commercial/Facility: All courses

### 2. Invite User (Facility)

- **Endpoint:** `POST /api/invite`
- **Body:** `{ name: string, role: "admin"|"manager"|"staff"|"learner" }`
- **Returns:** Success/failure

### 3. Change User Role (Facility)

- **Endpoint:** `PUT /api/users/:userId/role`
- **Body:** `{ role: "admin"|"manager"|"staff"|"learner" }`
- **Returns:** Success/failure

### 4. Remove User (Facility)

- **Endpoint:** `DELETE /api/users/:userId`
- **Returns:** Success/failure

### 5. Export Compliance Metrics (Facility)

- **Endpoint:** `GET /api/compliance/export?format=csv|pdf`
- **Returns:** File download (CSV or PDF)

### 6. Publish/Unpublish Course (Influencer)

- **Endpoint:**
  - Publish: `POST /api/courses/:courseId/publish`
  - Unpublish: `POST /api/courses/:courseId/unpublish`
- **Returns:** Success/failure

---

## Integration Points in CoursesScreen.js

- All API calls are stubbed with TODOs and ready for implementation.
- All modals (invite, role change, remove, export) are wired to open/close logic and expect backend responses for feedback.
- Action feedback is displayed to the user after each backend action.
- Plan logic and UI are fully testable via the QA plan switcher.

---

## Data/State Expectations

- Courses are expected to have analytics, publishing state, and price.
- Facility user management expects user objects with `_id`, `name`, and `role`.
- All actions should return clear success/failure responses for user feedback.

---

## Next Steps

- Implement the above endpoints and connect them to the stubbed functions in CoursesScreen.js.
- Ensure CORS and authentication are handled for all endpoints.
- Notify frontend of any changes to data shape or endpoint URLs.

---

## Contact

For any questions or clarifications, please reach out to the frontend team.

---

**Frontend is ready for backend integration.**
