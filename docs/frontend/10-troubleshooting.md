# Troubleshooting Guide

## Common Issues

### CORS Errors

- Ensure EXPO_PUBLIC_API_BASE_URL matches backend CORS allowlist
- Backend must not use wildcard CORS in production

### 401 Unauthorized

- Token missing/expired/invalid
- Clear token and redirect to login

### 403 Forbidden

- User lacks required role or facility access
- Show permission error, do not log out

### 404 Not Found

- Wrong endpoint or facilityId
- Facility may be deleted or user not a member

### 422 Validation Error

- Show field-level errors in forms

### 429 Rate Limited

- Back off and show user-friendly message

### 500 Server Error

- Show requestId and generic error message

## Request ID

- Always capture x-request-id from API responses
- Include in bug reports and error UI
