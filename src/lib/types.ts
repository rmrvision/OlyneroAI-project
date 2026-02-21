export type ProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
};

export type BuildSummary = {
  id: string;
  status: string;
  created_at: string;
  preview_url: string | null;
  artifact_path: string | null;
};
