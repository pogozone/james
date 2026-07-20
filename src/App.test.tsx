import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('./services/todoService', () => ({
  todoService: {
    getTodos: jest.fn().mockResolvedValue([]),
    createTodo: jest.fn(),
    updateTodo: jest.fn(),
    deleteTodo: jest.fn(),
    completeTodo: jest.fn(),
    downloadTodoJson: jest.fn()
  }
}));

jest.mock('./services/sprintService', () => ({
  sprintService: {
    getSprints: jest.fn().mockResolvedValue([]),
    getCurrentSprint: jest.fn().mockResolvedValue(null),
    createSprint: jest.fn(),
    closeSprint: jest.fn()
  }
}));

import App from './App';

test('renders app title', async () => {
  render(<App />);
  await waitFor(() => {
    expect(screen.getByText('James')).toBeInTheDocument();
  });
});
