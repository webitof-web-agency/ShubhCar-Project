# Authentication & Authorization

## Authentication Flow

We support multiple authentication providers:
1. **Password**: Standard Email/Phone + Password.
2. **OTP**: Passwordless login via Email or SMS OTP.
3. **Google OAuth**: Social login via ID Token.

### Login / Signup Strategy
- **Tokens**: We use **JWT (JSON Web Tokens)**.
  - `AccessToken`: Short-lived (15 min). Sent in Authorization header.
  - `RefreshToken`: Long-lived (30 days). Stored in DB (`User.sessions`) and rotated on use.
- **Session Management**: 
  - Implementation allows multiple active devices.
  - Users can "Logout All Devices" by clearing the `sessions` array in DB.

## Token Lifecycle
1. User logs in → Server verifies credentials → Returns `{ accessToken, refreshToken }`.
2. Client sends requsets with `Authorization: Bearer <accessToken>`.
3. If 401 (Expired) → Client calls `/auth/refresh` with `refreshToken`.
4. Server verifies `refreshToken` hash against DB → Returns **NEW** pair (Rotation).
5. **Security Note**: Reuse of old refresh tokens triggers **Automatic Breach Detection**, invalidating *all* sessions for that user.

## Authorization (RBAC)
Role-Based Access Control is enforced via `verifyRole` middleware.

### Roles
- **Customer** (`customer`): Can manage own profile, cart, and orders. Read public products.
- **Admin** (`admin`): Full access to system, user management, global settings.

### Permission Checks
- **Resource Ownership**: Even if a user is a "Customer", they cannot view another customer's order. This is checked at the Service/Controller level:
  ```javascript
  if (order.userId.toString() !== currentUser.id) throw new Forbidden();
  ```
- **Admin Override**: Admins can bypass ownership checks for support purposes.

## Security Risks & Mitigations
| Risk | Mitigation |
| :--- | :--- |
| Brute Force | Rate limiting on `/login` routes. Account lock after 5 failed attempts. |
| XSS | Helmet CSP headers. No sensitive data in URL. |
| Replay Attacks | Short-lived Access Tokens. |
| Token Theft | Refresh Token Rotation + IP/Device binding detection. |
