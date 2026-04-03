export const KANBAN_STAGES = [
  { id: "research", title: "Research" },
  { id: "editing", title: "Editing" },
  { id: "qa_review", title: "QA Review" },
  { id: "pcloud_verify", title: "pCloud Verify" },
  { id: "done", title: "Done" },
] as const;

export type Stage = (typeof KANBAN_STAGES)[number]["id"];

export interface Task {
  id: string;
  episodeTitle: string;
  showName: string;
  showId: string;
  assignee: { id: string; name: string; avatar?: string };
  deadline: string;
  priority: "high" | "medium" | "low";
  stage: Stage;
  description?: string;
  notes?: TaskNote[];
  attachments?: TaskAttachment[];
  revisions?: TaskRevision[];
}

export interface TaskNote {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  uploadedAt: string;
}

export interface TaskRevision {
  id: string;
  field: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  changedAt: string;
}
