# Security Specification

## 1. Data Invariants
- A User must have a unique ID matching their Firebase Auth UID (if applicable, but here we use manual IDs for the staff list, so we map them).
- A Message must have an `authorId` that matches the `request.auth.uid`.
- A Message `timestamp` must be the server time.
- Tasks can only be created or modified by users with 'Admin' or 'Leader' roles.

## 2. The "Dirty Dozen" Payloads

1. **Identity Spoofing (Create User)**: Attempt to create a user document with an ID that doesn't match the authenticated user (if users can self-register).
2. **Identity Spoofing (Message)**: Attempt to send a message with `authorId` pointing to someone else.
3. **Resource Poisoning (User)**: Attempt to inject a 1MB string into the `name` field of a User.
4. **State Shortcutting (Task)**: Attempt to set a task status to 'COMPLETED' without being the assignee or manager.
5. **Privilege Escalation (User)**: A regular 'Staff' attempting to update their own `role` to 'Admin'.
6. **Orphaned Message**: Creating a message with an `authorId` that does not exist in the `users` collection.
7. **Timestamp Fraud**: Sending a message with a manually specified `timestamp` far in the past/future.
8. **Shadow Field (Task)**: Adding a `isVerified: true` field to a Task document that isn't in the schema.
9. **Blanket Query Scraping**: Attempting to list all users without being authenticated.
10. **ID Poisoning**: Attempting to access a document with a 2KB junk string as the ID.
11. **PII Leak**: An unauthenticated user attempting to get a user document to read their `personalEmail`.
12. **De-indexing Attack**: Rapidly creating 10,000 empty nodes in any collection.

## 3. Test Runner (Mock)
(See `firestore.rules.test.ts` for implementation details).
