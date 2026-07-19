const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3003;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/james-todos';

const TODO_STATUSES = ['Neu', 'In Bearbeitung', 'Erledigt', 'Unerledigt geschlossen'];
const TODO_PRIORITIES = ['Super wichtig', 'Bald erledigen', 'Hat Zeit'];
const SPRINT_BUCKETS = ['current', 'next', 'none'];
const SCRUM_STATUSES = ['Ready', 'In Progress', 'Review', 'Done'];

function formatDateOnlyUTC(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateOnlyUTC(value) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function isValidDateString(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function isValidObjectId(id) {
  return typeof id === 'string' && mongoose.Types.ObjectId.isValid(id);
}

function sendBadRequest(res, message) {
  return res.status(400).json({ error: message });
}

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
  },
  followUpOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Todo',
    required: false
  }
}, {
  timestamps: true
});

TodoSchema.index({ followUpOf: 1 }, { unique: true, sparse: true });

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
  } catch (error) {
    console.error('Failed to migrate Wiedervorlage flags:', error);
  }
});

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
    if (!isValidObjectId(id)) return sendBadRequest(res, 'Invalid id');
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
    if (error && error.name === 'CastError') return sendBadRequest(res, 'Invalid id');
    res.status(500).json({ error: 'Failed to update epic' });
  }
});

// DELETE epic
app.delete('/james-todos/api/epics/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return sendBadRequest(res, 'Invalid id');
    const deleted = await Epic.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });

    await Todo.updateMany({ epicId: id }, { $set: { epicId: null } });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting epic:', error);
    if (error && error.name === 'CastError') return sendBadRequest(res, 'Invalid id');
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
      status: todo.status,
      priority: todo.priority,
      points: typeof todo.points === 'number' ? todo.points : undefined,
      repeatWeekly: Boolean(todo.repeatWeekly),
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
    if (!isValidDateString(todo.dueDate)) return res.status(400).json({ error: 'dueDate is required' });

    const normalizedStatus = todo.status || 'Neu';
    if (!TODO_STATUSES.includes(normalizedStatus)) return sendBadRequest(res, 'Invalid status');
    const normalizedPriority = todo.priority || 'Hat Zeit';
    if (!TODO_PRIORITIES.includes(normalizedPriority)) return sendBadRequest(res, 'Invalid priority');
    const normalizedSprintBucket = todo.sprintBucket || 'none';
    if (!SPRINT_BUCKETS.includes(normalizedSprintBucket)) return sendBadRequest(res, 'Invalid sprintBucket');
    const normalizedScrumStatus = todo.scrumStatus || 'Ready';
    if (!SCRUM_STATUSES.includes(normalizedScrumStatus)) return sendBadRequest(res, 'Invalid scrumStatus');

    let epicId = null;
    if (typeof todo.epicId === 'string' && todo.epicId) {
      if (!isValidObjectId(todo.epicId)) return sendBadRequest(res, 'Invalid epicId');
      epicId = todo.epicId;
    }

    let normalizedPoints;
    if (Object.prototype.hasOwnProperty.call(todo, 'points')) {
      const p = typeof todo.points === 'number' ? todo.points : Number(todo.points);
      if (![1, 2, 3, 5, 8].includes(p)) return sendBadRequest(res, 'Invalid points');
      normalizedPoints = p;
    }

    const created = await Todo.create({
      title: todo.title.trim(),
      description: typeof todo.description === 'string' ? todo.description : '',
      dueDate: todo.dueDate,
      status: normalizedStatus,
      priority: normalizedPriority,
      points: normalizedPoints,
      repeatWeekly: Boolean(todo.repeatWeekly),
      repeatMonthly: Boolean(todo.repeatMonthly),
      sprintBucket: normalizedSprintBucket,
      scrumStatus: normalizedScrumStatus,
      epicId
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
    if (error && error.name === 'CastError') return sendBadRequest(res, 'Invalid id');
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

// PUT todo (update)
app.put('/james-todos/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return sendBadRequest(res, 'Invalid id');
    const updates = req.body || {};

    const allowed = {};
    if (typeof updates.title === 'string') allowed.title = updates.title.trim();
    if (typeof updates.description === 'string') allowed.description = updates.description;
    if (typeof updates.dueDate === 'string') {
      if (!isValidDateString(updates.dueDate)) return sendBadRequest(res, 'Invalid dueDate');
      allowed.dueDate = updates.dueDate;
    }
    if (typeof updates.status === 'string') {
      if (!TODO_STATUSES.includes(updates.status)) return sendBadRequest(res, 'Invalid status');
      allowed.status = updates.status;
    }
    if (typeof updates.priority === 'string') {
      if (!TODO_PRIORITIES.includes(updates.priority)) return sendBadRequest(res, 'Invalid priority');
      allowed.priority = updates.priority;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'points')) {
      if (updates.points === undefined) {
        allowed.points = undefined;
      } else {
        const p = typeof updates.points === 'number' ? updates.points : Number(updates.points);
        if (![1, 2, 3, 5, 8].includes(p)) return sendBadRequest(res, 'Invalid points');
        allowed.points = p;
      }
    }
    if (typeof updates.repeatWeekly === 'boolean') allowed.repeatWeekly = updates.repeatWeekly;
    if (typeof updates.repeatMonthly === 'boolean') allowed.repeatMonthly = updates.repeatMonthly;
    if (typeof updates.sprintBucket === 'string') {
      if (!SPRINT_BUCKETS.includes(updates.sprintBucket)) return sendBadRequest(res, 'Invalid sprintBucket');
      allowed.sprintBucket = updates.sprintBucket;
    }
    if (typeof updates.scrumStatus === 'string') {
      if (!SCRUM_STATUSES.includes(updates.scrumStatus)) return sendBadRequest(res, 'Invalid scrumStatus');
      allowed.scrumStatus = updates.scrumStatus;
    }
    if (typeof updates.epicId === 'string' || updates.epicId === null) {
      if (updates.epicId === null || updates.epicId === '') {
        allowed.epicId = null;
      } else {
        if (!isValidObjectId(updates.epicId)) return sendBadRequest(res, 'Invalid epicId');
        allowed.epicId = updates.epicId;
      }
    }

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
    if (error && error.name === 'CastError') return sendBadRequest(res, 'Invalid id');
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

// DELETE todo
app.delete('/james-todos/api/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) return sendBadRequest(res, 'Invalid id');
    const deleted = await Todo.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting todo:', error);
    if (error && error.name === 'CastError') return sendBadRequest(res, 'Invalid id');
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

// Complete a todo (sets Done + creates follow-up for repeat tasks)
app.post('/james-todos/api/todos/:id/complete', async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return sendBadRequest(res, 'Invalid id');
  try {
    const updated = await Todo.findByIdAndUpdate(
      id,
      { $set: { scrumStatus: 'Done', status: 'Erledigt' } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: 'Not found' });

    let followUp = null;
    if (updated.repeatWeekly || updated.repeatMonthly) {
      const existing = await Todo.findOne({ followUpOf: updated._id });
      if (existing) {
        followUp = existing;
      } else {
        const nextDate = parseDateOnlyUTC(updated.dueDate);
        if (updated.repeatMonthly) {
          const y = nextDate.getUTCFullYear();
          const m = nextDate.getUTCMonth();
          const d = nextDate.getUTCDate();
          const targetMonthIndex = m + 1;
          const targetYear = y + Math.floor(targetMonthIndex / 12);
          const targetMonth = targetMonthIndex % 12;
          const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
          const clampedDay = Math.min(d, daysInTargetMonth);
          nextDate.setUTCFullYear(targetYear);
          nextDate.setUTCMonth(targetMonth);
          nextDate.setUTCDate(clampedDay);
        } else {
          nextDate.setUTCDate(nextDate.getUTCDate() + 7);
        }

        try {
          followUp = await Todo.create({
            title: updated.title,
            description: updated.description || '',
            dueDate: formatDateOnlyUTC(nextDate),
            status: 'Neu',
            priority: updated.priority,
            points: typeof updated.points === 'number' ? updated.points : undefined,
            repeatWeekly: Boolean(updated.repeatWeekly),
            repeatMonthly: Boolean(updated.repeatMonthly),
            sprintBucket: 'next',
            scrumStatus: 'Ready',
            epicId: updated.epicId || null,
            followUpOf: updated._id
          });
        } catch (error) {
          // Idempotency under concurrency: unique index on followUpOf prevents duplicates.
          if (error && error.code === 11000) {
            followUp = await Todo.findOne({ followUpOf: updated._id });
          } else {
            throw error;
          }
        }
      }
    }

    res.json({
      updated: {
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
      },
      followUp: followUp
        ? {
          id: followUp._id.toString(),
          title: followUp.title,
          description: followUp.description,
          dueDate: followUp.dueDate,
          status: followUp.status,
          priority: followUp.priority,
          points: typeof followUp.points === 'number' ? followUp.points : undefined,
          repeatWeekly: Boolean(followUp.repeatWeekly),
          repeatMonthly: Boolean(followUp.repeatMonthly),
          sprintBucket: followUp.sprintBucket,
          scrumStatus: followUp.scrumStatus,
          epicId: followUp.epicId ? followUp.epicId.toString() : undefined
        }
        : null
    });
  } catch (error) {
    console.error('Error completing todo:', error);
    if (error && error.name === 'CastError') return sendBadRequest(res, 'Invalid id');
    res.status(500).json({ error: 'Failed to complete todo' });
  } finally {
  }
});

// Health check
app.get('/james-todos/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
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
