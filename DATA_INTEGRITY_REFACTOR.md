# Data Integrity Refactor (Todo / Scrum)

## Goals

- Remove destructive persistence (no `deleteMany()` + re-insert for todos).
- Provide true CRUD endpoints with stable MongoDB `_id` values.
- Make `Todo` the single source of truth.
- Handle save errors safely in the UI (rollback + user-visible message).

## Backend changes (`server-mongo.js`)

### Todo persistence

- **GET** `/james-todos/api/todos`
  - Returns todos from MongoDB.

- **POST** `/james-todos/api/todos`
  - Creates a single todo and returns it with the stable MongoDB id.

- **PUT** `/james-todos/api/todos/:id`
  - Updates a single todo (whitelisted fields only) and returns the updated document.

- **DELETE** `/james-todos/api/todos/:id`
  - Deletes a single todo.

### Completion endpoint (backend-owned recurring logic)

- **POST** `/james-todos/api/todos/:id/complete`
  - Sets the todo to `scrumStatus = Done` and `status = Erledigt`.
  - If `repeatWeekly` or `repeatMonthly` is set, it creates the follow-up todo server-side.
  - Returns `{ updated, followUp }`.
  - The endpoint is **idempotent**: repeated calls will never create multiple follow-up todos.
  - No MongoDB transaction is required (works on a single MongoDB instance).

### Board model (Single Source of Truth)

- `BoardItem` has been removed.
- The Scrum board is derived directly from `Todo.scrumStatus`.

## Frontend changes

### Stable IDs

- New todos no longer get a client-generated id.
- The server returns the stable Mongo id, which is used throughout the UI.

### Error handling / rollback

- UI updates are optimistic where useful.
- On save/delete failure:
  - state is rolled back to the previous snapshot
  - the user receives an alert message
- Delayed responses are ignored if a newer mutation has been issued for the same todo.

## Invariants preserved

- Existing UI features (Backlog, Board, Done, points, repeat flags, sprint buckets, highlighting) are preserved.
- Todo status / scrum status behaviour remains consistent.

## Notes

- If you still have old `BoardItem` documents in MongoDB, they are no longer used by the app.
- Future enhancements should update `Todo` only; the board is computed from it.
