import React, { useEffect, useRef, useState } from 'react';
import { ScrumStatus, Sprint, SprintBucket, Todo } from './types';
import { todoService } from './services/todoService';
import { sprintService } from './services/sprintService';
import { TodoList } from './components/TodoList';
import { TodoForm } from './components/TodoForm';
import { TodoDetail } from './components/TodoDetail';
import { TodoCalendar } from './components/TodoCalendar';
import { ScrumBoard } from './components/ScrumBoard';
import { DoneList } from './components/DoneList';
import { EpicList } from './components/EpicList';
import { Plus, Download, Calendar as CalendarIcon, Columns, CheckCircle, Layers } from 'lucide-react';
import './App.css';

type View = 'list' | 'form' | 'detail';
type ViewMode = 'list' | 'calendar' | 'board' | 'done' | 'epic';

function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [currentSprint, setCurrentSprint] = useState<Sprint | null>(null);
  const [nextSprint, setNextSprint] = useState<Sprint | null>(null);
  const [currentView, setCurrentView] = useState<View>('list');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const finishLoading = () => { setLoading(false); };
    Promise.all([loadTodos(), loadSprints()]).finally(finishLoading);
  }, []);

  const loadTodos = async () => {
    try {
      const loadedTodos = await todoService.getTodos();
      setTodos(loadedTodos);
    } catch (error) {
      console.error('Failed to load todos:', error);
      setTodos([]);
    }
  };

  const loadSprints = async () => {
    try {
      const all = await sprintService.getSprints().catch(() => []);
      setCurrentSprint(all.find(s => s.status === 'current') || null);
      setNextSprint(all.find(s => s.status === 'next') || null);
    } catch (error) {
      console.error('Failed to load sprints:', error);
    }
  };

  const replaceTodoInState = (next: Todo) => {
    setTodos(prev => {
      const idx = prev.findIndex(t => t.id === next.id);
      if (idx === -1) return [next, ...prev];
      const copy = [...prev];
      copy[idx] = next;
      return copy;
    });
  };

  const todoMutationVersionRef = useRef<Record<string, number>>({});

  const beginTodoMutation = (todoId: string) => {
    const next = (todoMutationVersionRef.current[todoId] || 0) + 1;
    todoMutationVersionRef.current[todoId] = next;
    return next;
  };

  const isLatestTodoMutation = (todoId: string, version: number) => {
    return (todoMutationVersionRef.current[todoId] || 0) === version;
  };

  const handleSaveTodo = async (todo: Todo) => {
    const prevTodo = todo.id ? todos.find(t => t.id === todo.id) : undefined;
    const effectiveSprintId = todo.sprintId || currentSprint?.id;
    try {
      if (todo.id) {
        const mutationVersion = beginTodoMutation(todo.id);
        const optimistic = todo;
        setTodos(prev => prev.map(t => (t.id === optimistic.id ? optimistic : t)));
        const saved = await todoService.updateTodo(todo.id, {
          title: todo.title,
          description: todo.description || '',
          dueDate: todo.dueDate,
          status: todo.status,
          priority: todo.priority,
          points: todo.points,
          repeatWeekly: Boolean(todo.repeatWeekly),
          repeatMonthly: Boolean(todo.repeatMonthly),
          sprintId: effectiveSprintId,
          sprintBucket: todo.sprintBucket,
          scrumStatus: todo.scrumStatus,
          epicId: todo.epicId || undefined
        });
        if (!isLatestTodoMutation(todo.id, mutationVersion)) return;
        replaceTodoInState(saved);
      } else {
        const created = await todoService.createTodo({
          title: todo.title,
          description: todo.description || '',
          dueDate: todo.dueDate,
          status: todo.status,
          priority: todo.priority,
          points: todo.points,
          repeatWeekly: Boolean(todo.repeatWeekly),
          repeatMonthly: Boolean(todo.repeatMonthly),
          sprintId: effectiveSprintId,
          sprintBucket: todo.sprintBucket,
          scrumStatus: todo.scrumStatus,
          epicId: todo.epicId || undefined
        });
        setTodos(prev => [created, ...prev]);
      }

      setCurrentView('list');
      setSelectedTodo(null);
    } catch (error) {
      console.error('Failed to save todo:', error);
      if (todo.id && prevTodo) {
        replaceTodoInState(prevTodo);
      }
      alert('Speichern fehlgeschlagen. Die Änderung wurde zurückgesetzt.');
    }
  };

  const handleDeleteTodo = async (id: string) => {
    if (!window.confirm('Möchten Sie diese Aufgabe wirklich löschen?')) return;
    const prevTodo = todos.find(t => t.id === id);
    const mutationVersion = beginTodoMutation(id);
    setTodos(prev => prev.filter(t => t.id !== id));
    try {
      await todoService.deleteTodo(id);
    } catch (error) {
      console.error('Failed to delete todo:', error);
      if (!isLatestTodoMutation(id, mutationVersion)) return;
      if (prevTodo) {
        setTodos(prev => [prevTodo, ...prev]);
      }
      alert('Löschen fehlgeschlagen. Die Änderung wurde zurückgesetzt.');
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

  const handleStatusChange = async (todo: Todo, newStatus: Todo['status']) => {
    const prevTodo = todos.find(t => t.id === todo.id);
    const mutationVersion = beginTodoMutation(todo.id);
    const optimistic = { ...todo, status: newStatus };
    setTodos(prev => prev.map(t => (t.id === todo.id ? optimistic : t)));

    try {
      if (newStatus === 'Erledigt') {
        const result = await todoService.completeTodo(todo.id);
        if (!isLatestTodoMutation(todo.id, mutationVersion)) return;
        replaceTodoInState(result.updated);
        if (result.followUp) {
          setTodos(prev => [result.followUp as Todo, ...prev]);
        }
        return;
      }

      const saved = await todoService.updateTodo(todo.id, { status: newStatus });
      if (!isLatestTodoMutation(todo.id, mutationVersion)) return;
      replaceTodoInState(saved);
    } catch (error) {
      console.error('Failed to update status:', error);
      if (!isLatestTodoMutation(todo.id, mutationVersion)) return;
      if (prevTodo) replaceTodoInState(prevTodo);
      alert('Speichern fehlgeschlagen. Die Änderung wurde zurückgesetzt.');
    }
  };

  const getSprintIdForBucket = (sprintBucket: SprintBucket): string | null => {
    if (sprintBucket === 'current') return currentSprint?.id || null;
    if (sprintBucket === 'next') return nextSprint?.id || null;
    return null;
  };

  const handleMoveDoneToBacklog = (todo: Todo) => {
    const updatedTodo: Todo = {
      ...todo,
      sprintId: null,
      scrumStatus: 'Ready',
      status: 'Neu'
    };

    const existingIndex = todos.findIndex(t => t.id === todo.id);
    const updatedTodos = [...todos];
    if (existingIndex >= 0) {
      updatedTodos[existingIndex] = updatedTodo;
    } else {
      updatedTodos.push(updatedTodo);
    }

    const prevTodo = todos.find(t => t.id === todo.id);
    const mutationVersion = beginTodoMutation(todo.id);
    setTodos(updatedTodos);
    todoService.updateTodo(todo.id, {
      sprintId: null,
      scrumStatus: 'Ready',
      status: 'Neu'
    }).then(saved => {
      if (!isLatestTodoMutation(todo.id, mutationVersion)) return;
      replaceTodoInState(saved);
    }).catch(error => {
      console.error('Save failed:', error);
      if (!isLatestTodoMutation(todo.id, mutationVersion)) return;
      if (prevTodo) replaceTodoInState(prevTodo);
      alert('Speichern fehlgeschlagen. Die Änderung wurde zurückgesetzt.');
    });
  };

  const handleSprintBucketChange = (todo: Todo, sprintBucket: SprintBucket) => {
    const sprintId = getSprintIdForBucket(sprintBucket);
    const updatedTodo: Todo = {
      ...todo,
      sprintId,
      scrumStatus: sprintBucket === 'current' ? 'Ready' : todo.scrumStatus
    };

    const existingIndex = todos.findIndex(t => t.id === todo.id);
    const updatedTodos = [...todos];
    if (existingIndex >= 0) {
      updatedTodos[existingIndex] = updatedTodo;
    } else {
      updatedTodos.push(updatedTodo);
    }

    const prevTodo = todos.find(t => t.id === todo.id);
    const mutationVersion = beginTodoMutation(todo.id);
    setTodos(updatedTodos);
    todoService.updateTodo(todo.id, {
      sprintId,
      scrumStatus: sprintBucket === 'current' ? 'Ready' : todo.scrumStatus
    }).then(saved => {
      if (!isLatestTodoMutation(todo.id, mutationVersion)) return;
      replaceTodoInState(saved);
    }).catch(error => {
      console.error('Save failed:', error);
      if (!isLatestTodoMutation(todo.id, mutationVersion)) return;
      if (prevTodo) replaceTodoInState(prevTodo);
      alert('Speichern fehlgeschlagen. Die Änderung wurde zurückgesetzt.');
    });
  };

  const handleScrumStatusChange = (todo: Todo, scrumStatus: ScrumStatus) => {
    const statusFromScrum = (s: ScrumStatus): Todo['status'] => {
      switch (s) {
        case 'Ready':
          return 'Neu';
        case 'In Progress':
          return 'In Bearbeitung';
        case 'Review':
          return 'In Bearbeitung';
        case 'Done':
          return 'Erledigt';
        default:
          return todo.status;
      }
    };

    const derivedStatus = statusFromScrum(scrumStatus);
    const updatedTodo: Todo = { ...todo, scrumStatus, status: derivedStatus };
    const existingIndex = todos.findIndex(t => t.id === todo.id);
    const updatedTodos = [...todos];
    if (existingIndex >= 0) {
      updatedTodos[existingIndex] = updatedTodo;
    } else {
      updatedTodos.push(updatedTodo);
    }

    const prevTodo = todos.find(t => t.id === todo.id);
    const mutationVersion = beginTodoMutation(todo.id);
    setTodos(updatedTodos);

    (async () => {
      try {
        if (scrumStatus === 'Done') {
          const result = await todoService.completeTodo(todo.id);
          if (!isLatestTodoMutation(todo.id, mutationVersion)) return;
          replaceTodoInState(result.updated);
          if (result.followUp) {
            setTodos(prev => [result.followUp as Todo, ...prev]);
          }
          return;
        }

        const saved = await todoService.updateTodo(todo.id, {
          scrumStatus,
          status: derivedStatus
        });
        if (!isLatestTodoMutation(todo.id, mutationVersion)) return;
        replaceTodoInState(saved);
      } catch (error) {
        console.error('Save failed:', error);
        if (!isLatestTodoMutation(todo.id, mutationVersion)) return;
        if (prevTodo) replaceTodoInState(prevTodo);
        alert('Speichern fehlgeschlagen. Die Änderung wurde zurückgesetzt.');
      }
    })();
  };

  const handleExportJson = () => {
    todoService.downloadTodoJson(todos);
  };

  const canCloseSprint = (sprint: Sprint | null): boolean => {
    if (!sprint) return false;
    const now = new Date();
    const berlinDate = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(now);
    return berlinDate >= sprint.endDate;
  };

  const getCloseSprintSummary = (sprint: Sprint): { ready: number; inProgress: number; review: number } => {
    const relevant = todos.filter(t => t.sprintId === sprint.id);
    return {
      ready: relevant.filter(t => t.scrumStatus === 'Ready').length,
      inProgress: relevant.filter(t => t.scrumStatus === 'In Progress').length,
      review: relevant.filter(t => t.scrumStatus === 'Review').length
    };
  };

  const handleCloseSprint = async () => {
    if (!currentSprint) return;
    const summary = getCloseSprintSummary(currentSprint);
    const total = summary.ready + summary.inProgress + summary.review;
    const message = `Sprint ${currentSprint.number} wirklich beenden?\n\n` +
      `Es werden verschoben:\n` +
      `- ${summary.ready} offene Aufgaben\n` +
      `- ${summary.inProgress} Aufgaben in Progress\n` +
      `- ${summary.review} Aufgaben in Review\n\n` +
      `${total === 0 ? 'Es gibt keine offenen Aufgaben.' : `Erledigte Aufgaben bleiben im abgeschlossenen Sprint.`}`;
    if (!window.confirm(message)) return;

    try {
      const result = await sprintService.closeSprint(currentSprint.id);
      setCurrentSprint(result.newCurrentSprint);
      await Promise.all([loadTodos(), loadSprints()]);
    } catch (error) {
      console.error('Failed to close sprint:', error);
      alert('Sprint konnte nicht beendet werden.');
    }
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
                    title="Backlog"
                  >
                    Backlog
                  </button>
                  <button
                    onClick={() => handleViewModeChange('calendar')}
                    className={`btn ${viewMode === 'calendar' ? 'btn-primary' : 'btn-outline-primary'}`}
                    title="Kalenderansicht"
                  >
                    <CalendarIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleViewModeChange('board')}
                    className={`btn ${viewMode === 'board' ? 'btn-primary' : 'btn-outline-primary'}`}
                    title="Scrum Board"
                  >
                    <Columns className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleViewModeChange('done')}
                    className={`btn ${viewMode === 'done' ? 'btn-primary' : 'btn-outline-primary'}`}
                    title="Done"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleViewModeChange('epic')}
                    className={`btn ${viewMode === 'epic' ? 'btn-primary' : 'btn-outline-primary'}`}
                    title="Epic"
                  >
                    <Layers className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            {currentView === 'list' && (
              <div className="d-flex gap-2">
                {viewMode === 'board' && canCloseSprint(currentSprint) && (
                  <button
                    onClick={handleCloseSprint}
                    className="btn btn-warning d-flex align-items-center gap-2"
                    title={`Sprint ${currentSprint?.number} beenden`}
                  >
                    <span>Sprint beenden</span>
                  </button>
                )}
                {viewMode !== 'board' && (
                  <>
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
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        <main>
          {currentView === 'list' && viewMode === 'list' && (
            <TodoList
              todos={todos}
              currentSprint={currentSprint}
              nextSprint={nextSprint}
              onView={handleViewTodo}
              onEdit={handleEditTodo}
              onDelete={handleDeleteTodo}
              onStatusChange={handleStatusChange}
              onSprintBucketChange={handleSprintBucketChange}
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

          {currentView === 'list' && viewMode === 'board' && (
            <ScrumBoard
              todos={todos}
              currentSprint={currentSprint}
              onScrumStatusChange={handleScrumStatusChange}
            />
          )}

          {currentView === 'list' && viewMode === 'done' && (
            <DoneList todos={todos} onMoveToBacklog={handleMoveDoneToBacklog} />
          )}

          {currentView === 'list' && viewMode === 'epic' && <EpicList todos={todos} />}

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
