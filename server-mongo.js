const path = require('path');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 3003;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/james-todos';

// Export app for integration tests; start server only when run directly
if (require.main === module) {
  mongoose.connect(MONGODB_URI)
    .then(() => {
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => console.error('MongoDB connection error:', err));
}

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

// Sprint Schema
const SprintSchema = new mongoose.Schema({
  number: {
    type: Number,
    required: true,
    unique: true
  },
  startDate: {
    type: String,
    required: true
  },
  endDate: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['current', 'next', 'future', 'closed'],
    required: true
  },
  closedAt: {
    type: Date,
    required: false
  }
}, {
  timestamps: true
});

SprintSchema.index({ status: 1 });
SprintSchema.index({ number: 1 });

const Sprint = mongoose.model('Sprint', SprintSchema);

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
  sprintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sprint',
    required: false
  },
  sprintBucket: {
    type: String,
    enum: ['current', 'next', 'none'],
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

// Helpers for sprint date calculations (Sunday to Saturday, Europe/Berlin)
function getBerlinWeekBoundaries(date) {
  const d = new Date(date);
  // Build a Berlin-local YYYY-MM-DD string for the given date
  const berlin = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(d);
  const [y, m, day] = berlin.split('-').map(Number);
  const localSunday = new Date(Date.UTC(y, m - 1, day));
  // Day of week: 0=Sun, 1=Mon, ... 6=Sat in Berlin-local terms (UTC calculation is fine because localSunday is midnight Berlin)
  const dayOfWeek = localSunday.getUTCDay();
  const start = new Date(localSunday);
  start.setUTCDate(localSunday.getUTCDate() - dayOfWeek);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start: formatDateOnlyUTC(start), end: formatDateOnlyUTC(end) };
}

async function ensureCurrentSprint() {
  const now = new Date();
  const { start, end } = getBerlinWeekBoundaries(now);
  const current = await Sprint.findOne({ status: 'current' });
  if (current) return current;

  const highest = await Sprint.findOne().sort({ number: -1 });
  const nextNumber = (highest?.number || 0) + 1;
  return Sprint.create({ number: nextNumber, startDate: start, endDate: end, status: 'current' });
}

async function findOrCreateNextSprint(referenceDate) {
  const nextSprint = await Sprint.findOne({ status: 'next' });
  if (nextSprint) return nextSprint;

  const nextSunday = new Date(referenceDate);
  nextSunday.setUTCDate(nextSunday.getUTCDate() + (nextSunday.getUTCDay() === 0 ? 7 : 7 - nextSunday.getUTCDay()));
  const start = formatDateOnlyUTC(nextSunday);
  const endDate = new Date(nextSunday);
  endDate.setUTCDate(nextSunday.getUTCDate() + 6);
  const end = formatDateOnlyUTC(endDate);

  const highest = await Sprint.findOne().sort({ number: -1 });
  const nextNumber = (highest?.number || 0) + 1;
  return Sprint.create({ number: nextNumber, startDate: start, endDate: end, status: 'next' });
}

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

    // Migrate old sprintBucket to real sprints on first boot after deployment
    const currentSprint = await ensureCurrentSprint();
    const currentBucket = await Todo.countDocuments({ sprintBucket: 'current' });
    if (currentBucket > 0) {
      await Todo.updateMany({ sprintBucket: 'current' }, { $set: { sprintId: currentSprint._id }, $unset: { sprintBucket: 1 } });
      console.log('Migrated sprintBucket=current to sprintId:', currentBucket);
    }
    const nextBucketCount = await Todo.countDocuments({ sprintBucket: 'next' });
    if (nextBucketCount > 0) {
      const nextSprint = await findOrCreateNextSprint(new Date(currentSprint.endDate + 'T00:00:00Z'));
      await Todo.updateMany({ sprintBucket: 'next' }, { $set: { sprintId: nextSprint._id }, $unset: { sprintBucket: 1 } });
      console.log('Migrated sprintBucket=next to sprintId:', nextBucketCount);
    }
    const noneBucket = await Todo.countDocuments({ sprintBucket: 'none' });
    if (noneBucket > 0) {
      await Todo.updateMany({ sprintBucket: 'none' }, { $unset: { sprintBucket: 1 } });
      console.log('Removed legacy sprintBucket=none:', noneBucket);
    }
  } catch (error) {
    console.error('Failed to run data migrations:', error);
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
      sprintId: todo.sprintId ? todo.sprintId.toString() : undefined,
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
    if (todo.sprintBucket && !SPRINT_BUCKETS.includes(normalizedSprintBucket)) return sendBadRequest(res, 'Invalid sprintBucket');

    let sprintId = null;
    if (typeof todo.sprintId === 'string' && todo.sprintId) {
      if (!isValidObjectId(todo.sprintId)) return sendBadRequest(res, 'Invalid sprintId');
      const sprintExists = await Sprint.findById(todo.sprintId);
      if (!sprintExists) return sendBadRequest(res, 'Sprint not found');
      sprintId = todo.sprintId;
    }
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
      sprintId,
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
      sprintId: created.sprintId ? created.sprintId.toString() : undefined,
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
    if (typeof updates.sprintId === 'string' || updates.sprintId === null) {
      if (updates.sprintId === null || updates.sprintId === '') {
        allowed.sprintId = null;
      } else {
        if (!isValidObjectId(updates.sprintId)) return sendBadRequest(res, 'Invalid sprintId');
        const sprintExists = await Sprint.findById(updates.sprintId);
        if (!sprintExists) return sendBadRequest(res, 'Sprint not found');
        allowed.sprintId = updates.sprintId;
      }
    }
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
      sprintId: updated.sprintId ? updated.sprintId.toString() : undefined,
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
          nextDate.setUTCDate(1);
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
        sprintId: updated.sprintId ? updated.sprintId.toString() : undefined,
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
          sprintId: followUp.sprintId ? followUp.sprintId.toString() : undefined,
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

// Sprint routes
function formatSprint(sprint) {
  return {
    id: sprint._id.toString(),
    number: sprint.number,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    status: sprint.status,
    closedAt: sprint.closedAt ? sprint.closedAt.toISOString() : null,
    createdAt: sprint.createdAt ? sprint.createdAt.toISOString() : null
  };
}

app.get('/james-todos/api/sprints', async (req, res) => {
  try {
    const sprints = await Sprint.find().sort({ number: -1 });
    res.json(sprints.map(formatSprint));
  } catch (error) {
    console.error('Error reading sprints:', error);
    res.status(500).json({ error: 'Failed to read sprints' });
  }
});

app.get('/james-todos/api/sprints/current', async (req, res) => {
  try {
    const current = await Sprint.findOne({ status: 'current' });
    if (!current) return res.status(404).json({ error: 'No current sprint' });
    res.json(formatSprint(current));
  } catch (error) {
    console.error('Error reading current sprint:', error);
    res.status(500).json({ error: 'Failed to read current sprint' });
  }
});

app.post('/james-todos/api/sprints', async (req, res) => {
  try {
    const now = new Date();
    const nextSunday = new Date(now);
    nextSunday.setUTCDate(nextSunday.getUTCDate() + (nextSunday.getUTCDay() === 0 ? 7 : 7 - nextSunday.getUTCDay()));
    const start = formatDateOnlyUTC(nextSunday);
    const endDate = new Date(nextSunday);
    endDate.setUTCDate(nextSunday.getUTCDate() + 6);
    const end = formatDateOnlyUTC(endDate);

    const highest = await Sprint.findOne().sort({ number: -1 });
    const number = (highest?.number || 0) + 1;

    const sprint = await Sprint.create({ number, startDate: start, endDate: end, status: 'future' });
    res.status(201).json(formatSprint(sprint));
  } catch (error) {
    console.error('Error creating sprint:', error);
    res.status(500).json({ error: 'Failed to create sprint' });
  }
});

app.post('/james-todos/api/sprints/:id/close', async (req, res) => {
  const { id } = req.params;
  if (!isValidObjectId(id)) return sendBadRequest(res, 'Invalid sprint id');

  // Optimistic concurrency guard: only one process can close a given sprint.
  // We use a unique race by attempting to transition the sprint to closed.
  try {
    const alreadyClosed = await Sprint.findOne({ _id: id, status: 'closed' });
    if (alreadyClosed) {
      const nextCurrent = await Sprint.findOne({ status: 'current' }) || await Sprint.findOne({ status: 'next' }) || await Sprint.findOne({ status: 'future' });
      return res.json({
        closedSprint: formatSprint(alreadyClosed),
        newCurrentSprint: nextCurrent ? formatSprint(nextCurrent) : null,
        movedTodoCount: 0
      });
    }

    const currentSprint = await Sprint.findOneAndUpdate(
      { _id: id, status: 'current' },
      { $set: { status: 'closed', closedAt: new Date() } },
      { new: true }
    );

    if (!currentSprint) {
      return res.status(400).json({ error: 'Sprint is not current or does not exist' });
    }

    // Determine the follow-up sprint (the existing next or future sprint, or create one)
    let nextSprint = await Sprint.findOne({ status: 'next' }) || await Sprint.findOne({ status: 'future' });
    if (!nextSprint) {
      const reference = new Date(currentSprint.endDate + 'T00:00:00Z');
      const nextSunday = new Date(reference);
      nextSunday.setUTCDate(reference.getUTCDate() + (reference.getUTCDay() === 0 ? 7 : 7 - reference.getUTCDay()));
      const start = formatDateOnlyUTC(nextSunday);
      const nextEndDate = new Date(nextSunday);
      nextEndDate.setUTCDate(nextSunday.getUTCDate() + 6);
      const end = formatDateOnlyUTC(nextEndDate);

      const highest = await Sprint.findOne().sort({ number: -1 });
      const number = (highest?.number || 0) + 1;
      nextSprint = await Sprint.create({ number, startDate: start, endDate: end, status: 'next' });
    }

    // Determine the sprint that will become the new next sprint
    let newNextSprint = await Sprint.findOne({ status: 'future', _id: { $ne: nextSprint._id } });
    if (!newNextSprint) {
      const reference = new Date(nextSprint.endDate + 'T00:00:00Z');
      const nextSunday = new Date(reference);
      nextSunday.setUTCDate(reference.getUTCDate() + (reference.getUTCDay() === 0 ? 7 : 7 - reference.getUTCDay()));
      const start = formatDateOnlyUTC(nextSunday);
      const nextEndDate = new Date(nextSunday);
      nextEndDate.setUTCDate(nextSunday.getUTCDate() + 6);
      const end = formatDateOnlyUTC(nextEndDate);

      const highest = await Sprint.findOne().sort({ number: -1 });
      const number = (highest?.number || 0) + 1;
      newNextSprint = await Sprint.create({ number, startDate: start, endDate: end, status: 'future' });
    }

    // Move all non-Done todos of the closing sprint to the next one, resetting scrum status.
    const moveResult = await Todo.updateMany(
      { sprintId: currentSprint._id, scrumStatus: { $ne: 'Done' } },
      { $set: { sprintId: nextSprint._id, scrumStatus: 'Ready', status: 'Neu' } }
    );

    // Promote the follow-up sprint to current after move is persisted.
    nextSprint.status = 'current';
    await nextSprint.save();

    // Promote the future sprint to next and create another future sprint if needed.
    newNextSprint.status = 'next';
    await newNextSprint.save();

    const existingFuture = await Sprint.findOne({ status: 'future', _id: { $ne: newNextSprint._id } });
    if (!existingFuture) {
      const reference = new Date(newNextSprint.endDate + 'T00:00:00Z');
      const nextSunday = new Date(reference);
      nextSunday.setUTCDate(reference.getUTCDate() + (reference.getUTCDay() === 0 ? 7 : 7 - reference.getUTCDay()));
      const start = formatDateOnlyUTC(nextSunday);
      const nextEndDate = new Date(nextSunday);
      nextEndDate.setUTCDate(nextSunday.getUTCDate() + 6);
      const end = formatDateOnlyUTC(nextEndDate);

      const highest = await Sprint.findOne().sort({ number: -1 });
      const number = (highest?.number || 0) + 1;
      await Sprint.create({ number, startDate: start, endDate: end, status: 'future' });
    }

    res.json({
      closedSprint: formatSprint(currentSprint),
      newCurrentSprint: formatSprint(nextSprint),
      movedTodoCount: moveResult?.nModified || moveResult?.modifiedCount || 0
    });
  } catch (error) {
    console.error('Error closing sprint:', error);
    if (error && error.name === 'CastError') return sendBadRequest(res, 'Invalid sprint id');
    res.status(500).json({ error: 'Failed to close sprint' });
  }
});

// Health check
app.get('/james-todos/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const buildDirectory = path.join(__dirname, 'build');

app.use(express.static(buildDirectory));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/james-todos/api/')) {
    return next();
  }

  res.sendFile(path.join(buildDirectory, 'index.html'));
});

// Disable trailing slash redirects
app.use((req, res, next) => {
  if (req.path.substr(-1) === '/' && req.path.length > 1) {
    res.redirect(301, req.path.slice(0, -1));
  } else {
    next();
  }
});

module.exports = app;
