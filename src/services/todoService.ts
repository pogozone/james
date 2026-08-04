import { Todo } from '../types';
import { formatDateOnly } from '../utils/dateOnly';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === 'production' ? '/james-todos/api/' : 'http://localhost:3003/james-todos/api/');

export const todoService = {
  async getTodos(): Promise<Todo[]> {
    try {
      const response = await fetch(`${API_BASE_URL}todos`);
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to load todos:', error);
      if (error instanceof Error) {
        throw new Error(`MongoDB-Verbindung fehlgeschlagen: ${error.message}. Bitte überprüfen Sie, ob der MongoDB-Server auf Port 3003 läuft.`);
      }
      throw new Error('MongoDB-Verbindung fehlgeschlagen. Bitte überprüfen Sie, ob der MongoDB-Server auf Port 3003 läuft.');
    }
  },

  async createTodo(input: Omit<Todo, 'id'>): Promise<Todo> {
    const response = await fetch(`${API_BASE_URL}todos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  },

  async completeTodo(id: string): Promise<{ updated: Todo; followUp: Todo | null }> {
    const response = await fetch(`${API_BASE_URL}todos/${id}/complete`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  },

  async updateTodo(id: string, updates: Partial<Omit<Todo, 'id'>>): Promise<Todo> {
    const response = await fetch(`${API_BASE_URL}todos/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  },

  async deleteTodo(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}todos/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
  },

  downloadTodoJson(todos: Todo[]): void {
    const dataStr = JSON.stringify(todos, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const now = new Date();
    const exportFileDefaultName = `todos-${formatDateOnly(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())))}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  },
};
