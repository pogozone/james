import React, { useState, useEffect, useRef } from 'react';
import { Todo } from '../types';
import { todoService } from '../services/todoService';
import { Calendar, Save, X } from 'lucide-react';

interface TodoFormProps {
  todo?: Todo;
  onSave: (todo: Todo) => void;
  onCancel: () => void;
}

export const TodoForm: React.FC<TodoFormProps> = ({ todo, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Todo>>({
    title: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    status: 'Neu',
    priority: 'Hat Zeit'
  });
  
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (todo) {
      setFormData(todo);
    }
  }, [todo]);

  // Make focus function globally available
  useEffect(() => {
    console.log('TodoForm mounted, setting up focusDateInput function');
    (window as any).focusDateInput = () => {
      console.log('focusDateInput called, dateInputRef.current:', dateInputRef.current);
      if (dateInputRef.current) {
        console.log('Focusing date input');
        dateInputRef.current.focus();
        dateInputRef.current.click();
        dateInputRef.current.showPicker?.();
      } else {
        console.log('dateInputRef.current is null');
      }
    };
    
    return () => {
      console.log('TodoForm unmounting, cleaning up focusDateInput function');
      delete (window as any).focusDateInput;
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title?.trim()) {
      alert('Titel ist erforderlich');
      return;
    }

    const todoToSave: Todo = {
      id: todo?.id || Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title: formData.title.trim(),
      description: formData.description?.trim() || '',
      dueDate: formData.dueDate || new Date().toISOString().split('T')[0],
      status: formData.status as Todo['status'],
      priority: formData.priority || 'Hat Zeit'
    };

    onSave(todoToSave);
  };

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="card-title h2 mb-0">
            {todo ? 'Aufgabe bearbeiten' : 'Neue Aufgabe erstellen'}
          </h2>
          <button
            onClick={onCancel}
            className="btn btn-light btn-sm"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">
              Titel *
            </label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="form-control"
              placeholder="Titel der Aufgabe"
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">
              Beschreibung
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="form-control"
              placeholder="Beschreibung der Aufgabe (optional)"
              rows={4}
            />
          </div>

          <div className="mb-3">
            <label className="form-label">
              Fälligkeitsdatum
            </label>
            <div className="input-group">
              <input
                ref={dateInputRef}
                type="date"
                value={formData.dueDate || ''}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="form-control"
                min={new Date().toISOString().split('T')[0]}
              />
              <span className="input-group-text">
                <Calendar className="w-4 h-4" />
              </span>
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="status" className="form-label fw-semibold">
              Status
            </label>
            <select
              value={formData.status || 'Neu'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Todo['status'] })}
              className="form-select"
            >
              <option value="Neu">Neu</option>
              <option value="In Bearbeitung">In Bearbeitung</option>
              <option value="Erledigt">Erledigt</option>
              <option value="Wiedervorlage">Wiedervorlage</option>
              <option value="Unerledigt geschlossen">Unerledigt geschlossen</option>
            </select>
          </div>

          <div className="mb-3">
            <label htmlFor="priority" className="form-label fw-semibold">
              Priorität
            </label>
            <select
              value={formData.priority || 'Hat Zeit'}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as Todo['priority'] })}
              className="form-select"
            >
              <option value="Super wichtig">Super wichtig</option>
              <option value="Bald erledigen">Bald erledigen</option>
              <option value="Hat Zeit">Hat Zeit</option>
            </select>
          </div>

          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="btn btn-primary d-flex align-items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Speichern</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
