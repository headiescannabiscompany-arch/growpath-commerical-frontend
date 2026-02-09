# Backend Error Envelope Contract (Locked)

This contract is now finalized and regression-tested.

All error responses (including 404s, validation errors, and internal errors) use the same shape:

```
{
  "success": false,
  "error": {
    "code": "SOME_ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

**Important guarantees:**

- The response body will never include `requestId`
- A correlation ID is provided only via the response header: `x-request-id`
- This envelope is consistent across all endpoints and all environments
- The contract is covered by automated tests and will not change without a coordinated version bump

**Frontend guidance:**

- Always read errors from `response.error.code` and `response.error.message`
- If correlation is needed for logging or bug reports, read `x-request-id` from response headers
- Do not expect or parse `requestId` from the JSON body

If you want, I can also:

- Add a short frontend utility helper (`parseApiError(res)`)
- Review existing frontend error handling for alignment
- Add this to a shared `/docs/contracts/errors.md`

Just say the word.
