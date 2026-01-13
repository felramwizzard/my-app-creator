export interface Task {
  id: string;
  title: string;
  completed: boolean;
  starred: boolean;
  dueDate?: string;
  createdAt: string;
}
