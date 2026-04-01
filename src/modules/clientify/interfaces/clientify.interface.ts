export interface ClientifyPaginatedResponse<T> {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T[];
}

export interface ClientifyContact {
  id: number;
  first_name?: string;
  last_name?: string;
  status?: string;
  title?: string;
  company?: string;
  company_id?: number;
  company_name?: string;
  emails?: Array<{ email: string; type: number }>;
  phones?: Array<{ phone: string; type: number }>;
  created?: string;
  picture_url?: string;
  description?: string;
  remarks?: string;
  summary?: string;
}

export interface ClientifyDeal {
  id: number;
  name?: string;
  status?: number | string;
  amount?: string;
  stage?: number;
  expected_closed_date?: string;
}