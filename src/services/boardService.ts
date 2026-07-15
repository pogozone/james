import { BoardItem, BoardStatus, CreateBoardItemInput } from '../types';

const API_BASE_URL = process.env.NODE_ENV === 'production' ? '/james-todos/api/' : 'http://localhost:3003/james-todos/api/';

export const boardService = {
  async getBoardItems(): Promise<BoardItem[]> {
    const response = await fetch(`${API_BASE_URL}board-items`);
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  },

  async createBoardItem(input: CreateBoardItemInput): Promise<BoardItem> {
    const response = await fetch(`${API_BASE_URL}board-items`, {
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

  async updateBoardItem(id: string, updates: Partial<BoardItem>): Promise<BoardItem> {
    const response = await fetch(`${API_BASE_URL}board-items/${id}`, {
      method: 'PATCH',
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

  async deleteBoardItem(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}board-items/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
  },

  async reorderColumn(status: BoardStatus, orderedIds: string[]): Promise<void> {
    const response = await fetch(`${API_BASE_URL}board-items/reorder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status, orderedIds })
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
  }
};
