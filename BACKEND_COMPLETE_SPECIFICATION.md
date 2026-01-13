# BACKEND COMPLETE SPECIFICATION

## Overview

This document specifies all backend API endpoints, database schemas, and business logic needed to support the complete GrowPath platform. Frontend is 100% complete and ready for API integration.

**Backend Status:** Ready for implementation
**Frontend Status:** 100% Complete - All screens, navigation, auth, and tests ready
**Database:** MongoDB + Mongoose
**API Base URL:** http://127.0.0.1:5001/api
**Authentication:** Bearer token JWT (validated in API client)

---

## I. AUTHENTICATION ENDPOINTS

### POST /auth/register

Create new user account.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "Password123",
  "displayName": "John Doe",
  "role": "cultivator" // "cultivator" or "commercial"
}
```

**Response:**

```json
{
  "token": "eyJhbGc...",
  "user": {
    "_id": "user-1",
    "email": "user@example.com",
    "displayName": "John Doe",
    "role": "cultivator",
    "isCommercial": false,
    "facilitiesAccess": [],
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### POST /auth/login

Authenticate user and return token.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Response:**

```json
{
  "token": "eyJhbGc...",
  "user": {
    "_id": "user-1",
    "email": "user@example.com",
    "displayName": "John Doe",
    "role": "cultivator",
    "isCommercial": false,
    "facilitiesAccess": [
      {
        "facilityId": "facility-1",
        "role": "admin",
        "permissions": ["read", "write", "delete"]
      }
    ],
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### GET /auth/me

Get current authenticated user.

**Response:**

```json
{
  "_id": "user-1",
  "email": "user@example.com",
  "displayName": "John Doe",
  "role": "cultivator",
  "isCommercial": false,
  "facilitiesAccess": [
    {
      "facilityId": "facility-1",
      "role": "admin",
      "permissions": ["read", "write", "delete"]
    }
  ],
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

## II. FACILITY ENDPOINTS

### GET /facilities

List facilities user has access to.

**Query Parameters:**

- `skip` (number, default 0)
- `limit` (number, default 20)

**Response:**

```json
{
  "facilities": [
    {
      "_id": "facility-1",
      "name": "Main Grow House",
      "address": "123 Growing Lane",
      "city": "Denver",
      "state": "CO",
      "zipCode": "80202",
      "owner": "user-1",
      "type": "indoor", // "indoor", "outdoor", "greenhouse", "vertical"
      "area": 5000,
      "areaUnit": "sqft",
      "metrcLicenseNumber": "LIC123456",
      "metrcConnected": true,
      "maxCapacity": 150,
      "currentPlantCount": 42,
      "rooms": ["room-1", "room-2"],
      "plants": ["plant-1", "plant-2"],
      "equipment": ["equip-1"],
      "members": ["user-1", "user-2"],
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1
}
```

### GET /facilities/:id

Get facility details by ID.

**Response:**

```json
{
  "_id": "facility-1",
  "name": "Main Grow House",
  "address": "123 Growing Lane",
  "city": "Denver",
  "state": "CO",
  "zipCode": "80202",
  "owner": "user-1",
  "type": "indoor",
  "area": 5000,
  "areaUnit": "sqft",
  "metrcLicenseNumber": "LIC123456",
  "metrcConnected": true,
  "maxCapacity": 150,
  "currentPlantCount": 42,
  "rooms": ["room-1", "room-2"],
  "plants": ["plant-1", "plant-2"],
  "equipment": ["equip-1"],
  "members": ["user-1", "user-2"],
  "createdAt": "2024-01-01T10:00:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### POST /facilities

Create new facility.

**Request:**

```json
{
  "name": "Main Grow House",
  "address": "123 Growing Lane",
  "city": "Denver",
  "state": "CO",
  "zipCode": "80202",
  "type": "indoor",
  "area": 5000,
  "areaUnit": "sqft",
  "maxCapacity": 150
}
```

**Response:** (same as GET /facilities/:id)

### PUT /facilities/:id

Update facility.

**Request & Response:** (same schema as POST)

### DELETE /facilities/:id

Delete facility.

**Response:**

```json
{
  "success": true,
  "message": "Facility deleted successfully"
}
```

---

## III. EQUIPMENT ENDPOINTS

### GET /facilities/:facilityId/equipment

List equipment in facility.

**Query Parameters:**

- `skip` (number, default 0)
- `limit` (number, default 20)
- `type` (string, optional: filter by equipment type)

**Response:**

```json
{
  "equipment": [
    {
      "_id": "equip-1",
      "facilityId": "facility-1",
      "name": "LED Grow Light Panel",
      "type": "lighting", // "lighting", "hvac", "watering", "monitoring", "other"
      "manufacturer": "GrowLux",
      "model": "GL-3000",
      "serialNumber": "SN123456",
      "purchaseDate": "2023-06-01",
      "cost": 1500,
      "warrantyExpiry": "2025-06-01",
      "location": "room-1",
      "powerUsage": 300, // watts
      "operatingHours": 2500,
      "maintenanceSchedule": 500,
      "nextMaintenance": "2024-02-01",
      "notes": "Recently calibrated",
      "createdAt": "2023-06-01T10:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1
}
```

### GET /facilities/:facilityId/equipment/:id

Get equipment details.

**Response:** (single equipment object from list above)

### POST /facilities/:facilityId/equipment

Create equipment.

**Request:**

```json
{
  "name": "LED Grow Light Panel",
  "type": "lighting",
  "manufacturer": "GrowLux",
  "model": "GL-3000",
  "serialNumber": "SN123456",
  "purchaseDate": "2023-06-01",
  "cost": 1500,
  "warrantyExpiry": "2025-06-01",
  "location": "room-1",
  "powerUsage": 300,
  "maintenanceSchedule": 500,
  "nextMaintenance": "2024-02-01",
  "notes": "Recently calibrated"
}
```

**Response:** (single equipment object)

### PUT /facilities/:facilityId/equipment/:id

Update equipment.

**Request & Response:** (same as POST)

### DELETE /facilities/:facilityId/equipment/:id

Delete equipment.

**Response:**

```json
{
  "success": true,
  "message": "Equipment deleted successfully"
}
```

---

## IV. PLANTS ENDPOINTS

### GET /plants

List plants (user's facilities only).

**Query Parameters:**

- `facilityId` (string, required for scoping)
- `skip` (number, default 0)
- `limit` (number, default 20)
- `stage` (string, optional: filter by growth stage)

**Response:**

```json
{
  "plants": [
    {
      "_id": "plant-1",
      "facilityId": "facility-1",
      "strain": "OG Kush",
      "plantDate": "2024-01-01",
      "stage": "vegetative", // "seedling", "vegetative", "flowering", "harvest", "archived"
      "location": "room-1",
      "parentPlantId": null,
      "lineage": "OG Kush x Wedding Cake",
      "notes": "Mother plant, vigorous growth",
      "healthStatus": "excellent", // "excellent", "good", "fair", "poor"
      "tags": ["mother", "auto-flowering"],
      "logs": ["log-1", "log-2"],
      "images": ["image-1"],
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1
}
```

### GET /plants/:id

Get plant details.

**Response:** (single plant object from list above)

### GET /plants/:id/logs

Get plant logs/growth history.

**Query Parameters:**

- `skip` (number, default 0)
- `limit` (number, default 20)

**Response:**

```json
{
  "logs": [
    {
      "_id": "log-1",
      "plantId": "plant-1",
      "date": "2024-01-05T10:00:00Z",
      "stageAtTime": "seedling",
      "height": 2.5, // inches
      "healthNotes": "Strong growth, no pests observed",
      "actionTaken": "Watered with 500ml nutrient solution",
      "tags": ["watering", "healthy"],
      "images": ["image-1"]
    }
  ],
  "total": 5
}
```

### POST /plants

Create plant.

**Request:**

```json
{
  "strain": "OG Kush",
  "plantDate": "2024-01-01",
  "location": "room-1",
  "lineage": "OG Kush x Wedding Cake",
  "notes": "Mother plant, vigorous growth",
  "tags": ["mother"],
  "facilityId": "facility-1"
}
```

**Response:** (single plant object)

### POST /plants/:id/logs

Create plant log.

**Request:**

```json
{
  "date": "2024-01-05T10:00:00Z",
  "height": 2.5,
  "healthNotes": "Strong growth, no pests observed",
  "actionTaken": "Watered with 500ml nutrient solution",
  "tags": ["watering", "healthy"]
}
```

**Response:** (single log object)

### PUT /plants/:id

Update plant.

**Request & Response:** (same as POST /plants)

### DELETE /plants/:id

Delete plant.

**Response:**

```json
{
  "success": true,
  "message": "Plant deleted successfully"
}
```

---

## V. GROW LOG ENDPOINTS

### GET /growlog

List grow logs with search/filtering.

**Query Parameters:**

- `facilityId` (string, required)
- `keyword` (string, optional: search content)
- `dateFrom` (ISO date, optional)
- `dateTo` (ISO date, optional)
- `tags` (comma-separated, optional)
- `skip` (number, default 0)
- `limit` (number, default 20)

**Response:**

```json
{
  "logs": [
    {
      "_id": "growlog-1",
      "facilityId": "facility-1",
      "title": "Week 2 Update - Plants looking great",
      "content": "All plants showing healthy growth...",
      "date": "2024-01-05T10:00:00Z",
      "tags": ["update", "healthy"],
      "author": "user-1",
      "images": ["image-1"],
      "attachments": [],
      "createdAt": "2024-01-05T10:00:00Z",
      "updatedAt": "2024-01-05T10:00:00Z"
    }
  ],
  "total": 1
}
```

### GET /growlog/:id

Get grow log details.

**Response:** (single log object from list above)

### POST /growlog

Create grow log.

**Request:**

```json
{
  "facilityId": "facility-1",
  "title": "Week 2 Update - Plants looking great",
  "content": "All plants showing healthy growth...",
  "date": "2024-01-05T10:00:00Z",
  "tags": ["update", "healthy"]
}
```

**Response:** (single log object)

### POST /growlog/:id/auto-tag

Generate AI-powered tags for log content.

**Response:**

```json
{
  "suggestedTags": ["watering", "nutrient-deficiency", "pest-control", "flowering"],
  "confidence": 0.95
}
```

### PUT /growlog/:id

Update grow log.

**Request & Response:** (same as POST)

### DELETE /growlog/:id

Delete grow log.

**Response:**

```json
{
  "success": true,
  "message": "Grow log deleted successfully"
}
```

---

## VI. ROOMS ENDPOINTS

### GET /facilities/:facilityId/rooms

List rooms in facility.

**Query Parameters:**

- `skip` (number, default 0)
- `limit` (number, default 20)

**Response:**

```json
{
  "rooms": [
    {
      "_id": "room-1",
      "facilityId": "facility-1",
      "name": "Veg Room",
      "description": "Vegetative growth chamber",
      "type": "vegetative", // "vegetative", "flowering", "seedling", "drying", "storage", "other"
      "area": 1000,
      "areaUnit": "sqft",
      "temperature": 72,
      "humidity": 65,
      "equipment": ["equip-1", "equip-2"],
      "plants": ["plant-1", "plant-2"],
      "notes": "Recently upgraded lighting",
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 2
}
```

### GET /facilities/:facilityId/rooms/:id

Get room details.

**Response:** (single room object)

### POST /facilities/:facilityId/rooms

Create room.

**Request:**

```json
{
  "name": "Veg Room",
  "description": "Vegetative growth chamber",
  "type": "vegetative",
  "area": 1000,
  "areaUnit": "sqft",
  "temperature": 72,
  "humidity": 65,
  "notes": "Recently upgraded lighting"
}
```

**Response:** (single room object)

### PUT /facilities/:facilityId/rooms/:id

Update room.

**Request & Response:** (same as POST)

### DELETE /facilities/:facilityId/rooms/:id

Delete room.

**Response:**

```json
{
  "success": true,
  "message": "Room deleted successfully"
}
```

---

## VII. TASKS ENDPOINTS

### GET /tasks

List tasks for authenticated user.

**Query Parameters:**

- `facilityId` (string, optional: filter by facility)
- `status` (string, optional: "pending", "completed", "overdue")
- `assignedTo` (string, optional: user ID)
- `skip` (number, default 0)
- `limit` (number, default 20)

**Response:**

```json
{
  "tasks": [
    {
      "_id": "task-1",
      "facilityId": "facility-1",
      "title": "Water plants",
      "description": "Check soil moisture and water as needed",
      "dueDate": "2024-01-16T10:00:00Z",
      "priority": "high", // "low", "medium", "high", "critical"
      "status": "pending", // "pending", "completed", "overdue"
      "assignedTo": "user-2",
      "assignedBy": "user-1",
      "recurrence": null, // null or "daily", "weekly", "monthly"
      "completedAt": null,
      "notes": "Check for pests",
      "createdAt": "2024-01-10T10:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1
}
```

### GET /tasks/:id

Get task details.

**Response:** (single task object)

### POST /tasks

Create task.

**Request:**

```json
{
  "facilityId": "facility-1",
  "title": "Water plants",
  "description": "Check soil moisture and water as needed",
  "dueDate": "2024-01-16T10:00:00Z",
  "priority": "high",
  "assignedTo": "user-2",
  "recurrence": null,
  "notes": "Check for pests"
}
```

**Response:** (single task object)

### PUT /tasks/:id

Update task.

**Request & Response:** (same as POST)

### PUT /tasks/:id/complete

Mark task as complete.

**Request:**

```json
{
  "completedAt": "2024-01-16T10:00:00Z",
  "completionNotes": "All plants watered successfully"
}
```

**Response:** (single task with status: "completed", completedAt timestamp)

### DELETE /tasks/:id

Delete task.

**Response:**

```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

---

## VIII. TEAM/USERS ENDPOINTS

### GET /facilities/:facilityId/team

List team members in facility.

**Query Parameters:**

- `skip` (number, default 0)
- `limit` (number, default 20)

**Response:**

```json
{
  "members": [
    {
      "_id": "user-1",
      "email": "admin@example.com",
      "displayName": "Admin User",
      "role": "admin", // "admin", "manager", "member", "viewer"
      "joinedDate": "2024-01-01T10:00:00Z",
      "lastActive": "2024-01-15T10:30:00Z",
      "permissions": ["read", "write", "delete", "admin"]
    }
  ],
  "total": 2
}
```

### POST /facilities/:facilityId/team/invite

Invite user to facility.

**Request:**

```json
{
  "email": "newmember@example.com",
  "role": "member",
  "permissions": ["read", "write"]
}
```

**Response:**

```json
{
  "invitationId": "invite-1",
  "email": "newmember@example.com",
  "role": "member",
  "status": "pending",
  "inviteToken": "token123",
  "expiresAt": "2024-01-22T10:00:00Z"
}
```

### DELETE /facilities/:facilityId/team/:userId

Remove member from facility.

**Response:**

```json
{
  "success": true,
  "message": "User removed from facility"
}
```

### PUT /facilities/:facilityId/team/:userId

Update team member role/permissions.

**Request:**

```json
{
  "role": "manager",
  "permissions": ["read", "write"]
}
```

**Response:** (updated member object)

---

## IX. AUDIT LOG ENDPOINTS

### GET /facilities/:facilityId/audit

List audit logs for facility.

**Query Parameters:**

- `userEmail` (string, optional: filter by user)
- `action` (string, optional: filter by action type)
- `dateFrom` (ISO date, optional)
- `dateTo` (ISO date, optional)
- `skip` (number, default 0)
- `limit` (number, default 20)

**Response:**

```json
{
  "logs": [
    {
      "_id": "audit-1",
      "facilityId": "facility-1",
      "user": {
        "_id": "user-1",
        "email": "user@example.com",
        "displayName": "Admin User"
      },
      "action": "created", // "created", "updated", "deleted", "viewed", "exported"
      "resourceType": "plant", // "facility", "plant", "equipment", "room", "task", "user"
      "resourceId": "plant-1",
      "resourceName": "OG Kush",
      "changes": {
        "stage": { "from": "seedling", "to": "vegetative" }
      },
      "timestamp": "2024-01-15T10:30:00Z",
      "ipAddress": "192.168.1.1"
    }
  ],
  "total": 1
}
```

---

## X. SOP TEMPLATE ENDPOINTS

### GET /facilities/:facilityId/sop

List SOP templates for facility.

**Query Parameters:**

- `skip` (number, default 0)
- `limit` (number, default 20)

**Response:**

```json
{
  "sops": [
    {
      "_id": "sop-1",
      "facilityId": "facility-1",
      "title": "Daily Watering Procedure",
      "description": "Standard operating procedure for daily plant watering",
      "content": "1. Check soil moisture...",
      "version": 1,
      "createdBy": "user-1",
      "lastModifiedBy": "user-1",
      "steps": [
        {
          "stepNumber": 1,
          "title": "Check Soil Moisture",
          "instructions": "Use moisture meter to check soil",
          "duration": "5 minutes"
        }
      ],
      "createdAt": "2024-01-01T10:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1
}
```

### GET /facilities/:facilityId/sop/:id

Get SOP template details.

**Response:** (single SOP object)

### POST /facilities/:facilityId/sop

Create SOP template.

**Request:**

```json
{
  "title": "Daily Watering Procedure",
  "description": "Standard operating procedure for daily plant watering",
  "content": "1. Check soil moisture...",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Check Soil Moisture",
      "instructions": "Use moisture meter to check soil",
      "duration": "5 minutes"
    }
  ]
}
```

**Response:** (single SOP object)

### PUT /facilities/:facilityId/sop/:id

Update SOP template (creates new version).

**Request & Response:** (same as POST)

### DELETE /facilities/:facilityId/sop/:id

Delete SOP template.

**Response:**

```json
{
  "success": true,
  "message": "SOP template deleted successfully"
}
```

---

## XI. VERIFICATION ENDPOINTS

### GET /facilities/:facilityId/verification

List verification records.

**Query Parameters:**

- `status` (string, optional: "pending", "verified", "rejected")
- `dateFrom` (ISO date, optional)
- `dateTo` (ISO date, optional)
- `skip` (number, default 0)
- `limit` (number, default 20)

**Response:**

```json
{
  "records": [
    {
      "_id": "verify-1",
      "facilityId": "facility-1",
      "batchId": "batch-123",
      "recordType": "growlog", // "growlog", "harvest", "test", "inventory"
      "recordId": "growlog-1",
      "recordTitle": "Week 2 Update",
      "status": "pending", // "pending", "verified", "rejected"
      "verifiedBy": null,
      "verificationDate": null,
      "rejectionReason": null,
      "notes": "Awaiting manager review",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 1
}
```

### POST /facilities/:facilityId/verification/:recordId

Approve/verify record.

**Request:**

```json
{
  "status": "verified",
  "notes": "Record approved"
}
```

**Response:** (updated verification record with status: "verified", verificationDate)

### PUT /facilities/:facilityId/verification/:recordId/reject

Reject verification record.

**Request:**

```json
{
  "rejectionReason": "Data incomplete - missing images"
}
```

**Response:** (updated verification record with status: "rejected", rejectionReason)

---

## XII. DEVIATION ENDPOINTS

### GET /facilities/:facilityId/deviations

List deviation/incident records.

**Query Parameters:**

- `status` (string, optional: "open", "resolved", "archived")
- `severity` (string, optional: "low", "medium", "high", "critical")
- `dateFrom` (ISO date, optional)
- `dateTo` (ISO date, optional)
- `skip` (number, default 0)
- `limit` (number, default 20)

**Response:**

```json
{
  "deviations": [
    {
      "_id": "dev-1",
      "facilityId": "facility-1",
      "title": "Equipment malfunction detected",
      "description": "LED light panel not responding to controller",
      "severity": "high", // "low", "medium", "high", "critical"
      "status": "open", // "open", "resolved", "archived"
      "reportedBy": "user-2",
      "reportedDate": "2024-01-15T10:00:00Z",
      "rootCause": null,
      "actionTaken": null,
      "resolvedDate": null,
      "resolvedBy": null,
      "preventiveMeasures": null,
      "attachments": []
    }
  ],
  "total": 1
}
```

### GET /facilities/:facilityId/deviations/:id

Get deviation details.

**Response:** (single deviation object)

### POST /facilities/:facilityId/deviations

Create deviation record.

**Request:**

```json
{
  "title": "Equipment malfunction detected",
  "description": "LED light panel not responding to controller",
  "severity": "high"
}
```

**Response:** (single deviation object)

### PUT /facilities/:facilityId/deviations/:id/resolve

Resolve deviation.

**Request:**

```json
{
  "rootCause": "Power supply failure",
  "actionTaken": "Replaced PSU with new unit",
  "preventiveMeasures": "Monthly power supply inspection"
}
```

**Response:** (updated deviation with status: "resolved", resolvedDate, resolvedBy)

### DELETE /facilities/:facilityId/deviations/:id

Delete deviation.

**Response:**

```json
{
  "success": true,
  "message": "Deviation record deleted successfully"
}
```

---

## XIII. GREEN WASTE ENDPOINTS

### GET /facilities/:facilityId/green-waste

List green waste logs.

**Query Parameters:**

- `dateFrom` (ISO date, optional)
- `dateTo` (ISO date, optional)
- `skip` (number, default 0)
- `limit` (number, default 20)

**Response:**

```json
{
  "logs": [
    {
      "_id": "waste-1",
      "facilityId": "facility-1",
      "date": "2024-01-15T10:00:00Z",
      "materialType": "plant_matter", // "plant_matter", "soil", "packaging", "water", "other"
      "weight": 25, // lbs
      "unit": "lbs",
      "description": "Pruned leaves and stems from flowering room",
      "disposalMethod": "compost", // "compost", "incinerate", "landfill", "recycle", "other"
      "approvedBy": "user-1",
      "manifesto": "WM123456",
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 1
}
```

### GET /facilities/:facilityId/green-waste/:id

Get green waste log details.

**Response:** (single log object)

### POST /facilities/:facilityId/green-waste

Create green waste log.

**Request:**

```json
{
  "date": "2024-01-15T10:00:00Z",
  "materialType": "plant_matter",
  "weight": 25,
  "unit": "lbs",
  "description": "Pruned leaves and stems from flowering room",
  "disposalMethod": "compost",
  "manifesto": "WM123456"
}
```

**Response:** (single log object)

### DELETE /facilities/:facilityId/green-waste/:id

Delete green waste log.

**Response:**

```json
{
  "success": true,
  "message": "Green waste log deleted successfully"
}
```

---

## XIV. VENDOR ENDPOINTS (Commercial)

### GET /vendors

List vendors.

**Query Parameters:**

- `facilityId` (string, optional: filter by facility)
- `skip` (number, default 0)
- `limit` (number, default 20)

**Response:**

```json
{
  "vendors": [
    {
      "_id": "vendor-1",
      "name": "GrowLux Supplies",
      "type": "equipment", // "equipment", "nutrients", "seeds", "consulting", "other"
      "contactEmail": "sales@growlux.com",
      "contactPhone": "555-1234",
      "website": "https://growlux.com",
      "address": "123 Industrial Ave",
      "city": "Denver",
      "state": "CO",
      "zipCode": "80202",
      "rating": 4.5,
      "reviews": 12,
      "recentOrders": 3,
      "notes": "Reliable supplier, good pricing",
      "createdAt": "2024-01-01T10:00:00Z"
    }
  ],
  "total": 1
}
```

### GET /vendors/:id

Get vendor details.

**Response:** (single vendor object)

### POST /vendors

Create vendor record.

**Request:**

```json
{
  "name": "GrowLux Supplies",
  "type": "equipment",
  "contactEmail": "sales@growlux.com",
  "contactPhone": "555-1234",
  "website": "https://growlux.com",
  "address": "123 Industrial Ave",
  "city": "Denver",
  "state": "CO",
  "zipCode": "80202",
  "notes": "Reliable supplier, good pricing"
}
```

**Response:** (single vendor object)

### PUT /vendors/:id

Update vendor.

**Request & Response:** (same as POST)

### DELETE /vendors/:id

Delete vendor.

**Response:**

```json
{
  "success": true,
  "message": "Vendor deleted successfully"
}
```

---

## Implementation Priority

1. **Phase 1 (Critical):** Auth + Facility endpoints
2. **Phase 2:** Equipment endpoints
3. **Phase 3:** Plants endpoints
4. **Phase 4:** Grow Log endpoints
5. **Phase 5:** Rooms, Tasks, Team endpoints
6. **Phase 6:** Audit + SOP endpoints
7. **Phase 7:** Verification, Deviation, Green Waste endpoints
8. **Phase 8:** Vendor endpoints (Commercial)

---

## Database Models (MongoDB)

### User Collection

```javascript
{
  _id: ObjectId,
  email: String (unique),
  password: String (hashed),
  displayName: String,
  role: String, // "cultivator", "commercial"
  isCommercial: Boolean,
  facilitiesAccess: [{
    facilityId: ObjectId,
    role: String, // "admin", "manager", "member", "viewer"
    permissions: [String]
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### Facility Collection

```javascript
{
  _id: ObjectId,
  name: String,
  address: String,
  city: String,
  state: String,
  zipCode: String,
  owner: ObjectId (User),
  type: String, // "indoor", "outdoor", "greenhouse", "vertical"
  area: Number,
  areaUnit: String,
  metrcLicenseNumber: String,
  metrcConnected: Boolean,
  maxCapacity: Number,
  currentPlantCount: Number,
  rooms: [ObjectId],
  plants: [ObjectId],
  equipment: [ObjectId],
  members: [ObjectId],
  createdAt: Date,
  updatedAt: Date
}
```

### Equipment Collection

```javascript
{
  _id: ObjectId,
  facilityId: ObjectId,
  name: String,
  type: String,
  manufacturer: String,
  model: String,
  serialNumber: String,
  purchaseDate: Date,
  cost: Number,
  warrantyExpiry: Date,
  location: String,
  powerUsage: Number,
  operatingHours: Number,
  maintenanceSchedule: Number,
  nextMaintenance: Date,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Plant Collection

```javascript
{
  _id: ObjectId,
  facilityId: ObjectId,
  strain: String,
  plantDate: Date,
  stage: String,
  location: String,
  parentPlantId: ObjectId,
  lineage: String,
  notes: String,
  healthStatus: String,
  tags: [String],
  logs: [ObjectId],
  images: [String],
  createdAt: Date,
  updatedAt: Date
}
```

### Plant Log Collection

```javascript
{
  _id: ObjectId,
  plantId: ObjectId,
  date: Date,
  stageAtTime: String,
  height: Number,
  healthNotes: String,
  actionTaken: String,
  tags: [String],
  images: [String]
}
```

### Grow Log Collection

```javascript
{
  _id: ObjectId,
  facilityId: ObjectId,
  title: String,
  content: String,
  date: Date,
  tags: [String],
  author: ObjectId (User),
  images: [String],
  attachments: [String],
  createdAt: Date,
  updatedAt: Date
}
```

### Room Collection

```javascript
{
  _id: ObjectId,
  facilityId: ObjectId,
  name: String,
  description: String,
  type: String,
  area: Number,
  areaUnit: String,
  temperature: Number,
  humidity: Number,
  equipment: [ObjectId],
  plants: [ObjectId],
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Task Collection

```javascript
{
  _id: ObjectId,
  facilityId: ObjectId,
  title: String,
  description: String,
  dueDate: Date,
  priority: String,
  status: String,
  assignedTo: ObjectId (User),
  assignedBy: ObjectId (User),
  recurrence: String,
  completedAt: Date,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

### Audit Log Collection

```javascript
{
  _id: ObjectId,
  facilityId: ObjectId,
  user: {
    _id: ObjectId,
    email: String,
    displayName: String
  },
  action: String,
  resourceType: String,
  resourceId: ObjectId,
  resourceName: String,
  changes: Object,
  timestamp: Date,
  ipAddress: String
}
```

### SOP Template Collection

```javascript
{
  _id: ObjectId,
  facilityId: ObjectId,
  title: String,
  description: String,
  content: String,
  version: Number,
  createdBy: ObjectId (User),
  lastModifiedBy: ObjectId (User),
  steps: [{
    stepNumber: Number,
    title: String,
    instructions: String,
    duration: String
  }],
  createdAt: Date,
  updatedAt: Date
}
```

### Verification Collection

```javascript
{
  _id: ObjectId,
  facilityId: ObjectId,
  batchId: String,
  recordType: String,
  recordId: ObjectId,
  recordTitle: String,
  status: String,
  verifiedBy: ObjectId (User),
  verificationDate: Date,
  rejectionReason: String,
  notes: String,
  createdAt: Date
}
```

### Deviation Collection

```javascript
{
  _id: ObjectId,
  facilityId: ObjectId,
  title: String,
  description: String,
  severity: String,
  status: String,
  reportedBy: ObjectId (User),
  reportedDate: Date,
  rootCause: String,
  actionTaken: String,
  resolvedDate: Date,
  resolvedBy: ObjectId (User),
  preventiveMeasures: String,
  attachments: [String]
}
```

### Green Waste Collection

```javascript
{
  _id: ObjectId,
  facilityId: ObjectId,
  date: Date,
  materialType: String,
  weight: Number,
  unit: String,
  description: String,
  disposalMethod: String,
  approvedBy: ObjectId (User),
  manifesto: String,
  createdAt: Date
}
```

### Vendor Collection

```javascript
{
  _id: ObjectId,
  name: String,
  type: String,
  contactEmail: String,
  contactPhone: String,
  website: String,
  address: String,
  city: String,
  state: String,
  zipCode: String,
  rating: Number,
  reviews: Number,
  recentOrders: Number,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Authentication & Security

- All endpoints require Bearer token in Authorization header (except /auth/register and /auth/login)
- Tokens are JWT with 24-hour expiration
- Passwords hashed with bcrypt (salt rounds: 10)
- All facility-scoped endpoints validate user's facilitiesAccess array
- Audit logs created for all data mutations
- Role-based permission checking on all write operations

---

## Response Format

All successful responses include HTTP 200 status code with JSON body.

Error responses:

```json
{
  "error": true,
  "message": "Error description",
  "status": 400 // or 401, 403, 404, 500
}
```

Common status codes:

- 200: Success
- 201: Created
- 400: Bad Request (validation error)
- 401: Unauthorized (missing/invalid token)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 500: Server Error

---

## Frontend Integration Ready

Frontend is 100% complete with:

- All screens and navigation implemented
- API clients for all 14 endpoint groups
- Playwright E2E tests for all features
- Role-based access control
- Facility scoping on all requests
- Error handling and loading states

To test: `npm run test:all` or `node scripts/run-all-tests.js`

Backend should implement endpoints in phase order (1-8) and update IMPLEMENTATION_STATUS.md as each phase completes.
