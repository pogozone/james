import { Epic } from '../types';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === 'production' ? '/james-todos/api/' : 'http://localhost:3003/james-todos/api/');

export const epicService = {
  async getEpics(): Promise<Epic[]> {
    const response = await fetch(`${API_BASE_URL}epics`);
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  },

  async createEpic(input: { title: string; description?: string }): Promise<Epic> {
    const response = await fetch(`${API_BASE_URL}epics`, {
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

  async updateEpic(id: string, input: { title: string; description?: string }): Promise<Epic> {
    const response = await fetch(`${API_BASE_URL}epics/${id}`, {
      method: 'PATCH',
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

  async deleteEpic(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}epics/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
  }
};
