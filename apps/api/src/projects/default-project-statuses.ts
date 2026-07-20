export type DefaultProjectStatus = {
  name: string;
  color: string;
  position: string;
  isDone: boolean;
};

export const defaultProjectStatuses: readonly DefaultProjectStatus[] = [
  { name: "Backlog", color: "#8B8D98", position: "1000", isDone: false },
  { name: "Todo", color: "#5B5BD6", position: "2000", isDone: false },
  { name: "In progress", color: "#3E63DD", position: "3000", isDone: false },
  { name: "In review", color: "#8E4EC6", position: "4000", isDone: false },
  { name: "Test", color: "#D6409F", position: "5000", isDone: false },
  { name: "Done", color: "#30A46C", position: "6000", isDone: true },
];
