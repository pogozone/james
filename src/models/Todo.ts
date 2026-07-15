// @ts-nocheck
import mongoose from 'mongoose';

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
  }
}, {
  timestamps: true
});

const Todo = mongoose.model('Todo', TodoSchema);
export { Todo };
