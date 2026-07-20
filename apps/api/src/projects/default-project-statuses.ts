export type DefaultProjectStatus = {
  name: string;
  color: string;
  position: string;
  isDone: boolean;
};

export const defaultProjectStatuses: readonly DefaultProjectStatus[] = [
  { name: "Backlog", color: "#D4D4D8", position: "1000", isDone: false },
  { name: "Todo", color: "#6366F1", position: "2000", isDone: false },
  { name: "In progress", color: "#0EA5E9", position: "3000", isDone: false },
  { name: "In review", color: "#8B5CF6", position: "4000", isDone: false },
  { name: "Test", color: "#F59E0B", position: "5000", isDone: false },
  { name: "Done", color: "#22A06B", position: "6000", isDone: true },
  { name: "Won’t do", color: "#B76E79", position: "7000", isDone: true },
  { name: "Canceled", color: "#E5484D", position: "8000", isDone: true },
];
