export type WorkType = "Projects";

export interface WorkItem {
  id: number;
  type: WorkType;
  title: string;
  year: string;
  category: string;
  image: string;
  images?: string[];
  description: string;
  stack?: string[];
  demoUrl?: string | null;
}
