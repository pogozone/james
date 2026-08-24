# James – Todo & Scrum Application

A full-featured todo and scrum application built with React, TypeScript and MongoDB.

[Deutsche Version](README.md)

## Features

### Task Management
- **Title**: Free-text input (required)
- **Description**: Optional free text for additional details
- **Due date**: HTML5 date picker
- **Points**: Story points (1, 2, 3, 5, 8)
- **Priority**: Super wichtig (super important), Bald erledigen (due soon), Hat Zeit (no rush)
- **Epic assignment**: Tasks can be assigned to epics
- **Recurrence**: Weekly or monthly recurring tasks
- **Status**: Choose from four status options:
  - Neu (New)
  - In Bearbeitung (In Progress)
  - Erledigt (Done)
  - Unerledigt geschlossen (Closed Unresolved)

### Sprint Management
Sprints are standalone objects with a unique ID, sprint number, start/end date and status (`current`, `next`, `future`, `closed`). A sprint always lasts one calendar week from Sunday to Saturday (Europe/Berlin).

**Sprint lifecycle**
1. On application start, a current sprint is created automatically if none exists.
2. New tasks are automatically assigned to the current sprint.
3. From Saturday (end date), a **Close Sprint** button appears on the scrum board.
4. On closing:
   - The current sprint is set to `closed`.
   - Unfinished tasks are moved to the follow-up sprint (`scrumStatus` and `status` are reset to `Ready`/`Neu`).
   - Completed tasks remain permanently in the closed sprint.
   - An existing sprint with status `next` is preferred as successor. If none exists, a new `next` sprint is created. Existing `future` sprints remain unchanged.
5. Closing multiple times is idempotent.

### Views
- **Backlog**: Overview of all tasks with sorting and filtering
- **Calendar**: Monthly view of tasks
  - A simple click on a task opens the detail view
  - Click, hold and drag moves a task to another date via drag & drop – the date and sprint assignment are updated automatically
- **Scrum Board**: Kanban view of the current sprint with drag & drop (Ready, In Progress, Review, Done); clicking a task opens the detail view
- **Done**: Completed tasks from all sprints, with a detail view button and a move-back-to-backlog option
- **Epics**: Manage epics with their assigned tasks
- **Statistics (Auswertung)**: Overview of past sprints including:
  - Completed and unfinished tasks & points per sprint
  - Average points per sprint
  - Bar chart of points from the last 10 sprints
  - List of completed tasks with points per sprint
- **Detail view**: Full display of a task with all information
- **Create/Edit form**: Form for creating and editing tasks

### Special Features
- Overdue tasks are highlighted in red, tasks due today in green
- Tasks with priority "Super wichtig" blink
- Automatic sorting by status and due date
- Responsive design for desktop and mobile
- Data storage in MongoDB via an Express REST API
- JSON export of all tasks

## Technology Stack

- **React 18** with TypeScript
- **Bootstrap 5** for UI design
- **@hello-pangea/dnd** for drag & drop on the scrum board
- **Lucide React** for icons
- **MongoDB** with Mongoose for data storage
- **Express** for the REST API

## Project Structure

```
src/
├── components/
│   ├── TodoForm.tsx      # Create/Edit form
│   ├── TodoDetail.tsx    # Detail view
│   ├── TodoList.tsx      # Backlog list view
│   ├── TodoCalendar.tsx  # Calendar view with drag & drop
│   ├── ScrumBoard.tsx    # Kanban board of the current sprint
│   ├── DoneList.tsx      # Completed tasks
│   ├── EpicList.tsx      # Epic management
│   ├── SprintStats.tsx   # Statistics of past sprints
│   └── PageHeader.tsx    # Shared page header
├── services/
│   ├── todoService.ts    # API service for tasks
│   ├── sprintService.ts  # API service for sprints
│   └── epicService.ts    # API service for epics
├── styles/               # Theme and page stylesheets
├── utils/
│   └── dateOnly.ts       # Timezone-safe date helpers
├── types.ts              # TypeScript type definitions
├── App.tsx               # Main application
└── index.tsx             # Entry point

server-mongo.js           # Express backend (API + data model)
```

## API

### Sprints
- `GET /james-todos/api/sprints` – List all sprints
- `GET /james-todos/api/sprints/current` – Current sprint
- `POST /james-todos/api/sprints` – Create a new future sprint
- `POST /james-todos/api/sprints/:id/close` – Close a sprint (atomic, idempotent)

### Tasks & Epics
Task and epic endpoints are available at `/james-todos/api/todos` and `/james-todos/api/epics` respectively (see `server-mongo.js`).

## Installation and Setup

### Prerequisites
- Node.js (>= 16.20.2) and npm (>= 8)
- A running MongoDB instance (default: `mongodb://127.0.0.1:27017`)

### Installation

1. Clone the repository or change into the project directory
2. Install dependencies:
```bash
npm install
```

### Running the Application

Start backend and frontend together in development mode:
```bash
npm run dev
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:3003](http://localhost:3003/james-todos/api/)

Or start them individually:
```bash
npm run server   # backend only (port 3003)
npm start        # frontend only (port 3000)
```

The MongoDB connection can be customized via the `MONGODB_URI` environment variable, and the frontend API base URL via `REACT_APP_API_BASE_URL`.

### Production Build

```bash
npm run build
```

The optimized application is created in the `build` directory.

## Usage

### Creating a Task
1. Click the "Neue Aufgabe" (New Task) button
2. Fill out the form (title required, everything else optional)
3. Click "Speichern" (Save)

### Editing or Deleting a Task
1. Click "Bearbeiten" (Edit) in the detail view, or use the delete icon in the list view
2. Save your changes or confirm the deletion dialog

### Changing Task Status
The status can be changed in the edit form, by direct interaction in the list view, or via drag & drop on the scrum board.

### Moving a Task in the Calendar
Click and hold a task, then drag it to the desired date. The date and sprint assignment are updated automatically.

## Development

### Running Tests
```bash
npm test
```

### Integration Tests (MongoDB required)
```bash
npm run test:integration
```

### Customization
The application can be extended easily:
- Add new status options in `types.ts`
- Implement additional fields in `TodoForm`
- Add new views as components in `src/components/` and register them in `App.tsx`

## License

This project was created for learning purposes and can be freely used and adapted.
