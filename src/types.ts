export interface Todo {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  status: 'Neu' | 'In Bearbeitung' | 'Erledigt' | 'Wiedervorlage' | 'Unerledigt geschlossen';
  priority: 'Super wichtig' | 'Bald erledigen' | 'Hat Zeit';
}
