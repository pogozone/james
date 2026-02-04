import { Todo } from '../types';

const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001';

export const todoService = {
  async getTodos(): Promise<Todo[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/todos`);
      if (!response.ok) {
        throw new Error('Failed to fetch todos');
      }
      return response.json();
    } catch (error) {
      console.error('Failed to load todos:', error);
      // Fallback to localStorage if server is not available
      const storedTodos = localStorage.getItem('todos');
      return storedTodos ? JSON.parse(storedTodos) : [];
    }
  },

  async saveTodos(todos: Todo[]): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/todos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(todos),
      });

      if (!response.ok) {
        throw new Error('Failed to save todos');
      }

      const result = await response.json();
      console.log('Todos saved to server:', result);
      
      // Also save to localStorage as backup
      localStorage.setItem('todos', JSON.stringify(todos));
    } catch (error) {
      console.error('Failed to save todos to server, using localStorage:', error);
      // Fallback to localStorage
      localStorage.setItem('todos', JSON.stringify(todos));
    }
  },

  downloadTodoJson(todos: Todo[]): void {
    try {
      const jsonString = JSON.stringify(todos, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = 'todo.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('Todo JSON file downloaded');
    } catch (error) {
      console.error('Failed to download JSON:', error);
    }
  },

  generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }
};
