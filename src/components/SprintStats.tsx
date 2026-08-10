import React, { useMemo } from 'react';
import { Sprint, Todo } from '../types';
import { CheckCircle, Star, XCircle } from 'lucide-react';
import { PageHeader } from './PageHeader';

interface SprintStatsProps {
  todos: Todo[];
  sprints: Sprint[];
}

interface SprintStat {
  sprint: Sprint;
  doneTasks: Todo[];
  notDoneTasks: Todo[];
  donePoints: number;
  notDonePoints: number;
}

export function SprintStats({ todos, sprints }: SprintStatsProps) {
  const closedSprints = useMemo(
    () => sprints
      .filter(s => s.status === 'closed')
      .sort((a, b) => b.number - a.number),
    [sprints]
  );

  const stats: SprintStat[] = useMemo(() => {
    return closedSprints.map(sprint => {
      const sprintTodos = todos.filter(t => t.sprintId === sprint.id);
      const doneTasks = sprintTodos.filter(t => t.status === 'Erledigt');
      const notDoneTasks = sprintTodos.filter(t => t.status !== 'Erledigt');
      return {
        sprint,
        doneTasks,
        notDoneTasks,
        donePoints: doneTasks.reduce((sum, t) => sum + (t.points || 0), 0),
        notDonePoints: notDoneTasks.reduce((sum, t) => sum + (t.points || 0), 0)
      };
    });
  }, [closedSprints, todos]);

  const totals = useMemo(() => {
    return stats.reduce(
      (acc, s) => {
        acc.doneTasks += s.doneTasks.length;
        acc.donePoints += s.donePoints;
        acc.notDoneTasks += s.notDoneTasks.length;
        acc.notDonePoints += s.notDonePoints;
        return acc;
      },
      { doneTasks: 0, donePoints: 0, notDoneTasks: 0, notDonePoints: 0 }
    );
  }, [stats]);

  const avgPoints = stats.length > 0 ? totals.donePoints / stats.length : 0;

  const chartStats = useMemo(
    () => [...stats].sort((a, b) => a.sprint.number - b.sprint.number).slice(-10),
    [stats]
  );
  const maxChartPoints = Math.max(1, ...chartStats.map(s => s.donePoints));

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const renderTaskList = (tasks: Todo[]) => (
    <div className="stats-task-list">
      {tasks.map(t => (
        <div key={t.id} className="stats-task-row">
          <span className="stats-task-title">{t.title}</span>
          <span className="badge text-bg-dark" title="Punkte">{t.points || 0}P</span>
        </div>
      ))}
    </div>
  );

  return (
    <div className="stats-page">
      <PageHeader title="Auswertung" />

      {closedSprints.length === 0 ? (
        <div className="text-center py-5">
          <h3 className="h5 fw-semibold text-muted mb-2">Keine vergangenen Sprints</h3>
        </div>
      ) : (
        <>
          <div className="stats-panel mb-3">
            <div className="stats-panel-body">
              <div className="stats-panel-title">Gesamt ({closedSprints.length} Sprints)</div>
              <div className="d-flex align-items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>{totals.doneTasks} Aufgaben · {totals.donePoints}P erledigt</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <XCircle className="w-4 h-4" />
                <span>{totals.notDoneTasks} Aufgaben · {totals.notDonePoints}P nicht erledigt</span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <Star className="w-4 h-4" />
                <span>Ø {avgPoints.toFixed(1)}P pro Sprint</span>
              </div>
            </div>
          </div>

          <div className="stats-panel mb-3">
            <div className="stats-panel-body stats-panel-body--chart">
              <div className="stats-panel-title mb-3">Punkte der letzten {chartStats.length} Sprints</div>
              <div className="stats-chart">
                {chartStats.map(s => (
                  <div key={s.sprint.id} className="stats-chart-bar-wrapper" title={`Sprint ${s.sprint.number}: ${s.donePoints}P`}>
                    <div className="stats-chart-value">{s.donePoints}</div>
                    <div
                      className="stats-chart-bar"
                      style={{ height: `${Math.max(4, (s.donePoints / maxChartPoints) * 100)}%` }}
                    />
                    <div className="stats-chart-label">S{s.sprint.number}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {stats.map(s => (
            <div key={s.sprint.id} className="card shadow-sm mb-3">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                  <div>
                    <h5 className="card-title mb-1">Sprint {s.sprint.number}</h5>
                    <div className="text-muted small">
                      {formatDate(s.sprint.startDate)} – {formatDate(s.sprint.endDate)}
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-3 flex-wrap">
                    <span className="badge text-bg-success d-flex align-items-center gap-1" title="Erledigt">
                      <CheckCircle className="w-4 h-4" />
                      <span>{s.doneTasks.length} Aufgaben · {s.donePoints}P</span>
                    </span>
                    <span className="badge text-bg-danger d-flex align-items-center gap-1" title="Nicht erledigt">
                      <XCircle className="w-4 h-4" />
                      <span>{s.notDoneTasks.length} Aufgaben · {s.notDonePoints}P</span>
                    </span>
                  </div>
                </div>

                {s.doneTasks.length > 0 && (
                  <div className="mt-3">
                    <div className="stats-task-heading">Erledigte Aufgaben</div>
                    {renderTaskList(s.doneTasks)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
