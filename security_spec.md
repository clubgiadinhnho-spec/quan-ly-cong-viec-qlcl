# Firestore Security Specification

## 1. Data Invariants
- **Identity Consistency**: Any write to a collection that tracks ownership (tasks, reports, messages) must have a `userId` or `senderId` that matches the authenticated person.
- **Role-Based Access**: Only Admins or designated managers can delete/lock tasks.
- **Privacy**: Direct messages are strictly private between the two participants.
- **Referential Integrity**: Tasks must be assigned to valid users.

## 2. The "Dirty Dozen" Payloads (Deny List)

1. **Identity Spoofing (User Profile)**: User A tries to update User B's profile.
2. **Privilege Escalation**: User A (Staff) tries to change their own role to 'Admin'.
3. **Ghost Field Injection**: Adding `isVerified: true` to a task document.
4. **Orphaned Task**: Creating a task assigned to a non-existent user ID.
5. **Private Message Snoop**: User C tries to read a message between User A and User B.
6. **Task Hijacking**: User A tries to update a task assigned to User B.
7. **Timestamp Fraud**: Sending a future date for `updatedAt` instead of `request.time`.
8. **Malicious ID Injection**: Creating a document with a 2KB junk string as the ID.
9. **Status Shortcutting**: Moving a task from 'IN_PROGRESS' directly to 'COMPLETED' without approval if it's a locked task.
10. **Resource Exhaustion**: Sending a 1MB string in a chat message content.
11. **Report Tampering**: User A tries to delete User B's monthly report.
12. **Lock-out Attack**: User A tries to set `isLocked: true` on all tasks to prevent others from editing.

## 3. Test Runner Draft

```typescript
// firestore.rules.test.ts
// This file simulates the "Dirty Dozen" attacks.
// (Simplified pseudo-code for the spec)

test('User cannot update another user profile', async () => {
  const db = getFirestore(userA);
  await assertFails(updateDoc(doc(db, 'users', 'userB'), { name: 'Hacker' }));
});

test('Staff cannot promote themselves to Admin', async () => {
  const db = getFirestore(userA);
  await assertFails(updateDoc(doc(db, 'users', 'userA'), { role: 'Admin' }));
});

test('Cannot read private messages of others', async () => {
  const db = getFirestore(userC);
  await assertFails(getDoc(doc(db, 'direct_messages', 'userA_userB_123')));
});
```
