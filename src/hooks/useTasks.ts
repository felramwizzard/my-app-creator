import { useState, useCallback, useEffect } from "react";
import { Task } from "@/types/task";

const STORAGE_KEY = "productivity-app-tasks";

const initialTasks: Task[] = [
  {
    id: "1",
    title: "Review project requirements",
    completed: false,
    starred: true,
    dueDate: new Date().toISOString().split("T")[0],
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Set up development environment",
    completed: true,
    starred: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "3",
    title: "Design app wireframes",
    completed: false,
    starred: false,
    dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    createdAt: new Date().toISOString(),
  },
  {
    id: "4",
    title: "Create component library",
    completed: false,
    starred: true,
    createdAt: new Date().toISOString(),
  },
];

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : initialTasks;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const addTask = useCallback((title: string, dueDate?: string, starred?: boolean) => {
    const newTask: Task = {
      id: Date.now().toString(),
      title,
      completed: false,
      starred: starred || false,
      dueDate,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  }, []);

  const toggleStar = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, starred: !task.starred } : task
      )
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  }, []);

  const completedCount = tasks.filter((t) => t.completed).length;
  const starredCount = tasks.filter((t) => t.starred && !t.completed).length;

  return {
    tasks,
    addTask,
    toggleTask,
    toggleStar,
    deleteTask,
    completedCount,
    starredCount,
    totalCount: tasks.length,
  };
}
