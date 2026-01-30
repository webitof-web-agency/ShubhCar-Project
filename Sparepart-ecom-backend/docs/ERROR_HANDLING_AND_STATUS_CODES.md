# Error Handling & Status Codes

## Error Response Format
All API errors follow a standardized JSON structure. Middleware automatically catches exceptions and formats them.

```json
{
  "success": false,
  "status": 400,
  "message": "Human readable error message",
  "errorCode": "INVALID_INPUT_DATA",
  "stack": "..." // Only in Development
}
```

## HTTP Status Rules
We are strict about HTTP semantics.

| Code | Meaning | Usage |
| :--- | :--- | :--- |
| **200** | OK | Standard success. |
| **201** | Created | Resource successfully created (Register, Order Place). |
| **400** | Bad Request | Validation errors, missing fields, insufficient stock. |
| **401** | Unauthorized | Missing or invalid Token. Login required. |
| **403** | Forbidden | Valid token, but insufficient permissions (Customer trying to delete Product). |
| **404** | Not Found | Resource ID does not exist. |
| **409** | Conflict | Logic violation (e.g., "Email already exists", "Item sold out during checkout"). |
| **422** | Unprocessable | Semantic errors (Validation). |
| **429** | Too Many Requests | Rate limit hit. |
| **500** | Internal Error | Unhandled exception, database crash. |

## Common Error Examples
- **Input Validation:** `400` - "password is required".
- **Business Logic:** `409` - "Coupon is not applicable for this category".
- **Resource Limits:** `429` - "Too many OTP attempts".
