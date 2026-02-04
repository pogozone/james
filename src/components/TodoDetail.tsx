import React from 'react';
import { Todo } from '../types';
import { Calendar, Edit, ArrowLeft, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface TodoDetailProps {
  todo: Todo;
  onEdit: (todo: Todo) => void;
  onBack: () => void;
}

export const TodoDetail: React.FC<TodoDetailProps> = ({ todo, onEdit, onBack }) => {
  const getStatusIcon = (status: Todo['status']) => {
    switch (status) {
      case 'Neu':
        return <AlertCircle className="w-5 h-5 text-secondary" />;
      case 'In Bearbeitung':
        return <Clock className="w-5 h-5 text-primary" />;
      case 'Erledigt':
        return <CheckCircle className="w-5 h-5 text-success" />;
      case 'Wiedervorlage':
        return <AlertCircle className="w-5 h-5 text-warning" />;
      case 'Unerledigt geschlossen':
        return <AlertCircle className="w-5 h-5 text-danger" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: Todo['status']) => {
    switch (status) {
      case 'Neu':
        return 'bg-secondary';
      case 'In Bearbeitung':
        return 'bg-primary';
      case 'Erledigt':
        return 'bg-success';
      case 'Wiedervorlage':
        return 'bg-warning';
      case 'Unerledigt geschlossen':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const isOverdue = new Date(todo.dueDate) < new Date() && todo.status !== 'Erledigt';

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <button
            onClick={onBack}
            className="btn btn-outline-secondary d-flex align-items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Zurück</span>
          </button>
          <button
            onClick={() => onEdit(todo)}
            className="btn btn-primary d-flex align-items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            <span>Bearbeiten</span>
          </button>
        </div>

        <div className="mb-4">
          <h1 className="display-6 fw-bold mb-3">{todo.title}</h1>
          <div className="d-inline-flex align-items-center gap-2">
            <span className={`badge d-flex align-items-center gap-1 text-white ${getStatusColor(todo.status)}`}>
              {getStatusIcon(todo.status)}
              <span>{todo.status}</span>
            </span>
          </div>
        </div>

        {todo.description && (
          <div className="mb-4">
            <h3 className="h5 fw-semibold mb-2">Beschreibung</h3>
            <p className="text-muted whitespace-pre-wrap">{todo.description}</p>
          </div>
        )}

        <div className="mb-4">
          <h3 className="h5 fw-semibold mb-2">Fälligkeitsdatum</h3>
          <div className="d-flex align-items-center gap-2">
            <Calendar className="w-5 h-5 text-muted" />
            <span className={isOverdue ? 'text-danger fw-semibold' : 'text-muted'}>
              {formatDate(todo.dueDate)}
              {isOverdue && ' (überfällig)'}
            </span>
          </div>
        </div>

        <div className="pt-3 border-top">
          <small className="text-muted">
            Aufgabe-ID: {todo.id}
          </small>
        </div>
      </div>
    </div>
  );
};
