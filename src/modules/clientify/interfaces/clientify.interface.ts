export interface ClientifyPaginatedResponse<T> {
  count?: number;
  next?: string | null;
  previous?: string | null;
  page?: number;
  page_size?: number;
  results?: T[];
}

export interface ClientifyBaseEntity {
  id: number;
  [key: string]: unknown;
}

export interface ClientifyContact extends ClientifyBaseEntity {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  emails?: Array<{ email: string; type?: number }>;
  phones?: Array<{ phone: string; type?: number }>;
  company_id?: number;
  company_name?: string;
  status?: string;
  title?: string;
  created?: string;
  remarks?: string;
  summary?: string;
}

export interface ClientifyDeal extends ClientifyBaseEntity {
  name?: string;
  amount?: string;
  currency?: string;
  status?: string | number;
  status_desc?: string;
  probability?: number;
  pipeline_id?: number;
  pipeline?: string;
  pipeline_stage_id?: number;
  pipeline_stage?: string;
  pipeline_stage_desc?: string;
  expected_closed_date?: string;
  actual_closed_date?: string;
  contact_id?: number;
  company_id?: number;
  deal_source?: string;
  custom_fields?: unknown[];
}
