# Implementation Plan: [Manager] Push & In-App Notifications on Cancelled/Revoked Requests

## Overview & Goal
Provide real-time notifications to managers via both **In-App notifications** and **Web Push notifications** whenever an employee cancels a pending request or revokes an approved request (covering **Leave**, **Claims**, and **Overtime** requests). Furthermore, update the Manager request detail and inbox UI to explicitly display **"Cancelled by Employee"** or **"Revoked by Employee"** status with cancellation/revocation reasons.

---

## Acceptance Criteria
1. **Trigger Notification Event on Cancel/Revoke**:
   - Leave requests: when an employee cancels a pending leave or revokes an approved leave.
   - Claim requests: when an employee cancels a pending expense/mileage claim or revokes an approved claim.
   - Overtime requests: when an employee cancels a pending overtime request or revokes an approved overtime request.
2. **Deliver In-App Notification to Assigned Approver(s)**:
   - Queued into `notification_outbox` for the approver manager user.
   - Formatted with Title Case label, requester name, and request type.
   - Directly links to the manager's request approval detail route (`/manager/approvals/[stepId]`).
3. **Send Web Push Notification to Manager's Registered Devices**:
   - Web push subscriptions stored securely in `public.push_subscriptions`.
   - Dispatches Web Push payloads to active registered devices for the approver manager.
   - Graceful fallback for local development or environments without VAPID keys.
   - Service worker handles incoming push events and routes click interactions to `/manager/approvals/[stepId]`.
4. **Update Manager Request Detail & Inbox UI**:
   - Displays **"Cancelled by Employee"** (or **"Revoked by Employee"**) pill and banner card.
   - Renders cancellation/revocation reason and timestamp provided by the employee.
   - Complies with Title Case status badge policy.

---

## Technical Architecture & Implementation Steps

### 1. Database Schema & Migration (`supabase/migrations/20261012140000_push_subscriptions.sql`)
- Create `public.push_subscriptions` table:
  ```sql
  create table if not exists public.push_subscriptions (
    id uuid primary key default gen_random_uuid(),
    organization_id uuid not null references public.organizations(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    endpoint text not null,
    p256dh text not null,
    auth text not null,
    user_agent text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, endpoint)
  );
  ```
- Configure Row Level Security (RLS) policies:
  - Users can select, insert, and delete their own push subscriptions.
- Set permissions and default privileges:
  - `grant all on public.push_subscriptions to authenticated, service_role, anon;`
- Create index on `(organization_id, user_id)`.

### 2. Web Push Infrastructure & Service Worker
- Install standard `web-push` and `@types/web-push` packages:
  - `pnpm --filter @hrms/web add web-push`
  - `pnpm --filter @hrms/web add -D @types/web-push`
- Web Push Service (`apps/web/src/lib/notifications/web-push.ts`):
  - Helper functions to generate or load VAPID keys (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`).
  - `sendWebPushNotification({ organizationId, userId, title, body, url, tag })`:
    - Reads active subscriptions from `public.push_subscriptions` for `userId`.
    - Dispatches payload via `webpush.sendNotification`.
    - Cleans up subscriptions if push service responds with `404` or `410 Gone`.
    - Safe fallback in test/mock mode without breaking server execution.
- API Route Handlers:
  - `POST /api/notifications/push/subscribe`: Authenticated endpoint to store/update subscription.
  - `POST /api/notifications/push/unsubscribe`: Authenticated endpoint to remove subscription.
  - `GET /api/notifications/push/vapid-public-key`: Returns the public VAPID key for client registration.
- Service Worker & Client Registration:
  - Create `apps/web/public/sw.js`:
    - Handles `push` event: displays system notification with title, body, icon, badge, and `data.url`.
    - Handles `notificationclick` event: focuses existing tab or navigates window to `event.notification.data.url`.
  - Client component / hook `PushNotificationManager` for manager portal (e.g. in notification panel or portal shell) to request permission and subscribe.

### 3. Employee Revocation & Cancellation (Leave, Claims, Overtime)
- **Leave (`apps/web/src/lib/employee/leave.ts`)**:
  - Update `cancelLeaveRequest`:
    - Resolves approver user IDs for pending steps.
    - Queues `in_app` notification with `stepId`.
    - Triggers `sendWebPushNotification` to manager device(s).
  - Update `revokeLeaveRequest`:
    - Resolves approver user IDs for acted/completed steps.
    - Queues `in_app` notification with `stepId`.
    - Triggers `sendWebPushNotification` to manager device(s).
- **Claims (`apps/web/src/lib/employee/claims.ts` & `actions.ts`)**:
  - Add `cancelClaimRequest(requestId: string, reason?: string)`:
    - Validates status is `pending` and scoped to employee/org.
    - Sets `claims.status = 'cancelled'`.
    - Sets `approval_requests.status = 'cancelled'`.
    - Sets pending `approval_steps.status = 'cancelled'`.
    - Sends in-app and web push notifications to approver(s).
    - Logs audit event `claim.cancelled`.
  - Add `revokeClaimRequest(requestId: string, reason?: string)`:
    - Validates status is `approved` and scoped to employee/org.
    - Sets `claims.status = 'revoked'`.
    - Sets `approval_requests.status = 'revoked'`.
    - Updates step comment to record revocation reason.
    - Sends in-app and web push notifications to approver(s).
    - Logs audit event `claim.revoked`.
  - Server actions in `apps/web/src/app/(employee)/employee/actions.ts`:
    - `cancelClaimAction` and `revokeClaimAction`.
  - UI Component `ClaimActionControls` in `apps/web/src/components/employee/claim-action-controls.tsx`:
    - Renders on `/employee/claims/[requestId]` for pending (Cancel) and approved (Revoke) claims.
- **Overtime (`apps/web/src/lib/employee/overtime.ts` & `actions.ts`)**:
  - Add `cancelOvertimeRequest(requestId: string, reason?: string)`:
    - Validates status is `pending` and scoped to employee/org.
    - Sets `overtime_requests.status = 'cancelled'`.
    - Sets `approval_requests.status = 'cancelled'`.
    - Sets pending `approval_steps.status = 'cancelled'`.
    - Sends in-app and web push notifications to approver(s).
    - Logs audit event `overtime.cancelled`.
  - Add `revokeOvertimeRequest(requestId: string, reason?: string)`:
    - Validates status is `approved` and scoped to employee/org.
    - Sets `overtime_requests.status = 'revoked'`.
    - Sets `approval_requests.status = 'revoked'`.
    - Updates step comment to record revocation reason.
    - Sends in-app and web push notifications to approver(s).
    - Logs audit event `overtime.revoked`.
  - Server actions in `apps/web/src/app/(employee)/employee/actions.ts`:
    - `cancelOvertimeAction` and `revokeOvertimeAction`.
  - UI Component `OvertimeActionControls` in `apps/web/src/components/employee/overtime-action-controls.tsx`:
    - Renders on `/employee/overtime/[requestId]` for pending (Cancel) and approved (Revoke) OT requests.

### 4. Notification Routing & Links
- `apps/web/src/lib/notifications/links.ts`:
  - When `portal === "manager"` and template is `approval.cancel` or `approval.revoke`:
    - Return `/manager/approvals/${stepId}` if `stepId` is present in payload.
    - Fall back to `/manager/approvals`.
- `apps/web/src/lib/notifications/types.ts`:
  - Verify formatting for all request types (Leave, Claim, Overtime) with Title Case labels.

### 5. Manager Request Detail UI Updates
- In `apps/web/src/app/(manager)/manager/approvals/[stepId]/page.tsx`:
  - Differentiate `cancelled` and `revoked` states:
    - If status is `cancelled`:
      - Status pill label: `"Cancelled by Employee"` (tone: `"neutral"`).
      - Card banner: `"Cancelled by Employee"` with message explaining the requester cancelled the request and displaying the reason note.
    - If status is `revoked`:
      - Status pill label: `"Revoked by Employee"` (tone: `"danger"`).
      - Card banner: `"Revoked by Employee"` with message explaining the previously approved request was revoked and displaying the reason note.
- In `apps/web/src/lib/approvals/inbox.ts`:
  - Map `cancelled` and `revoked` statuses clearly in `mapApprovalInboxRow` and `mapApprovalDetail`.
- In `apps/web/src/components/manager/manager-approvals-view.tsx`:
  - Map `cancelled` to `"Cancelled by Employee"` and `revoked` to `"Revoked by Employee"` with Title Case badges.

### 6. Mobile Side Application (Web Push, PWA & Responsive UI)
- **Web Push on Mobile Devices**:
  - **Android (Chrome, Firefox, Edge, Samsung Internet)**: Full background push delivery via Service Worker (`sw.js`). Notifications display in the system notification shade even when the browser is closed.
  - **iOS (Safari on iOS 16.4+)**: Supported via Web Push API (standalone/PWA Home Screen or Safari web push permission).
  - Tapping a notification on mobile triggers `notificationclick` in `sw.js` and focuses/opens the manager approval route (`/manager/approvals/[stepId]`).
- **In-App Notifications on Mobile**:
  - Update `getNotificationText` in `apps/web/src/components/notifications/notifications-list.tsx` to handle `approval.cancel` and `approval.revoke` with dedicated titles (e.g. `Leave request cancelled`, `Claim revoked`) and contextual messages.
  - Responsive layout for mobile notification drawer and `/manager/notifications` with tap-friendly targets (minimum 44px) and no horizontal overflow.
- **Mobile Responsive Request Detail & Action Controls**:
  - The "Cancelled by Employee" status pill and explanation card on `/manager/approvals/[stepId]` adapt fluidly to small screen viewports (375px+).
  - The cancel/revoke action buttons and confirmation dialogs on employee detail pages (`/employee/leave/[id]`, `/employee/claims/[id]`, `/employee/overtime/[id]`) provide minimum 44px tap targets and responsive modal viewports.

### 7. Automated Testing & Verification
- Test cancellation & revocation logic for Leave, Claims, and Overtime.
- Test web push subscription registration and mock payload dispatch.
- Test manager UI rendering with cancelled/revoked states across mobile (375px) and desktop viewports.
- Run typechecking (`pnpm typecheck`) and test suite (`pnpm test`).
