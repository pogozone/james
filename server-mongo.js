const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3003;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/james-todos';

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Epic Schema
const EpicSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

const Epic = mongoose.model('Epic', EpicSchema);

// Todo Schema
const TodoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  dueDate: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Neu', 'In Bearbeitung', 'Erledigt', 'Unerledigt geschlossen'],
    default: 'Neu'
  },
  priority: {
    type: String,
    enum: ['Super wichtig', 'Bald erledigen', 'Hat Zeit'],
    default: 'Hat Zeit'
  },
  points: {
    type: Number,
    enum: [1, 2, 3, 5, 8],
    required: false
  },
  repeatWeekly: {
    type: Boolean,
    default: false
  },
  repeatMonthly: {
    type: Boolean,
    default: false
  },
  sprintBucket: {
    type: String,
    enum: ['current', 'next', 'none'],
    default: 'none'
  },
  scrumStatus: {
    type: String,
    enum: ['Ready', 'In Progress', 'Review', 'Done'],
    default: 'Ready'
  },
  epicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Epic',
    required: false
  }
}, {
  timestamps: true
});

const Todo = mongoose.model('Todo', TodoSchema);

mongoose.connection.once('open', async () => {
  try {
    const result1 = await Todo.updateMany(
      { status: 'Wiedervorlage' },
      { $set: { status: 'Neu', repeatWeekly: true }, $unset: { wiedervorlage: 1 } }
    );
    const migrated1 = result1?.nModified || result1?.modifiedCount || 0;
    if (migrated1) {
      console.log('Migrated Wiedervorlage status to repeatWeekly:', migrated1);
    }

    const result2 = await Todo.updateMany(
      { wiedervorlage: true },
      { $set: { repeatWeekly: true }, $unset: { wiedervorlage: 1 } }
    );
    const migrated2 = result2?.nModified || result2?.modifiedCount || 0;
    if (migrated2) {
      console.log('Migrated wiedervorlage flag to repeatWeekly:', migrated2);
    }

    // BoardItems are legacy; Todo is the single source of truth.
    // Clean up orphaned and duplicate BoardItems to keep DB tidy.
    try {
      const todos = await Todo.find({}, { _id: 1 }).lean();
      const todoIdSet = new Set(todos.map(t => t._id.toString()));
      const items = await BoardItem.find().sort({ createdAt: 1 }).lean();

      const idsToDelete = [];
      const seenByTodoId = new Set();

      for (const item of items) {
        const todoId = item.todoId ? item.todoId.toString() : '';
        if (!todoId || !todoIdSet.has(todoId)) {
          idsToDelete.push(item._id);
          continue;
        }
        // keep only one BoardItem per todoId
        if (seenByTodoId.has(todoId)) {
          idsToDelete.push(item._id);
          continue;
        }
        seenByTodoId.add(todoId);
      }

      if (idsToDelete.length > 0) {
        await BoardItem.deleteMany({ _id: { $in: idsToDelete } });
        console.log('Cleaned up BoardItems (orphans/duplicates):', idsToDelete.length);
      }
    } catch (error) {
      console.error('Failed to clean up BoardItems:', error);
    }
  } catch (error) {
    console.error('Failed to migrate Wiedervorlage flags:', error);
  }
});

// Scrum Board Item Schema
const BoardItemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  todoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Todo',
    required: false
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  epic: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['Backlog', 'Ready', 'In Progress', 'Review', 'Done'],
    default: 'Backlog'
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

BoardItemSchema.index({ status: 1, order: 1, createdAt: 1 });

const BoardItem = mongoose.model('BoardItem', BoardItemSchema);

// API Routes

// GET epics
app.get('/james-todos/api/epics', async (req, res) => {
  try {
    const epics = await Epic.find().sort({ createdAt: -1 });
    const formatted = epics.map(epic => ({
      id: epic._id.toString(),
      title: epic.title,
      description: epic.description
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error reading epics:', error);
    res.status(500).json({ error: 'Failed to read epics' });
  }
});

// POST create epic
app.post('/james-todos/api/epics', async (req, res) => {
  try {
    const { title, description } = req.body || {};
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    const created = await Epic.create({
      title: title.trim(),
      description: typeof description === 'string' ? description : ''
    });

    res.status(201).json({
      id: created._id.toString(),
      title: created.title,
      description: created.description
    });
  } catch (error) {
    console.error('Error creating epic:', error);
    res.status(500).json({ error: 'Failed to create epic' });
  }
});

// PATCH update epic
app.patch('/james-todos/api/epics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body || {};

    const allowed = {};
    if (typeof title === 'string') allowed.title = title.trim();
    if (typeof description === 'string') allowed.description = description;

    if (Object.prototype.hasOwnProperty.call(allowed, 'title') && !allowed.title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const updated = await Epic.findByIdAndUpdate(id, allowed, { new: true });
    if (!updated) return res.status(404).json({ error: 'Not found' });

    res.json({
      id: updated._id.toString(),
      title: updated.title,
      description: updated.description
    });
  } catch (error) {
    console.error('Error updating epic:', error);
    res.status(500).json({ error: 'Failed to update epic' });
  }
});

// DELETE epic
app.delete('/james-todos/api/epics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Epic.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });

    await Todo.updateMany({ epicId: id }, { $set: { epicId: null } });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting epic:', error);
    res.status(500).json({ error: 'Failed to delete epic' });
  }
});

// GET todos
app.get('/james-todos/api/todos', async (req, res) => {
  try {
    const todos = await Todo.find().sort({ createdAt: -1 });
    const formattedTodos = todos.map(todo => ({
      id: todo._id.toString(),
      title: todo.title,
      description: todo.description,
      dueDate: todo.dueDate,
      status: todo.status === 'Wiedervorlage' ? 'Neu' : todo.status,
      priority: todo.priority,
      points: typeof todo.points === 'number' ? todo.points : undefined,
      repeatWeekly: todo.status === 'Wiedervorlage'
        ? true
        : Boolean(todo.repeatWeekly),
      repeatMonthly: Boolean(todo.repeatMonthly),
      sprintBucket: todo.sprintBucket,
      scrumStatus: todo.scrumStatus,
      epicId: todo.epicId ? todo.epicId.toString() : undefined
    }));
    res.json(formattedTodos);
  } catch (error) {
    console.error('Error reading todos:', error);
    res.status(500).json({ error: 'Failed to read todos' });
  }
});

// POST todos (create)
app.post('/james-todos/api/todos', async (req, res) => {
  try {
    const todo = req.body || {};
    if (!todo.title || typeof todo.title !== 'string' || !todo.title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    if (!todo.dueDate || typeof todo.dueDate !== 'string') {
      return res.status(400).json({ error: 'dueDate is required' });
    }

    const normalizedPoints = (() => {
      const p = typeof todo.points === 'number' ? todo.points : Number(todo.points);
      return [1, 2, 3, 5, 8].includes(p) ? p : undefined;
    })();

    const created = await Todo.create({
      title: todo.title.trim(),
      description: typeof todo.description === 'string' ? todo.description : '',
      dueDate: todo.dueDate,
      status: todo.status === 'Wiedervorlage' ? 'Neu' : (todo.status || 'Neu'),
      priority: todo.priority || 'Hat Zeit',
      points: normalizedPoints,
      repeatWeekly: Boolean(todo.repeatWeekly) || todo.status === 'Wiedervorlage',
      repeatMonthly: Boolean(todo.repeatMonthly),
      sprintBucket: todo.sprintBucket || 'none',
      scrumStatus: todo.scrumStatus || 'Ready',
      epicId: todo.epicId || null
    });

    res.status(201).json({
      id: created._id.toString(),
      title: created.title,
      description: created.description,
      dueDate: created.dueDate,
      status: created.status,
      priority: created.priority,
      points: typeof created.points === 'number' ? created.points : undefined,
      repeatWeekly: Boolean(created.repeatWeekly),
      repeatMonthly: Boolean(created.repeatMonthly),
      sprintBucket: created.sprintBucket,
      scrumStatus: created.scrumStatus,
      epicId: created.epicId ? created.epicId.toString() : undefined
    });
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

// PUT todo (update)
app.put('/james-todos/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};

    const allowed = {};
    if (typeof updates.title === 'string') allowed.title = updates.title.trim();
    if (typeof updates.description === 'string') allowed.description = updates.description;
    if (typeof updates.dueDate === 'string') allowed.dueDate = updates.dueDate;
    if (typeof updates.status === 'string') allowed.status = updates.status === 'Wiedervorlage' ? 'Neu' : updates.status;
    if (typeof updates.priority === 'string') allowed.priority = updates.priority;
    if (typeof updates.points === 'number' || typeof updates.points === 'string') {
      const p = typeof updates.points === 'number' ? updates.points : Number(updates.points);
      allowed.points = [1, 2, 3, 5, 8].includes(p) ? p : undefined;
    }
    if (typeof updates.repeatWeekly === 'boolean') allowed.repeatWeekly = updates.repeatWeekly;
    if (typeof updates.repeatMonthly === 'boolean') allowed.repeatMonthly = updates.repeatMonthly;
    if (typeof updates.sprintBucket === 'string') allowed.sprintBucket = updates.sprintBucket;
    if (typeof updates.scrumStatus === 'string') allowed.scrumStatus = updates.scrumStatus;
    if (typeof updates.epicId === 'string' || updates.epicId === null) allowed.epicId = updates.epicId;

    if (Object.prototype.hasOwnProperty.call(allowed, 'title') && !allowed.title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const updated = await Todo.findByIdAndUpdate(id, allowed, { new: true });
    if (!updated) return res.status(404).json({ error: 'Not found' });

    res.json({
      id: updated._id.toString(),
      title: updated.title,
      description: updated.description,
      dueDate: updated.dueDate,
      status: updated.status,
      priority: updated.priority,
      points: typeof updated.points === 'number' ? updated.points : undefined,
      repeatWeekly: Boolean(updated.repeatWeekly),
      repeatMonthly: Boolean(updated.repeatMonthly),
      sprintBucket: updated.sprintBucket,
      scrumStatus: updated.scrumStatus,
      epicId: updated.epicId ? updated.epicId.toString() : undefined
    });
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

// DELETE todo
app.delete('/james-todos/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Todo.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

// Legacy bulk upsert (non-destructive)
app.post('/james-todos/api/todos/bulk', async (req, res) => {
  try {
    const todos = Array.isArray(req.body) ? req.body : [];

    const ops = todos
      .filter(t => t && typeof t.id === 'string' && t.id)
      .map(t => {
        const p = typeof t.points === 'number' ? t.points : Number(t.points);
        const normalizedPoints = [1, 2, 3, 5, 8].includes(p) ? p : undefined;
        return {
          updateOne: {
            filter: { _id: t.id },
            update: {
              $set: {
                title: typeof t.title === 'string' ? t.title.trim() : '',
                description: typeof t.description === 'string' ? t.description : '',
                dueDate: t.dueDate,
                status: t.status === 'Wiedervorlage' ? 'Neu' : (t.status || 'Neu'),
                priority: t.priority || 'Hat Zeit',
                points: normalizedPoints,
                repeatWeekly: Boolean(t.repeatWeekly) || t.status === 'Wiedervorlage',
                repeatMonthly: Boolean(t.repeatMonthly),
                sprintBucket: t.sprintBucket || 'none',
                scrumStatus: t.scrumStatus || 'Ready',
                epicId: t.epicId || null
              }
            },
            upsert: true
          }
        };
      });

    if (ops.length > 0) {
      await Todo.bulkWrite(ops);
    }

    res.json({ success: true, count: ops.length });
  } catch (error) {
    console.error('Error bulk upserting todos:', error);
    res.status(500).json({ error: 'Failed to bulk upsert todos' });
  }
});

// Health check
app.get('/james-todos/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Scrum Board API

const TODO_STATUS_TO_BOARD_STATUS = {
  'Neu': 'Backlog',
  'In Bearbeitung': 'In Progress',
  'Erledigt': 'Done',
  'Unerledigt geschlossen': 'Done'
};

const BOARD_STATUS_TO_TODO_STATUS = {
  'Backlog': 'Neu',
  'Ready': 'Neu',
  'In Progress': 'In Bearbeitung',
  'Review': 'In Bearbeitung',
  'Done': 'Erledigt'
};

// GET board items
app.get('/james-todos/api/board-items', async (req, res) => {
  try {
    const todos = await Todo.find().sort({ createdAt: -1 });
    const formatted = todos.map((todo, idx) => {
      const boardStatus = TODO_STATUS_TO_BOARD_STATUS[todo.status] || 'Backlog';
      return {
        id: todo._id.toString(),
        title: todo.title,
        description: todo.description,
        epic: '',
        status: boardStatus,
        order: idx,
        todoId: todo._id.toString(),
        todo: {
          id: todo._id.toString(),
          title: todo.title,
          description: todo.description,
          dueDate: todo.dueDate,
          status: todo.status,
          priority: todo.priority,
          points: typeof todo.points === 'number' ? todo.points : undefined,
          repeatWeekly: Boolean(todo.repeatWeekly),
          repeatMonthly: Boolean(todo.repeatMonthly),
          sprintBucket: todo.sprintBucket,
          scrumStatus: todo.scrumStatus,
          epicId: todo.epicId ? todo.epicId.toString() : undefined
        }
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Error reading board items:', error);
    res.status(500).json({ error: 'Failed to read board items' });
  }
});

// BoardItem mutation endpoints are disabled: Todo is the single source of truth.
app.post('/james-todos/api/board-items', (req, res) => {
  res.status(409).json({ error: 'Board items are read-only. Use /todos endpoints.' });
});

app.patch('/james-todos/api/board-items/:id', (req, res) => {
  res.status(409).json({ error: 'Board items are read-only. Use /todos endpoints.' });
});

app.delete('/james-todos/api/board-items/:id', (req, res) => {
  res.status(409).json({ error: 'Board items are read-only. Use /todos endpoints.' });
});

app.post('/james-todos/api/board-items/reorder', (req, res) => {
  res.status(409).json({ error: 'Board items are read-only. Use /todos endpoints.' });
});

// Disable trailing slash redirects
app.use((req, res, next) => {
  if (req.path.substr(-1) === '/' && req.path.length > 1) {
    res.redirect(301, req.path.slice(0, -1));
  } else {
    next();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`MongoDB URI: ${MONGODB_URI}`);
});
