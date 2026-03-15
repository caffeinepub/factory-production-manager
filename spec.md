# Factory Production Manager

## Current State
Login uses localStorage for credentials with SHA-256 hashing, supports changing username/password, has a forgot-password reset flow. ChangePasswordDialog is in App.tsx with change-password buttons in sidebar and topbar.

## Requested Changes (Diff)

### Add
- Fixed hardcoded credentials: username `admin`, password `admin123`
- One user, one login session via sessionStorage

### Modify
- `useAdminAuth.ts`: Remove credential storage, migration, changePassword/resetToDefaults/getCurrentUsername. Hardcode admin/admin123. Keep login/logout/isLoggedIn/isInitializing only.
- `LoginPage.tsx`: Remove forgot-password/reset flow and username hint. Simple form only.
- `App.tsx`: Remove ChangePasswordDialog, all change-password buttons and state, changePassword/resetToDefaults/getCurrentUsername refs.

### Remove
- localStorage credential storage
- Change password UI
- Reset-to-defaults flow

## Implementation Plan
1. Rewrite useAdminAuth.ts with hardcoded credentials
2. Simplify LoginPage.tsx
3. Update App.tsx to remove change-password UI
