# Bil Infom Security Specification

## Data Invariants
1. A post must have a valid `authorId` matching the authenticated user.
2. A comment must have a valid `authorId` matching the authenticated user and a valid `postId`.
3. Users can only edit their own posts and comments.
4. User profiles can only be written by the user themselves (except for shared info if applicable).
5. Likes/Comments counts should be managed by increments (system-only technically, but client-side increment is used here for simplicity in this demo, though ideally handled by functions).

## The Dirty Dozen Payloads (Target: DENIED)
1. **Unauthenticated Write**: Creating a post without a token.
2. **Identity Spoofing**: Creating a post with another user's `authorId`.
3. **Ghost Fields**: Adding `isVerified: true` to a user profile via client.
4. **ID Poisoning**: Using a 2KB string as a `postId`.
5. **PII Leak**: Reading all user profiles' private data (if any).
6. **Negative Likes**: Decrementing `likesCount` below 0 or by massive amounts.
7. **Cross-Post Comments**: Adding a comment to a non-existent post.
8. **Admin Escalation**: Attempting to set `role: 'admin'` on own profile.
9. **Spam Creation**: Creating 100 posts in a single request.
10. **Resource Exhaustion**: Writing a 1MB string into a `title` field.
11. **Orphaned Updates**: Updating a comment's `postId` to a different post.
12. **Future Post**: Setting `createdAt` to a future date.

## Test Strategy
I will use the `isValid[Entity]` pattern for all writes.
- `isValidUser`
- `isValidPost`
- `isValidComment`
- `isValidCategory`
