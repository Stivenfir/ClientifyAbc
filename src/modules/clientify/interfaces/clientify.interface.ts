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
  owner?: string;
  owner_id?: number;
  owner_name?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  emails?: Array<{ email: string; type?: number }>;
  phones?: Array<{ phone: string; type?: number }>;
  addresses?: Array<{
    city?: string;
    country?: string | { name?: string; value?: string };
    state?: string;
    street?: string;
  }>;
  country?: string;
  company_id?: number;
  company_name?: string;
  status?: string;
  title?: string;
  contact_source?: string;
  created?: string;
  modified?: string;
  last_contact?: string;
  remarks?: string;
  summary?: string;
  custom_fields?: ClientifyCustomField[];
}

export interface ClientifyCustomField {
  id?: number;
  field_id?: number;
  field?: string;
  value?: unknown;
  field_type?: number;
  field_type_display?: string;
}

export interface ClientifyCompany extends ClientifyBaseEntity {
  owner?: string;
  owner_id?: number;
  owner_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  company_size?: string | number;
  country?: string;
  city?: string;
  state?: string;
  status?: string;
  created?: string;
  modified?: string;
  last_contact?: string;
  custom_fields?: ClientifyCustomField[];
  taxpayer_identification_number?: string | number;
  nit?: string | number;
  tax_id?: string | number;
  identification?: string | number;
  document?: string | number;
  document_number?: string | number;
}

export interface ClientifyDeal extends ClientifyBaseEntity {
  owner?: string;
  owner_id?: number;
  owner_name?: string;
  name?: string;
  amount?: string;
  amount_user?: string;
  currency?: string;
  status?: string | number;
  status_desc?: string;
  probability?: number;
  probability_desc?: string;
  pipeline_id?: number;
  pipeline?: string;
  pipeline_desc?: string;
  pipeline_stage_id?: number;
  pipeline_stage?: string;
  pipeline_stage_desc?: string;
  created?: string;
  modified?: string;
  expected_closed_date?: string;
  actual_closed_date?: string;
  expected_closed_date_iso?: string;
  actual_closed_date_iso?: string;
  contact_id?: number;
  contact?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_medium?: string;
  contact_source?: string;
  company_id?: number;
  company?: string;
  company_name?: string;
  source?: string | number;
  deal_source_id?: number;
  deal_source?: string;
  remarks?: string;
  lost_reason?: string;
  won_deal_reason?: string;
  relevant_closed_date?: string;
  amount_currency?: string;
  custom_fields?: ClientifyCustomField[];
}

export interface ClientifyV1Call extends ClientifyBaseEntity {
  url?: string;
  owner?: string;
  content_object?: string;
  type?: string;
  comment?: string;
  outcome?: string;
  audio_url?: string;
  duration?: number;
  created?: string;
  call_date?: string;
  call_time?: string;
}

export interface ClientifyV1User extends ClientifyBaseEntity {
  url?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  company_id?: number;
  company_name?: string;
}

export interface ClientifyV1Task extends ClientifyBaseEntity {
  url?: string;
  name?: string;
  due_date?: string;
  assigned_to?: string;
  remarks?: string;
  description?: string;
  location?: string;
  additional_options?: string;
  owner?: string;
  status?: string | number;
  status_desc?: string;
  task_type?: string;
  related_contacts?: unknown[];
  related_companies?: unknown[];
  deals?: unknown[];
  guest_users?: unknown[];
  created?: string;
  modified?: string;
}

export interface ClientifyV1TaskType extends ClientifyBaseEntity {
  url?: string;
  name?: string;
}

export interface ClientifyV1TaskStage extends ClientifyBaseEntity {
  url?: string;
  name?: string;
  task_type?: string;
}

export interface ClientifyV1DealPipeline extends ClientifyBaseEntity {
  url?: string;
  name?: string;
  is_default?: boolean;
  user_default?: boolean;
  stages?: Array<Record<string, unknown>>;
}

export interface ClientifyV1PipelineStage extends ClientifyBaseEntity {
  url?: string;
  name?: string;
  position?: number;
  probability?: number;
  pipeline?: string;
}
