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

// POST todos (save/update)
app.post('/james-todos/api/todos', async (req, res) => {
  try {
    const todos = req.body;
    
    // Clear existing todos
    await Todo.deleteMany({});
    
    // Insert new todos
    const todosToSave = todos.map(todo => ({
      title: todo.title,
      description: todo.description || '',
      dueDate: todo.dueDate,
      status: todo.status === 'Wiedervorlage' ? 'Neu' : todo.status,
      priority: todo.priority,
      points: (() => {
        const p = typeof todo.points === 'number' ? todo.points : Number(todo.points);
        return [1, 2, 3, 5, 8].includes(p) ? p : undefined;
      })(),
      repeatWeekly: Boolean(todo.repeatWeekly) || todo.status === 'Wiedervorlage',
      repeatMonthly: Boolean(todo.repeatMonthly),
      sprintBucket: todo.sprintBucket || 'none',
      scrumStatus: todo.scrumStatus || 'Ready',
      epicId: todo.epicId || null
    }));
    
    await Todo.insertMany(todosToSave);
    console.log('Todos saved to MongoDB:', todos.length, 'items');
    res.json({ success: true, count: todos.length });
  } catch (error) {
    console.error('Error saving todos:', error);
    res.status(500).json({ error: 'Failed to save todos' });
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

async function ensureBoardItemsForTodos() {
  const todos = await Todo.find().sort({ createdAt: -1 });

  for (const todo of todos) {
    const existing = await BoardItem.findOne({ todoId: todo._id });
    if (existing) continue;

    const boardStatus = TODO_STATUS_TO_BOARD_STATUS[todo.status] || 'Backlog';
    const maxOrderItem = await BoardItem.findOne({ status: boardStatus }).sort({ order: -1 });
    const nextOrder = maxOrderItem ? maxOrderItem.order + 1 : 0;

    await BoardItem.create({
      title: todo.title,
      description: todo.description,
      epic: '',
      status: boardStatus,
      order: nextOrder,
      todoId: todo._id
    });
  }
}

// GET board items
app.get('/james-todos/api/board-items', async (req, res) => {
  try {
    await ensureBoardItemsForTodos();

    const items = await BoardItem.find().populate('todoId').sort({ status: 1, order: 1, createdAt: 1 });
    const formatted = items.map(item => ({
      id: item._id.toString(),
      title: item.title,
      description: item.description,
      epic: item.epic,
      status: item.status,
      order: item.order,
      todoId: item.todoId ? item.todoId._id.toString() : undefined,
      todo: item.todoId ? {
        id: item.todoId._id.toString(),
        title: item.todoId.title,
        description: item.todoId.description,
        dueDate: item.todoId.dueDate,
        status: item.todoId.status,
        priority: item.todoId.priority
      } : undefined
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Error reading board items:', error);
    res.status(500).json({ error: 'Failed to read board items' });
  }
});

// POST create board item
app.post('/james-todos/api/board-items', async (req, res) => {
  try {
    const { title, description, epic, status, todoId } = req.body || {};

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    const normalizedStatus = status || 'Backlog';
    const maxOrderItem = await BoardItem.findOne({ status: normalizedStatus }).sort({ order: -1 });
    const nextOrder = maxOrderItem ? maxOrderItem.order + 1 : 0;

    const created = await BoardItem.create({
      title: title.trim(),
      description: typeof description === 'string' ? description : '',
      epic: typeof epic === 'string' ? epic : '',
      status: normalizedStatus,
      order: nextOrder,
      todoId: todoId || undefined
    });

    res.status(201).json({
      id: created._id.toString(),
      title: created.title,
      description: created.description,
      epic: created.epic,
      status: created.status,
      order: created.order,
      todoId: created.todoId ? created.todoId.toString() : undefined
    });
  } catch (error) {
    console.error('Error creating board item:', error);
    res.status(500).json({ error: 'Failed to create board item' });
  }
});

// PATCH update board item
app.patch('/james-todos/api/board-items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};

    const allowed = {};
    if (typeof updates.title === 'string') allowed.title = updates.title.trim();
    if (typeof updates.description === 'string') allowed.description = updates.description;
    if (typeof updates.epic === 'string') allowed.epic = updates.epic;
    if (typeof updates.status === 'string') allowed.status = updates.status;
    if (typeof updates.order === 'number' && Number.isFinite(updates.order)) allowed.order = updates.order;

    const updated = await BoardItem.findByIdAndUpdate(id, allowed, { new: true });
    if (!updated) return res.status(404).json({ error: 'Not found' });

    res.json({
      id: updated._id.toString(),
      title: updated.title,
      description: updated.description,
      epic: updated.epic,
      status: updated.status,
      order: updated.order
    });
  } catch (error) {
    console.error('Error updating board item:', error);
    res.status(500).json({ error: 'Failed to update board item' });
  }
});

// DELETE board item
app.delete('/james-todos/api/board-items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await BoardItem.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting board item:', error);
    res.status(500).json({ error: 'Failed to delete board item' });
  }
});

// POST move/reorder (bulk) for a column
app.post('/james-todos/api/board-items/reorder', async (req, res) => {
  try {
    const { status, orderedIds } = req.body || {};
    if (!status || !Array.isArray(orderedIds)) {
      return res.status(400).json({ error: 'status and orderedIds are required' });
    }

    const todoStatus = BOARD_STATUS_TO_TODO_STATUS[status];

    const bulkOps = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { status, order: index } }
      }
    }));

    if (bulkOps.length > 0) {
      await BoardItem.bulkWrite(bulkOps);
    }

    if (todoStatus) {
      const movedItems = await BoardItem.find({ _id: { $in: orderedIds } }, { todoId: 1 });
      const todoIds = movedItems
        .map(i => i.todoId)
        .filter(Boolean);
      if (todoIds.length > 0) {
        await Todo.updateMany({ _id: { $in: todoIds } }, { $set: { status: todoStatus } });
      }
    }

    res.json({ success: true, count: orderedIds.length });
  } catch (error) {
    console.error('Error reordering board items:', error);
    res.status(500).json({ error: 'Failed to reorder board items' });
  }
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
