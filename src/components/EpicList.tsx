import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Epic, Todo } from '../types';
import { epicService } from '../services/epicService';
import { Plus, Save, Trash2, X } from 'lucide-react';

interface EpicListProps {
  todos: Todo[];
}

export function EpicList({ todos }: EpicListProps) {
  const [epics, setEpics] = useState<Epic[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [editingEpicId, setEditingEpicId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const autoSaveTimerRef = useRef<number | null>(null);
  const editDirtyRef = useRef(false);

  const epicUsage = useMemo(() => {
    const usage: Record<string, number> = {};
    for (const t of todos) {
      if (!t.epicId) continue;
      usage[t.epicId] = (usage[t.epicId] || 0) + 1;
    }
    return usage;
  }, [todos]);

  const todosByEpic = useMemo(() => {
    const map: Record<string, Todo[]> = {};
    for (const t of todos) {
      if (!t.epicId) continue;
      if (!map[t.epicId]) map[t.epicId] = [];
      map[t.epicId].push(t);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''));
    }
    return map;
  }, [todos]);

  const sortEpicsByTitle = (list: Epic[]): Epic[] => {
    return [...list].sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' }));
  };

  const load = async () => {
    setLoading(true);
    try {
      const loaded = await epicService.getEpics();
      setEpics(sortEpicsByTitle(loaded));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    const t = title.trim();
    if (!t) return;

    const created = await epicService.createEpic({ title: t, description: description.trim() || undefined });
    setEpics(prev => sortEpicsByTitle([created, ...prev]));
    setTitle('');
    setDescription('');
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Epic wirklich löschen? Zugeordnete Aufgaben werden entkoppelt.')) return;
    await epicService.deleteEpic(id);
    setEpics(prev => prev.filter(e => e.id !== id));
  };

  const startEdit = (epic: Epic) => {
    setEditingEpicId(epic.id);
    setEditTitle(epic.title);
    setEditDescription(epic.description || '');
    editDirtyRef.current = false;
  };

  const cancelEdit = () => {
    setEditingEpicId(null);
    setEditTitle('');
    setEditDescription('');
    editDirtyRef.current = false;
  };

  const saveEdit = async (id: string) => {
    const t = editTitle.trim();
    if (!t) return;
    const updated = await epicService.updateEpic(id, { title: t, description: editDescription.trim() || undefined });
    setEpics(prev => sortEpicsByTitle(prev.map(e => (e.id === id ? updated : e))));
    cancelEdit();
  };

  useEffect(() => {
    if (!editingEpicId) return;
    if (!editDirtyRef.current) return;

    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = window.setTimeout(async () => {
      const t = editTitle.trim();
      if (!t) return;
      try {
        const updated = await epicService.updateEpic(editingEpicId, {
          title: t,
          description: editDescription.trim() || undefined
        });
        setEpics(prev => sortEpicsByTitle(prev.map(e => (e.id === editingEpicId ? updated : e))));
        editDirtyRef.current = false;
      } catch (error) {
        console.error('Failed to auto-save epic:', error);
      }
    }, 500);

    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [editingEpicId, editTitle, editDescription]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Laden...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="h2 mb-4">Epics</h2>

      <div className="card mb-3">
        <div className="card-body d-flex flex-column">
          <div className="d-flex flex-column flex-md-row align-items-start gap-2">
            <div style={{ width: 400, maxWidth: '100%', flex: '0 0 auto' }}>
              <label className="form-label">Titel</label>
              <input
                className="form-control"
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>
            <div style={{ width: 800, maxWidth: '100%', flex: '0 0 auto' }}>
              <label className="form-label">Beschreibung (optional)</label>
              <textarea
                className="form-control"
                style={{ height: 150, width: '100%' }}
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-2 d-flex justify-content-end" style={{ paddingBottom: 4 }}>
            <button className="btn btn-primary d-flex align-items-center justify-content-center gap-2" onClick={handleCreate}>
              <Plus className="w-5 h-5" />
              <span>Neu</span>
            </button>
          </div>
        </div>
      </div>

      {epics.length === 0 ? (
        <div className="text-center py-5 text-muted">
          Keine Epics vorhanden.
        </div>
      ) : (
        epics.map(epic => (
          <div key={epic.id} className="card shadow-sm mb-3">
            <div className="card-body d-flex flex-column">
              <div className="d-flex justify-content-between align-items-start gap-3">
                <div style={{ minWidth: 0 }}>
                  {editingEpicId === epic.id ? (
                    <div className="d-flex flex-column flex-md-row align-items-start gap-2">
                      <div style={{ width: 400, maxWidth: '100%', flex: '0 0 auto' }}>
                        <label className="form-label small text-muted">Titel</label>
                        <input
                          className="form-control"
                          value={editTitle}
                          onChange={e => {
                            editDirtyRef.current = true;
                            setEditTitle(e.target.value);
                          }}
                        />
                      </div>
                      <div style={{ width: 800, maxWidth: '100%', flex: '0 0 auto' }}>
                        <label className="form-label small text-muted">Beschreibung</label>
                        <textarea
                          className="form-control"
                          style={{ height: 150, width: '100%' }}
                          value={editDescription}
                          onChange={e => {
                            editDirtyRef.current = true;
                            setEditDescription(e.target.value);
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="fw-semibold">{epic.title}</div>
                      {epic.description ? <div className="text-muted small">{epic.description}</div> : null}
                    </>
                  )}
                  <div className="text-muted small mt-1">
                    Zugeordnete Aufgaben: {epicUsage[epic.id] || 0}
                  </div>

                  {(todosByEpic[epic.id]?.length || 0) > 0 ? (
                    <div className="mt-2">
                      <div className="small text-muted mb-1">Aufgaben</div>
                      <div className="d-flex flex-column gap-1">
                        {todosByEpic[epic.id].map(t => (
                          <div key={t.id} className="small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {t.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-2 d-flex justify-content-end gap-2" style={{ paddingBottom: 4 }}>
                {editingEpicId === epic.id ? (
                  <>
                    <button className="btn btn-sm btn-primary" onClick={() => saveEdit(epic.id)} title="Speichern">
                      <Save className="w-4 h-4" />
                    </button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={cancelEdit} title="Abbrechen">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => startEdit(epic)} title="Bearbeiten">
                    Bearbeiten
                  </button>
                )}

                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(epic.id)} title="Löschen">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
