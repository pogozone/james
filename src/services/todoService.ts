import { Todo } from '../types';

const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3004/api';

export const todoService = {
  async getTodos(): Promise<Todo[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/todos`);
      if (!response.ok) {
        throw new Error('Failed to fetch todos');
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to load todos:', error);
      // Fallback to localStorage if server is not available
      const storedTodos = localStorage.getItem('todos');
      return storedTodos ? JSON.parse(storedTodos) : [];
    }
  },

  async saveTodos(todos: Todo[]): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/todos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(todos),
      });

      if (!response.ok) {
        throw new Error('Failed to save todos');
      }
    } catch (error) {
      console.error('Failed to save todos:', error);
      // Fallback to localStorage if server is not available
      localStorage.setItem('todos', JSON.stringify(todos));
    }
  },

  downloadTodoJson(todos: Todo[]): void {
    const dataStr = JSON.stringify(todos, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `todos-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  },

  generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }
};
