import React, { useEffect, useState } from 'react';
import {
  DragDropContext,
  Draggable,
  DraggableProvided,
  DraggableStateSnapshot,
  Droppable,
  DroppableProvided,
  DroppableStateSnapshot,
  DropResult
} from '@hello-pangea/dnd';
import { Sprint, SprintBucket, Todo } from '../types';
import { Calendar, Eye, Edit, Trash2, CheckCircle, Clock, AlertCircle, Star, CalendarDays } from 'lucide-react';
import { isBeforeTodayDateOnly, isDueTodayDateOnly, parseDateOnly } from '../utils/dateOnly';

export interface TodoListProps {
  todos: Todo[];
  currentSprint: Sprint | null;
  nextSprint: Sprint | null;
  onView: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: string) => void;
  onStatusChange: (todo: Todo, newStatus: Todo['status']) => void;
  onSprintBucketChange: (todo: Todo, sprintBucket: SprintBucket) => void;
}

const BUCKETS: SprintBucket[] = ['current', 'next', 'none'];

export function TodoList({
  todos = [],
  currentSprint,
  nextSprint,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  onSprintBucketChange
}: TodoListProps) {
  const exportToGoogleCalendar = (todo: Todo) => {
    try {
      // Only export if it has a due date and valid status
      if (!todo.dueDate || !['Neu', 'In Bearbeitung'].includes(todo.status)) {
        alert('Diese Aufgabe kann nicht in den Google Kalender exportiert werden.');
        return;
      }

      const startDate = parseDateOnly(todo.dueDate);
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1); // 1 hour duration
      
      // Format dates for iCalendar
      const formatDate = (date: Date) => {
        return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      }

      // Get priority for iCalendar
      const getPriorityForIcal = (priority: Todo['priority']): number => {
        switch (priority) {
          case 'Super wichtig': return 1;
          case 'Bald erledigen': return 5;
          case 'Hat Zeit': return 9;
          default: return 5;
        }
      };

      // Get status for iCalendar
      const getStatusForIcal = (status: Todo['status']): string => {
        switch (status) {
          case 'Neu': return 'TENTATIVE';
          case 'In Bearbeitung': return 'CONFIRMED';
          default: return 'CANCELLED';
        }
      };

      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//James Todo App//Todo Export//DE',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${todo.id}@james-todo-app.de`,
        `DTSTART:${formatDate(startDate)}`,
        `DTEND:${formatDate(endDate)}`,
        `SUMMARY:${todo.title}`,
        `DESCRIPTION:${todo.description || ''}`,
        `PRIORITY:${getPriorityForIcal(todo.priority)}`,
        `STATUS:${getStatusForIcal(todo.status)}`,
        'END:VEVENT',
        'END:VCALENDAR'
      ];

      const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${todo.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download iCalendar:', error);
      alert('Fehler beim Exportieren in den Google Kalender.');
    }
  };
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

  const isDueToday = (todo: Todo) => {
    if (todo.status === 'Erledigt' || todo.status === 'Unerledigt geschlossen') return false;
    return isDueTodayDateOnly(todo.dueDate);
  };

  const isOverdue = (todo: Todo) => {
    return isBeforeTodayDateOnly(todo.dueDate) && todo.status !== 'Erledigt' && todo.status !== 'Unerledigt geschlossen';
  };

  const pointsToHours = (points?: Todo['points']): number => {
    switch (points) {
      case 1:
        return 1;
      case 2:
        return 4;
      case 3:
        return 8;
      case 5:
        return 16;
      case 8:
        return 40;
      default:
        return 0;
    }
  };

  const defaultSortTodos = (list: Todo[]): Todo[] => {
    return [...list].sort((a, b) => {
      const statusOrder = { 'Neu': 0, 'In Bearbeitung': 1, 'Erledigt': 2, 'Unerledigt geschlossen': 3 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) return statusDiff;

      const dateDiff = parseDateOnly(a.dueDate).getTime() - parseDateOnly(b.dueDate).getTime();
      if (dateDiff !== 0) return dateDiff;

      const priorityOrder = { 'Super wichtig': 0, 'Bald erledigen': 1, 'Hat Zeit': 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  };

  const mergeOrderedTodos = (prev: Todo[], next: Todo[]): Todo[] => {
    const nextById = new Map(next.map(t => [t.id, t]));
    const reordered = prev.map(t => nextById.get(t.id)).filter((t): t is Todo => Boolean(t));
    const newOnes = next.filter(t => !prev.some(p => p.id === t.id));
    return [...reordered, ...newOnes];
  };

  const [orderedTodos, setOrderedTodos] = useState<Todo[]>([]);

  useEffect(() => {
    const nextBacklog = todos.filter(t => t.status !== 'Erledigt' && t.status !== 'Unerledigt geschlossen');
    setOrderedTodos(prev => {
      if (prev.length === 0) return defaultSortTodos(nextBacklog);
      return mergeOrderedTodos(prev, nextBacklog);
    });
  }, [todos]);

  const getSprintIdForBucket = (sprintBucket: SprintBucket): string | null => {
    if (sprintBucket === 'current') return currentSprint?.id || null;
    if (sprintBucket === 'next') return nextSprint?.id || null;
    return null;
  };

  const getBucket = (todo: Todo): SprintBucket => {
    if (currentSprint && todo.sprintId === currentSprint.id) return 'current';
    if (nextSprint && todo.sprintId === nextSprint.id) return 'next';
    return 'none';
  };

  const getBucketTitle = (key: SprintBucket): string => {
    if (key === 'current') {
      return currentSprint
        ? `Aktueller Sprint (${formatDate(currentSprint.startDate)} – ${formatDate(currentSprint.endDate)})`
        : 'Aktueller Sprint';
    }
    if (key === 'next') {
      return nextSprint
        ? `Nächster Sprint (${formatDate(nextSprint.startDate)} – ${formatDate(nextSprint.endDate)})`
        : 'Nächster Sprint';
    }
    return 'Nicht zugeordnet';
  };

  const groupedByBucket: Record<SprintBucket, Todo[]> = {
    current: [],
    next: [],
    none: []
  };

  for (const todo of orderedTodos) {
    const bucket = getBucket(todo);
    groupedByBucket[bucket].push(todo);
  }

  const totalHoursByBucket: Record<SprintBucket, number> = {
    current: 0,
    next: 0,
    none: 0
  };

  for (const bucketKey of Object.keys(groupedByBucket) as SprintBucket[]) {
    totalHoursByBucket[bucketKey] = groupedByBucket[bucketKey].reduce((sum, t) => sum + pointsToHours(t.points), 0);
  }

  const globalIndexForBucketIndex = (list: Todo[], bucket: SprintBucket, index: number): number => {
    let count = 0;
    for (let i = 0; i < list.length; i++) {
      if (getBucket(list[i]) === bucket) {
        if (count === index) return i;
        count++;
      }
    }
    return list.length;
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const sourceBucket = source.droppableId as SprintBucket;
    const destBucket = destination.droppableId as SprintBucket;
    const sourceGlobal = globalIndexForBucketIndex(orderedTodos, sourceBucket, source.index);
    if (sourceGlobal < 0 || sourceGlobal >= orderedTodos.length) return;

    const moving = orderedTodos[sourceGlobal];
    const without = orderedTodos.filter((_, i) => i !== sourceGlobal);

    let itemToMove = moving;
    if (destBucket !== sourceBucket) {
      itemToMove = {
        ...moving,
        sprintId: getSprintIdForBucket(destBucket),
        scrumStatus: destBucket === 'current' ? 'Ready' : moving.scrumStatus
      };
    }

    const destGlobal = globalIndexForBucketIndex(without, destBucket, destination.index);
    const reordered = [...without];
    reordered.splice(destGlobal, 0, itemToMove);
    setOrderedTodos(reordered);

    if (destBucket !== sourceBucket) {
      onSprintBucketChange(itemToMove, destBucket);
    }
  };

  if (orderedTodos.length === 0) {
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

  const renderTodoCard = (todo: Todo, provided?: DraggableProvided, snapshot?: DraggableStateSnapshot) => (
    <div
      ref={provided?.innerRef}
      {...provided?.draggableProps}
      {...provided?.dragHandleProps}
      className={`card shadow-sm mb-2 ${isOverdue(todo) ? 'border-start border-4 border-danger' : ''} ${todo.priority === 'Super wichtig' ? 'super-important' : ''} ${snapshot?.isDragging ? 'shadow' : ''}`}
      style={{
        ...(provided?.draggableProps.style || {}),
        backgroundColor: isDueToday(todo)
          ? 'rgba(144, 238, 144, 0.35)'
          : isOverdue(todo)
            ? 'rgba(220, 53, 69, 0.10)'
            : undefined
      }}
    >
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start">
          <div className="flex-grow-1">
            <div className="d-flex align-items-center gap-2 mb-2">
              <h5 className="card-title mb-0">{todo.title}</h5>
              {typeof todo.points === 'number' ? (
                <span className="badge text-bg-dark" title="Punkte">{todo.points}P</span>
              ) : null}
              {todo.repeatWeekly ? (
                <span className="badge text-bg-warning" title="repeatWeekly">W</span>
              ) : null}
              {todo.repeatMonthly ? (
                <span className="badge text-bg-warning" title="repeatMonthly">M</span>
              ) : null}
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
              <p
                className="card-text text-muted mb-3"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}
              >
                {todo.description}
              </p>
            )}

            <div className="d-flex align-items-center gap-3 text-muted small">
              <div className="d-flex align-items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span className={isOverdue(todo) || isDueToday(todo) ? 'text-danger fw-semibold' : ''}>
                  {formatDate(todo.dueDate)}
                  {isDueToday(todo) ? ' (heute)' : isOverdue(todo) ? ' (überfällig)' : ''}
                </span>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2 mt-2">
              {getBucket(todo) !== 'current' ? (
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => onSprintBucketChange(todo, 'current')}
                  disabled={!currentSprint}
                >
                  Move to Current Sprint
                </button>
              ) : null}
              {getBucket(todo) !== 'next' ? (
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => onSprintBucketChange(todo, 'next')}
                  disabled={!nextSprint}
                >
                  Move to Next Sprint
                </button>
              ) : null}
              {getBucket(todo) !== 'none' ? (
                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => onSprintBucketChange(todo, 'none')}
                >
                  Move to Backlog
                </button>
              ) : null}
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
              <option value="Unerledigt geschlossen">Unerledigt geschlossen</option>
            </select>
            <button onClick={() => onView(todo)} className="btn btn-outline-primary btn-sm" title="Anzeigen">
              <Eye className="w-4 h-4" />
            </button>
            <button onClick={() => onEdit(todo)} className="btn btn-outline-secondary btn-sm" title="Bearbeiten">
              <Edit className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(todo.id)} className="btn btn-outline-danger btn-sm" title="Löschen">
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => exportToGoogleCalendar(todo)}
              className="btn btn-outline-info btn-sm"
              title="In Google Kalender exportieren"
            >
              <CalendarDays className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div>
        <h2 className="h2 mb-4">Backlog</h2>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="d-flex flex-column gap-3">
            {BUCKETS.map(bucket => (
              <div key={bucket}>
                <div className="card">
                  <div className="card-header bg-white">
                    <div className="d-flex justify-content-between align-items-center">
                      <strong>{getBucketTitle(bucket)}</strong>
                      <div className="d-flex align-items-center gap-2">
                        {bucket === 'current' || bucket === 'next' ? (
                          <span
                            className={`badge ${totalHoursByBucket[bucket] > 40 ? 'text-bg-danger' : 'text-bg-light text-dark border'}`}
                            title="Kumulierte Stunden (aus Punkten)"
                          >
                            {totalHoursByBucket[bucket]}h
                          </span>
                        ) : null}
                        <span className="badge text-bg-secondary">{groupedByBucket[bucket].length}</span>
                      </div>
                    </div>
                  </div>

                  <Droppable droppableId={bucket}>
                    {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`card-body p-2 ${snapshot.isDraggingOver ? 'bg-light' : ''}`}
                        style={{ minHeight: 200 }}
                      >
                        {groupedByBucket[bucket].map((todo, index) => (
                          <Draggable key={todo.id} draggableId={todo.id} index={index}>
                            {(dragProvided: DraggableProvided, dragSnapshot: DraggableStateSnapshot) =>
                              renderTodoCard(todo, dragProvided, dragSnapshot)
                            }
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            ))}
          </div>
        </DragDropContext>
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
