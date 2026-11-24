# Security Specification — Smart Real-Time Household Ledger

## 1. Data Invariants

1. **Strict Ownership Isolation**: Every document under `/users/{userId}/transactions/{transactionId}` belongs exclusively to `userId`. Only the authenticated user with `request.auth.uid == userId` and `request.auth.token.email_verified == true` may read, create, update, or delete records in their own subcollection.
2. **Identity Integrity**: On creation and update, `data.userId` MUST equal `request.auth.uid` and the path parameter `userId`, and `userId` is immutable after creation.
3. **Temporal Integrity**: `createdAt` MUST equal `request.time` on creation and remain immutable on update.
4. **Schema & Boundary Integrity**: No extra/shadow fields are permitted (`hasOnly`). `title` is bounded to `1..100` chars, `amount` must be a positive integer (`1..1000000000000`), `date` must match `^\d{4}-\d{2}-\d{2}$`, `type` must be `'income'` or `'expense'`, and `category` must match the allowed category list for that `type`.
5. **Path Hardening**: Both `userId` and `transactionId` must match `^[a-zA-Z0-9_\-]+$` and be at most 128 characters.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Unauthenticated Read/Write**: Request with `request.auth == null` attempting to read or create a transaction -> `PERMISSION_DENIED`.
2. **Unverified Email Write**: Authenticated user with `email_verified == false` attempting to create/read -> `PERMISSION_DENIED`.
3. **Cross-User Read (IDOR)**: Authenticated user `alice` reading `/users/bob/transactions/tx1` -> `PERMISSION_DENIED`.
4. **Cross-User Write**: Authenticated user `alice` creating `/users/bob/transactions/tx1` with `userId: "bob"` -> `PERMISSION_DENIED`.
5. **Owner Spoofing in Payload**: User `alice` writing to `/users/alice/transactions/tx1` with `userId: "bob"` -> `PERMISSION_DENIED`.
6. **Shadow / Ghost Field Injection**: Valid owner sending an extra field `isAdmin: true` or `verified: true` on create -> `PERMISSION_DENIED`.
7. **Immutable Field Tampering**: Valid owner attempting to update `userId` or `createdAt` -> `PERMISSION_DENIED`.
8. **Client-Forged Timestamp**: Valid owner creating a transaction with a past client `Timestamp` instead of `request.time` -> `PERMISSION_DENIED`.
9. **Negative or Zero Amount**: Valid owner creating a transaction with `amount: -5000` or `amount: 0` or `amount: 1.5` (float) -> `PERMISSION_DENIED`.
10. **Category-Type Mismatch**: Valid owner creating `type: "income"` with `category: "food"` (expense category) -> `PERMISSION_DENIED`.
11. **Oversized String / Resource Poisoning**: Valid owner creating `title` > 100 characters or `transactionId` > 128 characters or containing invalid path characters -> `PERMISSION_DENIED`.
12. **Malformed Date String**: Valid owner creating `date: "2026/11/24"` or `"not-a-date"` -> `PERMISSION_DENIED`.
