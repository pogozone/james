import React, { useState, useEffect } from 'react';
import { Todo } from './types';
import { todoService } from './services/todoService';
import { TodoList } from './components/TodoList';
import { TodoForm } from './components/TodoForm';
import { TodoDetail } from './components/TodoDetail';
import { TodoCalendar } from './components/TodoCalendar';
import { Plus, Download, Calendar as CalendarIcon } from 'lucide-react';
import './App.css';

type View = 'list' | 'form' | 'detail';
type ViewMode = 'list' | 'calendar';

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [currentView, setCurrentView] = useState<View>('list');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    try {
      const loadedTodos = await todoService.getTodos();
      setTodos(loadedTodos);
    } catch (error) {
      console.error('Failed to load todos:', error);
      setTodos([]);
    } finally {
      setLoading(false);
    }
  };

  const saveTodos = async (updatedTodos: Todo[]) => {
    try {
      await todoService.saveTodos(updatedTodos);
      setTodos(updatedTodos);
      return Promise.resolve();
    } catch (error) {
      console.error('Failed to save todos:', error);
      return Promise.reject(error);
    }
  };

  const handleSaveTodo = (todo: Todo) => {
    const existingIndex = todos.findIndex(t => t.id === todo.id);
    let updatedTodos: Todo[];

    if (existingIndex >= 0) {
      updatedTodos = [...todos];
      updatedTodos[existingIndex] = todo;
    } else {
      updatedTodos = [...todos, todo];
    }

    saveTodos(updatedTodos);
    setCurrentView('list');
    setSelectedTodo(null);
  };

  const handleDeleteTodo = (id: string) => {
    if (window.confirm('Möchten Sie diese Aufgabe wirklich löschen?')) {
      const updatedTodos = todos.filter(todo => todo.id !== id);
      saveTodos(updatedTodos);
    }
  };

  const handleViewTodo = (todo: Todo) => {
    setSelectedTodo(todo);
    setCurrentView('detail');
  };

  const handleEditTodo = (todo: Todo) => {
    setSelectedTodo(todo);
    setCurrentView('form');
  };

  const handleCreateTodo = () => {
    setSelectedTodo(null);
    setCurrentView('form');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedTodo(null);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    setCurrentView('list'); // Reset to list view when switching modes
  };

  const handleStatusChange = (todo: Todo, newStatus: Todo['status']) => {
    const updatedTodo = { ...todo, status: newStatus };
    const existingIndex = todos.findIndex(t => t.id === todo.id);
    let updatedTodos: Todo[];

    if (existingIndex >= 0) {
      updatedTodos = [...todos];
      updatedTodos[existingIndex] = updatedTodo;
    } else {
      updatedTodos = [...todos, updatedTodo];
    }

    // Always update the state first
    setTodos(updatedTodos);

    // If status changed to "Wiedervorlage", open edit mode immediately
    if (newStatus === 'Wiedervorlage') {
      console.log('Wiedervorlage detected, switching to edit mode');
      setSelectedTodo(updatedTodo);
      setCurrentView('form');
      
      // Focus date picker after component renders
      setTimeout(() => {
        console.log('Attempting to focus date input');
        if ((window as any).focusDateInput) {
          console.log('Calling focusDateInput function');
          (window as any).focusDateInput();
        } else {
          console.log('focusDateInput function not available');
          // Fallback to direct DOM query
          const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
          if (dateInput) {
            console.log('Found date input, focusing directly');
            dateInput.focus();
            dateInput.click();
            dateInput.showPicker?.();
          } else {
            console.log('No date input found');
          }
        }
      }, 200);
    }

    // Save in background
    todoService.saveTodos(updatedTodos).catch(error => {
      console.error('Save failed:', error);
    });
  };

  const handleExportJson = () => {
    todoService.downloadTodoJson(todos);
  };

  if (loading) {
    return (
      <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Laden...</span>
          </div>
          <p className="mt-3 text-muted">Laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light py-4">
      <div className="container">
        <header className="mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              <h1 className="display-5 fw-bold text-dark">James</h1>
              {currentView === 'list' && (
                <div className="btn-group" role="group">
                  <button
                    onClick={() => handleViewModeChange('list')}
                    className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
                    title="Listenansicht"
                  >
                    Liste
                  </button>
                  <button
                    onClick={() => handleViewModeChange('calendar')}
                    className={`btn ${viewMode === 'calendar' ? 'btn-primary' : 'btn-outline-primary'}`}
                    title="Kalenderansicht"
                  >
                    <CalendarIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            {currentView === 'list' && (
              <div className="d-flex gap-2">
                <button
                  onClick={handleExportJson}
                  className="btn btn-outline-success d-flex align-items-center gap-2"
                  title="Als JSON exportieren"
                >
                  <Download className="w-5 h-5" />
                  <span>Export</span>
                </button>
                <button
                  onClick={handleCreateTodo}
                  className="btn btn-primary d-flex align-items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Neue Aufgabe</span>
                </button>
              </div>
            )}
          </div>
        </header>

        <main>
          {currentView === 'list' && viewMode === 'list' && (
            <TodoList
              todos={todos}
              onView={handleViewTodo}
              onEdit={handleEditTodo}
              onDelete={handleDeleteTodo}
              onStatusChange={handleStatusChange}
            />
          )}
          
          {currentView === 'list' && viewMode === 'calendar' && (
            <TodoCalendar
              todos={todos}
              onView={handleViewTodo}
              onEdit={handleEditTodo}
              onStatusChange={handleStatusChange}
            />
          )}

          {currentView === 'form' && (
            <TodoForm
              todo={selectedTodo || undefined}
              onSave={handleSaveTodo}
              onCancel={handleBackToList}
            />
          )}

          {currentView === 'detail' && selectedTodo && (
            <TodoDetail
              todo={selectedTodo}
              onEdit={handleEditTodo}
              onBack={handleBackToList}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
