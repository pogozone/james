import React, { useMemo, useState } from 'react';
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
import { ScrumStatus, Todo } from '../types';

const STATUSES: { key: ScrumStatus; title: string }[] = [
  { key: 'Ready', title: 'Ready' },
  { key: 'In Progress', title: 'In Progress' },
  { key: 'Review', title: 'Review' },
  { key: 'Done', title: 'Done' }
];

function isDueToday(todo: Todo) {
  if (todo.status === 'Erledigt' || todo.status === 'Unerledigt geschlossen') return false;
  const due = new Date(todo.dueDate);
  const now = new Date();
  return (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  );
}

function isOverdue(todo: Todo) {
  return new Date(todo.dueDate) < new Date() && todo.status !== 'Erledigt' && todo.status !== 'Unerledigt geschlossen';
}

function groupByScrumStatus(todos: Todo[]): Record<ScrumStatus, Todo[]> {
  const grouped: Record<ScrumStatus, Todo[]> = {
    Ready: [],
    'In Progress': [],
    Review: [],
    Done: []
  };

  for (const todo of todos) {
    const status: ScrumStatus = todo.scrumStatus || 'Ready';
    grouped[status].push(todo);
  }

  return grouped;
}

interface ScrumBoardProps {
  todos: Todo[];
  onScrumStatusChange: (todo: Todo, scrumStatus: ScrumStatus) => void;
}

export function ScrumBoard({ todos, onScrumStatusChange }: ScrumBoardProps) {
  const [loading] = useState(false);

  const currentSprintTodos = useMemo(
    () => todos.filter(t => (t.sprintBucket || 'none') === 'current'),
    [todos]
  );

  const grouped = useMemo(() => groupByScrumStatus(currentSprintTodos), [currentSprintTodos]);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const sourceStatus = source.droppableId as ScrumStatus;
    const destStatus = destination.droppableId as ScrumStatus;

    const sourceItems = Array.from(grouped[sourceStatus]);
    const destItems = sourceStatus === destStatus ? sourceItems : Array.from(grouped[destStatus]);

    const movingIndex = sourceItems.findIndex(i => i.id === draggableId);
    if (movingIndex === -1) return;

    const [moving] = sourceItems.splice(source.index, 1);
    destItems.splice(destination.index, 0, moving);

    onScrumStatusChange(moving, destStatus);
  };

  if (loading) return null;

  return (
    <div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="row g-3">
          {STATUSES.map(col => (
            <div key={col.key} className="col-12 col-lg">
              <div className="card h-100">
                <div className="card-header bg-white">
                  <div className="d-flex justify-content-between align-items-center">
                    <strong>{col.title}</strong>
                    <span className="badge text-bg-secondary">{grouped[col.key].length}</span>
                  </div>
                </div>

                <Droppable droppableId={col.key}>
                  {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`card-body p-2 ${snapshot.isDraggingOver ? 'bg-light' : ''}`}
                      style={{ minHeight: 200 }}
                    >
                      {grouped[col.key].map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(dragProvided: DraggableProvided, dragSnapshot: DraggableStateSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className={`card mb-2 ${col.key === 'Done' ? '' : (item.priority === 'Super wichtig' ? 'super-important' : '')} ${dragSnapshot.isDragging ? 'shadow' : ''}`}
                              style={{
                                ...(dragProvided.draggableProps.style || {}),
                                backgroundColor: col.key === 'Done'
                                  ? undefined
                                  : isDueToday(item)
                                    ? 'rgba(144, 238, 144, 0.35)'
                                    : isOverdue(item)
                                      ? 'rgba(220, 53, 69, 0.10)'
                                      : undefined
                              }}
                            >
                              <div className="card-body py-2 px-3">
                                <div className="d-flex justify-content-between align-items-start gap-2">
                                  <div style={{ minWidth: 0 }}>
                                    <div
                                      className="fw-semibold text-truncate"
                                      title={item.title}
                                    >
                                      {item.title}
                                    </div>
                                    {typeof item.points === 'number' ? (
                                      <div className="mt-1">
                                        <span className="badge text-bg-dark" title="Punkte">{item.points}P</span>
                                      </div>
                                    ) : null}
                                    {(item.description || item.dueDate || item.priority || item.status) && (
                                      <div className="small text-muted" style={{ whiteSpace: 'pre-wrap' }}>
                                        <div>
                                          {item.dueDate} · {item.priority} · {item.status}
                                        </div>
                                        {item.description ? <div>{item.description}</div> : null}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
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
    </div>
  );
}
