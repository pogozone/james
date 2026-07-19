import React from 'react';
import { render, screen } from '@testing-library/react';

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

import App from './App';

test('renders app title', async () => {
  render(<App />);
  expect(await screen.findByText('James')).toBeInTheDocument();
});
