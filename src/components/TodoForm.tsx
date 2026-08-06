import React, { useState, useEffect, useRef } from 'react';
import { Epic, Todo } from '../types';
import { epicService } from '../services/epicService';
import { Calendar, Save, X } from 'lucide-react';
import { addDaysDateOnly, formatDateOnly, parseDateOnly } from '../utils/dateOnly';
import { PageHeader } from './PageHeader';

interface TodoFormProps {
  todo?: Todo;
  onSave: (todo: Todo) => void;
  onCancel: () => void;
}

export const TodoForm: React.FC<TodoFormProps> = ({ todo, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Todo>>({
    title: '',
    description: '',
    dueDate: (() => {
      const now = new Date();
      const today = formatDateOnly(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
      return addDaysDateOnly(today, 1);
    })(),
    status: 'Neu',
    priority: 'Hat Zeit',
    points: undefined,
    repeatWeekly: false,
    repeatMonthly: false,
    epicId: undefined
  });

  const [epics, setEpics] = useState<Epic[]>([]);
  
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (todo) {
      setFormData(todo);
    }
  }, [todo]);

  useEffect(() => {
    epicService.getEpics().then(setEpics).catch(err => {
      console.error('Failed to load epics:', err);
      setEpics([]);
    });
  }, []);

  const getAutoSprintBucket = (dueDateStr: string, status: Todo['status']): Todo['sprintBucket'] => {
    if (status === 'Erledigt' || status === 'Unerledigt geschlossen') return 'none';

    const due = parseDateOnly(dueDateStr);
    if (Number.isNaN(due.getTime())) return 'none';

    const startOfWeek = (d: Date) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      const day = x.getDay();
      const diffToMonday = (day + 6) % 7;
      x.setDate(x.getDate() - diffToMonday);
      return x;
    };

    const inRange = (d: Date, start: Date, endExclusive: Date) => d >= start && d < endExclusive;

    const now = new Date();
    const currentStart = startOfWeek(now);
    const nextStart = new Date(currentStart);
    nextStart.setDate(nextStart.getDate() + 7);
    const nextEnd = new Date(nextStart);
    nextEnd.setDate(nextEnd.getDate() + 7);

    if (inRange(due, currentStart, nextStart)) return 'current';
    if (inRange(due, nextStart, nextEnd)) return 'next';
    return 'none';
  };

  // Make focus function globally available
  useEffect(() => {
    (window as any).focusDateInput = () => {
      if (dateInputRef.current) {
        dateInputRef.current.focus();
        dateInputRef.current.click();
        dateInputRef.current.showPicker?.();
      }
    };
    
    return () => {
      delete (window as any).focusDateInput;
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title?.trim()) {
      alert('Titel ist erforderlich');
      return;
    }

    const status = formData.status as Todo['status'];
    const due = formData.dueDate || (() => {
      const now = new Date();
      return formatDateOnly(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
    })();

    const existingBucket = (todo?.sprintBucket || formData.sprintBucket || 'none') as Todo['sprintBucket'];
    const shouldPreserveBucket = existingBucket === 'current' || existingBucket === 'next';

    const finalSprintBucket: Todo['sprintBucket'] = shouldPreserveBucket
      ? existingBucket
      : getAutoSprintBucket(due, status);

    const finalScrumStatus: Todo['scrumStatus'] = (() => {
      if (finalSprintBucket === 'current') {
        return (formData.scrumStatus || 'Ready') as Todo['scrumStatus'];
      }
      return (formData.scrumStatus || 'Ready') as Todo['scrumStatus'];
    })();

    const todoToSave: Todo = {
      id: todo?.id || '',
      title: formData.title.trim(),
      description: formData.description?.trim() || '',
      dueDate: due,
      status,
      priority: formData.priority || 'Hat Zeit',
      points: formData.points,
      repeatWeekly: Boolean(formData.repeatWeekly),
      repeatMonthly: Boolean(formData.repeatMonthly),
      sprintBucket: finalSprintBucket,
      scrumStatus: finalScrumStatus,
      epicId: formData.epicId || undefined
    };

    onSave(todoToSave);
  };

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <PageHeader
          title={todo ? 'Aufgabe bearbeiten' : 'Neue Aufgabe erstellen'}
          actions={(
            <button
              onClick={onCancel}
              className="btn btn-light btn-sm"
              type="button"
              title="Schließen"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        />

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
              <option value="Unerledigt geschlossen">Unerledigt geschlossen</option>
            </select>
          </div>

          <div className="mb-3">
            <div className="form-check">
              <input
                id="repeatWeekly"
                type="checkbox"
                className="form-check-input"
                checked={Boolean(formData.repeatWeekly)}
                onChange={(e) => setFormData({ ...formData, repeatWeekly: e.target.checked })}
              />
              <label className="form-check-label" htmlFor="repeatWeekly">
                repeatWeekly
              </label>
            </div>
            <div className="form-check">
              <input
                id="repeatMonthly"
                type="checkbox"
                className="form-check-input"
                checked={Boolean(formData.repeatMonthly)}
                onChange={(e) => setFormData({ ...formData, repeatMonthly: e.target.checked })}
              />
              <label className="form-check-label" htmlFor="repeatMonthly">
                repeatMonthly
              </label>
            </div>
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

          <div className="mb-3">
            <label className="form-label fw-semibold">Punkte</label>
            <select
              value={formData.points?.toString() || ''}
              onChange={(e) => {
                const raw = e.target.value;
                if (!raw) {
                  setFormData({ ...formData, points: undefined });
                  return;
                }
                const parsed = Number(raw);
                const allowed = parsed === 1 || parsed === 2 || parsed === 3 || parsed === 5 || parsed === 8;
                setFormData({ ...formData, points: allowed ? (parsed as Todo['points']) : undefined });
              }}
              className="form-select"
            >
              <option value="">(keine)</option>
              <option value="1">1 (max. 1 Stunde)</option>
              <option value="2">2 (max. 1/2 Tag)</option>
              <option value="3">3 (max. 1 Tag)</option>
              <option value="5">5 (max. 2 Tage)</option>
              <option value="8">8 (max. 1 Sprint)</option>
            </select>
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Epic</label>
            <select
              value={formData.epicId || ''}
              onChange={(e) => setFormData({ ...formData, epicId: e.target.value || undefined })}
              className="form-select"
            >
              <option value="">(kein Epic)</option>
              {epics.map(epic => (
                <option key={epic.id} value={epic.id}>
                  {epic.title}
                </option>
              ))}
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
