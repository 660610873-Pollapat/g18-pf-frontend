export interface TodoItem {
  id: number;
  todoText: string;
  isDone: boolean;
  category: string;
  color: string | null;
  deadline: string | null;
  priority: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
}
