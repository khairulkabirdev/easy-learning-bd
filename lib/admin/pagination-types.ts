export type AdminPagedResource =
  | "classes"
  | "subjects"
  | "units"
  | "lessons"
  | "topics"
  | "content"
  | "unseen-composition"
  | "subject-section"
  | "english-second-paper"
  | "board"
  | "year";

export type AdminSortDirection = "asc" | "desc";

export type AdminPagedRequest = {
  resource: AdminPagedResource;
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
  direction?: AdminSortDirection;
  filters?: Record<string, string | undefined>;
};

export type AdminPagedResult<T = Record<string, unknown>> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
