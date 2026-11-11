export const CLIENTIFY_DEFAULT_FIELDS = {
  me: 'id,username,first_name,last_name,full_name,email,company_id,company_name,role_id,language,time_zone,currency',
  users:
    'id,first_name,last_name,username,full_name,email,company_id,company_name',
  contacts:
    'id,owner_id,owner,owner_name,first_name,last_name,full_name,email,phone,company_id,company_name,status,title,contact_source,created,modified,last_contact,remarks,summary',
  contactDetail:
    'id,owner_id,owner,owner_name,first_name,last_name,full_name,email,phone,company_id,company_name,status,title,contact_source,created,modified,last_contact,remarks,summary,description,custom_fields,tags',
  deals:
    'id,owner_id,owner,owner_name,name,amount,amount_user,currency,contact_id,contact,contact_name,contact_email,contact_phone,contact_medium,contact_source,company_id,company,company_name,source,deal_source_id,deal_source,status,status_desc,probability,probability_desc,pipeline_id,pipeline,pipeline_desc,pipeline_stage_id,pipeline_stage,pipeline_stage_desc,created,modified,expected_closed_date,actual_closed_date,expected_closed_date_iso,actual_closed_date_iso,remarks,lost_reason,won_deal_reason,relevant_closed_date,amount_currency,custom_fields',
  companies:
    'id,owner_id,owner,owner_name,name,email,phone,website,industry,company_size,country,city,state,status,created,modified,last_contact',
  companyDetailWithCustomFields:
    'id,owner_id,owner,owner_name,name,email,phone,website,industry,company_size,country,city,state,status,created,modified,last_contact,taxpayer_identification_number,custom_fields',
};

export const CLIENTIFY_TIMEOUT_DEFAULT = 15000;
export const CLIENTIFY_V1_BASE_URL_DEFAULT = 'https://api.clientify.net/v1';
