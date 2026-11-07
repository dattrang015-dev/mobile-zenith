# Firebase Security Specification

## Data Invariants
- Every session MUST be linked to a valid user ID (`userId`).
- Users can only access their own sessions and profile.
- Timestamps (`updatedAt`) must be updated on every write.

## Dirty Dozen Payloads (Rejection Targets)
1. Creating a profile for a different UID.
2. Reading another user's profile.
3. Creating a session with another user's UID.
4. Listing all sessions without a UID filter.
5. Updating a session's `userId` after creation.
6. Deleting a session owned by another user.
7. Injecting 1MB strings into session titles.
8. Writing to the `users` collection without being logged in.
9. Modifying someone else's messages in a session.
10. Creating a session without any required fields.
11. Spoofing timestamps (using client time instead of server time where applicable, though I'll be using numbers for simple generic compatibility first).
12. Bulk reading the `users` collection.

## Test Runner (Logic)
The `firestore.rules` will be tested against these cases.
