# Data Integrity Refactor (Todo / Scrum)

## Goals

- Remove destructive persistence (no `deleteMany()` + re-insert for todos).
- Provide true CRUD endpoints with stable MongoDB `_id` values.
- Make `Todo` the single source of truth.
- Prevent drift between `Todo` and legacy `BoardItem` documents.
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

- **Legacy (non-destructive) bulk endpoint**
  - **POST** `/james-todos/api/todos/bulk`
  - Performs `bulkWrite` upserts by id.
  - Exists only for compatibility; it does **not** delete data.

### Board model (Single Source of Truth)

- `BoardItem` is treated as **legacy**.
- **GET** `/james-todos/api/board-items` is now **derived from Todos**.
  - It returns “board items” that mirror todos.
  - No `BoardItem` collection is needed to render the board.

- All mutating BoardItem endpoints are **disabled** and return HTTP `409`:
  - `POST /board-items`
  - `PATCH /board-items/:id`
  - `DELETE /board-items/:id`
  - `POST /board-items/reorder`

### BoardItem cleanup

On Mongo connection (`mongoose.connection.once('open')`):

- Orphaned BoardItems are deleted (no existing `todoId`).
- Duplicate BoardItems per `todoId` are deleted (keeps first by `createdAt`).

## Frontend changes

### Stable IDs

- New todos no longer get a client-generated id.
- The server returns the stable Mongo id, which is used throughout the UI.

### Error handling / rollback

- UI updates are optimistic where useful.
- On save/delete failure:
  - state is rolled back to the previous snapshot
  - the user receives an alert message

## Invariants preserved

- Existing UI features (Backlog, Board, Done, points, repeat flags, sprint buckets, highlighting) are preserved.
- Todo status / scrum status behaviour remains consistent.

## Notes

- If you still have old `BoardItem` documents, they are harmless and will be cleaned up.
- Future enhancements should update `Todo` only; the board is computed from it.
