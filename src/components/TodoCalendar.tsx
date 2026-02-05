import React from 'react';
import { Todo } from '../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TodoCalendarProps {
  todos: Todo[];
  onView: (todo: Todo) => void;
  onEdit: (todo: Todo) => void;
  onStatusChange: (todo: Todo, newStatus: Todo['status']) => void;
}

export const TodoCalendar: React.FC<TodoCalendarProps> = ({ todos, onView, onEdit, onStatusChange }) => {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (date: Date) => {
    // Get the day of the week (0 = Sunday, 1 = Monday, etc.)
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    // Convert to Monday-first week (0 = Monday, 1 = Tuesday, ..., 6 = Sunday)
    return day === 0 ? 6 : day - 1;
  };
  
  const getTodosForDate = (date: Date) => {
    // Use local date format to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    const filteredTodos = todos.filter(todo => 
      todo.dueDate === dateString && 
      (todo.status === 'Neu' || todo.status === 'In Bearbeitung' || todo.status === 'Wiedervorlage')
    );
    // Debug: Log the first few todos for verification
    if (date.getDate() <= 8 && filteredTodos.length > 0) {
      console.log(`Date: ${dateString} (${date.toLocaleDateString('de-DE', { weekday: 'long' })}), Todos:`, filteredTodos.map(t => t.title));
    }
    return filteredTodos;
  };
  
  const getPriorityColor = (priority: Todo['priority']) => {
    switch (priority) {
      case 'Super wichtig':
        return 'bg-danger';
      case 'Bald erledigen':
        return 'bg-warning';
      case 'Hat Zeit':
        return 'bg-secondary';
      default:
        return 'bg-secondary';
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
  
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };
  
  const monthNames = [
    'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
  ];
  
  const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  
  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="calendar-day empty">
          <div className="calendar-day-header">
            <span className="calendar-day-number"></span>
          </div>
          <div className="calendar-todos"></div>
        </div>
      );
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayTodos = getTodosForDate(date);
      const isToday = date.toDateString() === new Date().toDateString();
      const isOverdue = date < new Date() && date.toDateString() !== new Date().toDateString();
      
      days.push(
        <div
          key={day}
          className={`calendar-day ${isToday ? 'today' : ''} ${isOverdue ? 'overdue' : ''}`}
        >
          <div className="calendar-day-header">
            <span className="calendar-day-number">{day}</span>
            {dayTodos.length > 0 && (
              <span className="calendar-todo-count">{dayTodos.length}</span>
            )}
          </div>
          <div className="calendar-todos">
            {dayTodos.slice(0, 3).map(todo => (
              <div
                key={todo.id}
                className={`calendar-todo-item ${todo.priority === 'Super wichtig' ? getPriorityColor(todo.priority) : getStatusColor(todo.status)} ${todo.priority === 'Super wichtig' ? 'super-important-calendar' : ''}`}
                onClick={() => onView(todo)}
                title={todo.title}
              >
                <span className="calendar-todo-title">{todo.title}</span>
              </div>
            ))}
            {dayTodos.length > 3 && (
              <div className="calendar-more-todos">
                +{dayTodos.length - 3} mehr
              </div>
            )}
          </div>
        </div>
      );
    }
    
    return days;
  };
  
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="h2 mb-0">Kalender</h2>
        <div className="d-flex align-items-center gap-3">
          <button
            onClick={() => navigateMonth('prev')}
            className="btn btn-outline-secondary btn-sm"
            title="Vorheriger Monat"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="h5 mb-0">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h3>
          <button
            onClick={() => navigateMonth('next')}
            className="btn btn-outline-secondary btn-sm"
            title="Nächster Monat"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div className="calendar-container">
        <div className="calendar-weekdays">
          {weekDays.map(day => (
            <div key={day} className="calendar-weekday">
              {day}
            </div>
          ))}
        </div>
        <div className="calendar-days-grid">
          {renderCalendarDays()}
        </div>
      </div>
      
      <style>{`
        .calendar-container {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          overflow: hidden;
        }
        
        .calendar-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 1px;
          background: #e9ecef;
        }
        
        .calendar-weekday {
          background: #f8f9fa;
          padding: 8px 4px;
          text-align: center;
          font-weight: 600;
          font-size: 0.875rem;
          color: #495057;
          min-width: 0;
          overflow: hidden;
        }
        
        .calendar-days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 1px;
          background: #e9ecef;
        }
        
        .calendar-day {
          background: white;
          min-height: 100px;
          padding: 8px 4px;
          position: relative;
          min-width: 0;
        }
        
        .calendar-day.empty {
          background: #f8f9fa;
        }
        
        .calendar-day.today {
          background: #e3f2fd;
        }
        
        .calendar-day.overdue {
          background: #fff5f5;
        }
        
        .calendar-day-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }
        
        .calendar-day-number {
          font-weight: 600;
          font-size: 0.875rem;
        }
        
        .calendar-todo-count {
          background: #007bff;
          color: white;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
        }
        
        .calendar-todos {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .calendar-todo-item {
          padding: 2px 4px;
          border-radius: 3px;
          font-size: 0.75rem;
          cursor: pointer;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: white;
          transition: opacity 0.2s;
        }
        
        .calendar-todo-item:hover {
          opacity: 0.8;
        }
        
        .calendar-more-todos {
          font-size: 0.75rem;
          color: #6c757d;
          font-style: italic;
        }
        
        .super-important-calendar {
          animation: blink-calendar 1s infinite;
        }
        
        @keyframes blink-calendar {
          0%, 50% {
            opacity: 1;
            transform: scale(1);
          }
          51%, 100% {
            opacity: 0.7;
            transform: scale(1.05);
          }
        }
        
        @media (max-width: 768px) {
          .calendar-day {
            min-height: 80px;
            padding: 4px;
          }
          
          .calendar-todo-item {
            font-size: 0.7rem;
          }
        }
      `}</style>
    </div>
  );
};
