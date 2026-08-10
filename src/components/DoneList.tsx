import React, { useMemo } from 'react';
import { Todo } from '../types';
import { parseDateOnly } from '../utils/dateOnly';
import { Calendar, Eye, RotateCcw } from 'lucide-react';
import { PageHeader } from './PageHeader';

interface DoneListProps {
  todos: Todo[];
  onMoveToBacklog: (todo: Todo) => void;
  onView: (todo: Todo) => void;
}

export function DoneList({ todos, onMoveToBacklog, onView }: DoneListProps) {
  const doneTodos = useMemo(() => {
    const filtered = todos.filter(t => t.status === 'Erledigt' || t.status === 'Unerledigt geschlossen');
    filtered.sort((a, b) => {
      const aDate = parseDateOnly(a.dueDate).getTime();
      const bDate = parseDateOnly(b.dueDate).getTime();
      return aDate - bDate;
    });
    return filtered;
  }, [todos]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="done-page">
      <PageHeader title="Done" />

      {doneTodos.length === 0 ? (
        <div className="text-center py-5">
          <h3 className="h5 fw-semibold text-muted mb-2">Keine erledigten Aufgaben</h3>
        </div>
      ) : doneTodos.map(todo => (
        <div key={todo.id} className="card shadow-sm mb-3">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start">
              <div className="flex-grow-1">
                <h5 className="card-title mb-2">{todo.title}</h5>
                {typeof todo.points === 'number' ? (
                  <div className="mb-2">
                    <span className="badge text-bg-dark" title="Punkte">{todo.points}P</span>
                  </div>
                ) : null}
                {todo.description ? <p className="card-text text-muted mb-3">{todo.description}</p> : null}
                <div className="d-flex align-items-center gap-2 text-muted small">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(todo.dueDate)}</span>
                  <span>·</span>
                  <span>{todo.status}</span>
                </div>
              </div>

              <div className="ms-3 d-flex flex-column gap-2">
                <button
                  className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-2"
                  onClick={() => onView(todo)}
                  title="Detailansicht öffnen"
                >
                  <Eye className="w-4 h-4" />
                  <span>Details</span>
                </button>
                <button
                  className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2"
                  onClick={() => onMoveToBacklog(todo)}
                  title="Ins Backlog verschieben"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Ins Backlog</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
