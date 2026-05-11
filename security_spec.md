# Security Specification: QLCL Hub

## Data Invariants
1. A Task cannot exist without a valid code (e.g., C0001).
2. Only Admins can set a Task status to 'APPROVED' directly during creation.
3. Users can only see tasks they are assigned to (if viewScope is 'mine') or all tasks (if public). *Note: The rules will allow reading all tasks for authenticated users to support the current app logic, but writes will be strictly controlled.*
4. User profiles contain PII (emails, phone) and must be protected.

## The Dirty Dozen (Payloads to Block)

1. **Identity Spoofing**: A user tries to create a profile for another user's UID.
2. **Privilege Escalation**: A non-admin user tries to update their own role to 'Admin'.
3. **ID Poisoning**: A user tries to create a task with a 1MB string as the document ID.
4. **Shadow Field Injection**: A user tries to add a `isVerified: true` field to their profile.
5. **PII Blanket Leak**: An unauthenticated user tries to list all user profiles.
6. **Task Hijacking**: A user tries to update a task they are not assigned to (and isn't the author).
7. **Resource Exhaustion**: A user tries to upload a 5MB text block into a chat message.
8. **Status Shortcutting**: A user tries to mark a task as 'COMPLETED' without going through the approval process (waitingApproval).
9. **Orphaned Writes**: Creating a task with a non-existent category code.
10. **Timestamp Spoofing**: Sending a client-side `updatedAt` value from 2020.
11. **Admin Key Injection**: Trying to update the `waitingApproval` field when they are the assignee (only admins should approve).
12. **Deleted Task Recovery**: A non-admin user trying to set `deletedAt: null` on a task they don't own.

## Test Strategy
- Use Firebase Emulator (if available) or rely on high-fidelity dry-runs.
- Each payload above must result in `PERMISSION_DENIED`.
