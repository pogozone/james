import React, { useEffect, useState } from 'react';
import { Idea } from '../types';
import { ideaService } from '../services/ideaService';
import { Save, Trash2, X, ArrowRightCircle } from 'lucide-react';
import { PageHeader } from './PageHeader';

interface IdeaListProps {
  onConvertToTask: (idea: Idea) => void;
}

export function IdeaList({ onConvertToTask }: IdeaListProps) {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');

  const [editingIdeaId, setEditingIdeaId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const loaded = await ideaService.getIdeas();
      setIdeas(loaded);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    const t = newTitle.trim();
    if (!t) return;

    const created = await ideaService.createIdea({ title: t });
    setIdeas(prev => [created, ...prev]);
    setNewTitle('');
  };

  const handleNewTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreate();
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Idee wirklich löschen?')) return;
    await ideaService.deleteIdea(id);
    setIdeas(prev => prev.filter(i => i.id !== id));
  };

  const startEdit = (idea: Idea) => {
    setEditingIdeaId(idea.id);
    setEditTitle(idea.title);
  };

  const cancelEdit = () => {
    setEditingIdeaId(null);
    setEditTitle('');
  };

  const saveEdit = async (id: string) => {
    const t = editTitle.trim();
    if (!t) return;
    const updated = await ideaService.updateIdea(id, { title: t });
    setIdeas(prev => prev.map(i => (i.id === id ? updated : i)));
    cancelEdit();
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit(id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  };

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
    <div className="ideas-page">
      <PageHeader title="Ideen" />

      <div className="card mb-3">
        <div className="card-body">
          <input
            className="form-control"
            placeholder="Neue Idee eintippen und Enter drücken..."
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={handleNewTitleKeyDown}
          />
        </div>
      </div>

      {ideas.length === 0 ? (
        <div className="text-center py-5 text-muted">
          Keine Ideen vorhanden.
        </div>
      ) : (
        <div className="ideas-list">
          {ideas.map(idea => (
            <div key={idea.id} className="ideas-row">
              {editingIdeaId === idea.id ? (
                <input
                  className="form-control"
                  value={editTitle}
                  autoFocus
                  onChange={e => setEditTitle(e.target.value)}
                  onKeyDown={e => handleEditKeyDown(e, idea.id)}
                />
              ) : (
                <div className="ideas-row__title">{idea.title}</div>
              )}

              <div className="ideas-row__actions">
                {editingIdeaId === idea.id ? (
                  <>
                    <button className="btn btn-sm btn-primary" onClick={() => saveEdit(idea.id)} title="Speichern">
                      <Save className="w-4 h-4" />
                    </button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={cancelEdit} title="Abbrechen">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => onConvertToTask(idea)}
                      title="In Aufgabe umwandeln"
                    >
                      <ArrowRightCircle className="w-4 h-4" />
                    </button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => startEdit(idea)} title="Bearbeiten">
                      Bearbeiten
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(idea.id)} title="Löschen">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
