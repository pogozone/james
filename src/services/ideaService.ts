import { Idea } from '../types';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === 'production' ? '/james-todos/api/' : 'http://localhost:3003/james-todos/api/');

export const ideaService = {
  async getIdeas(): Promise<Idea[]> {
    const response = await fetch(`${API_BASE_URL}ideas`);
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  },

  async createIdea(input: { title: string }): Promise<Idea> {
    const response = await fetch(`${API_BASE_URL}ideas`, {
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

  async updateIdea(id: string, input: { title: string }): Promise<Idea> {
    const response = await fetch(`${API_BASE_URL}ideas/${id}`, {
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

  async deleteIdea(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}ideas/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
  }
};
