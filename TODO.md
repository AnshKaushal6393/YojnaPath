# Fix Primary Profile State/UserType Showing NA/Unknown in AdminUserDetailPage

## Approved Plan Steps

### 1. Create TODO.md [✅ COMPLETED]
### 2. Add logging to adminUserService.getAdminUserById for primaryProfile debugging
- Log userId, profiles count, primaryProfile selection
### 3. Fix frontend ProfilePage mutation to invalidate admin queries
- Extend profileMutation.onSuccess to invalidate ["admin-user"]
### 4. Ensure DB single primary constraint (backend/services/profileService.js)
- Add UNIQUE constraint or validate in upsert
### 5. Update getUserTypeLabel to handle occupation mismatches
### 6. Test: Save profile → navigate to AdminUserDetailPage → verify refresh
### 7. Backend tests + restart server
### 8. attempt_completion

**Progress: 5/8**
