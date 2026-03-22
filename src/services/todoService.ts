import { Todo } from '../types';

const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/james-todos/api/' : 'http://localhost:3002/james-todos/api/';

export const todoService = {
  async getTodos(): Promise<Todo[]> {
    try {
      const response = await fetch(`${API_BASE_URL}todos/`);
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to load todos:', error);
      if (error instanceof Error) {
        throw new Error(`MongoDB-Verbindung fehlgeschlagen: ${error.message}. Bitte überprüfen Sie, ob der MongoDB-Server auf Port 3002 läuft.`);
      }
      throw new Error('MongoDB-Verbindung fehlgeschlagen. Bitte überprüfen Sie, ob der MongoDB-Server auf Port 3002 läuft.');
    }
  },

  async saveTodos(todos: Todo[]): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}todos/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(todos),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to save todos:', error);
      if (error instanceof Error) {
        throw new Error(`MongoDB-Verbindung fehlgeschlagen: ${error.message}. Bitte überprüfen Sie, ob der MongoDB-Server auf Port 3002 läuft.`);
      }
      throw new Error('MongoDB-Verbindung fehlgeschlagen. Bitte überprüfen Sie, ob der MongoDB-Server auf Port 3002 läuft.');
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
