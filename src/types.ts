export interface Todo {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  status: 'Neu' | 'In Bearbeitung' | 'Erledigt' | 'Unerledigt geschlossen';
  priority: 'Super wichtig' | 'Bald erledigen' | 'Hat Zeit';
  points?: 1 | 2 | 3 | 5 | 8;
  repeatWeekly?: boolean;
  repeatMonthly?: boolean;
  sprintBucket?: SprintBucket;
  scrumStatus?: ScrumStatus;
  epicId?: string;
}

export interface Epic {
  id: string;
  title: string;
  description?: string;
}

export type SprintBucket = 'current' | 'next' | 'none';

export type ScrumStatus = 'Ready' | 'In Progress' | 'Review' | 'Done';
