const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const TODO_FILE = path.join(__dirname, 'public', 'todo.json');

// Middleware
app.use(cors());
app.use(express.json());

// API Routes

// GET todos
app.get('/api/todos', (req, res) => {
  try {
    if (fs.existsSync(TODO_FILE)) {
      const data = fs.readFileSync(TODO_FILE, 'utf8');
      res.json(JSON.parse(data));
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error reading todos:', error);
    res.status(500).json({ error: 'Failed to read todos' });
  }
});

// POST todos (save/update)
app.post('/api/todos', (req, res) => {
  try {
    const todos = req.body;
    fs.writeFileSync(TODO_FILE, JSON.stringify(todos, null, 2), 'utf8');
    console.log('Todos saved to file:', todos.length, 'items');
    res.json({ success: true, count: todos.length });
  } catch (error) {
    console.error('Error saving todos:', error);
    res.status(500).json({ error: 'Failed to save todos' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Todo file: ${TODO_FILE}`);
});
