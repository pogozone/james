import { Sprint } from '../types';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === 'production' ? '/james-todos/api/' : 'http://localhost:3003/james-todos/api/');

export const sprintService = {
  async getSprints(): Promise<Sprint[]> {
    const res = await fetch(`${API_BASE_URL}sprints`);
    if (!res.ok) throw new Error(`Failed to load sprints: ${res.status}`);
    return res.json();
  },

  async getCurrentSprint(): Promise<Sprint | null> {
    const res = await fetch(`${API_BASE_URL}sprints/current`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to load current sprint: ${res.status}`);
    return res.json();
  },

  async createSprint(): Promise<Sprint> {
    const res = await fetch(`${API_BASE_URL}sprints`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to create sprint: ${res.status}`);
    return res.json();
  },

  async closeSprint(id: string): Promise<{ closedSprint: Sprint; newCurrentSprint: Sprint | null; movedTodoCount: number }> {
    const res = await fetch(`${API_BASE_URL}sprints/${id}/close`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to close sprint: ${res.status}`);
    return res.json();
  }
};
