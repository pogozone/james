import React from 'react';
import { Todo } from '../types';
import { Calendar, Eye, Edit, Trash2, CheckCircle, Clock, AlertCircle, Star } from 'lucide-react';

interface TodoListProps {
  todos: Todo[];
  onView: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
  onStatusChange: (todo: Todo, newStatus: Todo['status']) => void;
}

export const TodoList: React.FC<TodoListProps> = ({ todos, onView, onEdit, onDelete, onStatusChange }) => {
  const getPriorityIcon = (priority: Todo['priority']) => {
    switch (priority) {
      case 'Super wichtig':
        return <Star className="w-4 h-4 text-danger" />;
      case 'Bald erledigen':
        return <Star className="w-4 h-4 text-warning" />;
      case 'Hat Zeit':
        return <Star className="w-4 h-4 text-secondary" />;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority: Todo['priority']) => {
    switch (priority) {
      case 'Super wichtig':
        return 'text-danger';
      case 'Bald erledigen':
        return 'text-warning';
      case 'Hat Zeit':
        return 'text-secondary';
      default:
        return 'text-secondary';
    }
  };
  const getStatusIcon = (status: Todo['status']) => {
    switch (status) {
      case 'Neu':
        return <AlertCircle className="w-4 h-4 text-secondary" />;
      case 'In Bearbeitung':
        return <Clock className="w-4 h-4 text-primary" />;
      case 'Erledigt':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'Wiedervorlage':
        return <AlertCircle className="w-4 h-4 text-warning" />;
      case 'Unerledigt geschlossen':
        return <AlertCircle className="w-4 h-4 text-danger" />;
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

  const isOverdue = (todo: Todo) => {
    return new Date(todo.dueDate) < new Date() && todo.status !== 'Erledigt' && todo.status !== 'Unerledigt geschlossen' && todo.status !== 'Wiedervorlage';
  };

  const sortedTodos = [...todos].sort((a, b) => {
    // Sort by status first (Neu, Wiedervorlage, In Bearbeitung, Erledigt, Unerledigt geschlossen)
    const statusOrder = { 
      'Neu': 0, 
      'Wiedervorlage': 1,  // After Neu
      'In Bearbeitung': 2, 
      'Erledigt': 3,
      'Unerledigt geschlossen': 4
    };
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;
    
    // Then by due date
    const dateDiff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    if (dateDiff !== 0) return dateDiff;
    
    // Finally by priority
    const priorityOrder = { 
      'Super wichtig': 0, 
      'Bald erledigen': 1, 
      'Hat Zeit': 2
    };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  if (todos.length === 0) {
    return (
      <div className="text-center py-5">
        <div className="text-muted mb-4">
          <CheckCircle className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="h5 fw-semibold text-muted mb-2">Keine Aufgaben vorhanden</h3>
        <p className="text-muted">Erstellen Sie Ihre erste Aufgabe, um zu beginnen.</p>
      </div>
    );
  }

  return (
    <>
      <div>
        <h2 className="h2 mb-4">Aufgaben</h2>
        
        {sortedTodos.map((todo) => (
          <div
            key={todo.id}
            className={`card shadow-sm mb-3 ${isOverdue(todo) ? 'border-start border-4 border-danger' : ''} ${todo.priority === 'Super wichtig' ? 'super-important' : ''}`}
          >
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <h5 className="card-title mb-0">{todo.title}</h5>
                    <span className={`badge d-flex align-items-center gap-1 text-white ${getStatusColor(todo.status)}`}>
                      {getStatusIcon(todo.status)}
                      <span>{todo.status}</span>
                    </span>
                    <span className={`d-flex align-items-center gap-1 ${getPriorityColor(todo.priority)}`}>
                      {getPriorityIcon(todo.priority)}
                      <span className="small">{todo.priority}</span>
                    </span>
                  </div>
                  
                  {todo.description && (
                    <p className="card-text text-muted mb-3" style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {todo.description}
                    </p>
                  )}
                  
                  <div className="d-flex align-items-center gap-3 text-muted small">
                    <div className="d-flex align-items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span className={isOverdue(todo) ? 'text-danger fw-semibold' : ''}>
                        {formatDate(todo.dueDate)}
                        {isOverdue(todo) && ' (überfällig)'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="d-flex gap-2 ms-3 align-items-center">
                  <select
                    value={todo.status}
                    onChange={(e) => onStatusChange(todo, e.target.value as Todo['status'])}
                    className="form-select form-select-sm"
                    style={{ minWidth: '140px' }}
                    title="Status ändern"
                  >
                    <option value="Neu">Neu</option>
                    <option value="In Bearbeitung">In Bearbeitung</option>
                    <option value="Erledigt">Erledigt</option>
                    <option value="Wiedervorlage">Wiedervorlage</option>
                    <option value="Unerledigt geschlossen">Unerledigt geschlossen</option>
                  </select>
                  <button
                    onClick={() => onView(todo)}
                    className="btn btn-outline-primary btn-sm"
                    title="Anzeigen"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEdit(todo)}
                    className="btn btn-outline-secondary btn-sm"
                    title="Bearbeiten"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(todo.id)}
                    className="btn btn-outline-danger btn-sm"
                    title="Löschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <style>{`
        .super-important {
          animation: blink 1s infinite;
        }
        
        @keyframes blink {
          0%, 50% {
            background-color: #fff5f5;
            border-left: 4px solid #dc3545;
          }
          51%, 100% {
            background-color: white;
            border-left: 4px solid #dc3545;
          }
        }
      `}</style>
    </>
  );
};
