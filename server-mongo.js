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
    enum: ['Neu', 'In Bearbeitung', 'Erledigt', 'Wiedervorlage', 'Unerledigt geschlossen'],
    default: 'Neu'
  },
  priority: {
    type: String,
    enum: ['Super wichtig', 'Bald erledigen', 'Hat Zeit'],
    default: 'Hat Zeit'
  }
}, {
  timestamps: true
});

const Todo = mongoose.model('Todo', TodoSchema);

// API Routes

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
      priority: todo.priority
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
      status: todo.status,
      priority: todo.priority
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
