export const CLIENTIFY_DEFAULT_FIELDS = {
  me: 'id,username,first_name,last_name,full_name,email,company_id,company_name,role_id,language,time_zone,currency',
  users: 'id,first_name,last_name,username,full_name,email,company_id,company_name',
  contacts:
    'id,first_name,last_name,full_name,email,phone,company_id,company_name,status,title,created,remarks,summary',
  contactDetail:
    'id,first_name,last_name,full_name,email,phone,company_id,company_name,status,title,created,remarks,summary,description,custom_fields,tags',
  deals:
    'id,name,amount,currency,status,status_desc,probability,pipeline_id,pipeline,pipeline_stage_id,pipeline_stage,pipeline_stage_desc,expected_closed_date,actual_closed_date,contact_id,company_id,deal_source,custom_fields',
  companies: 'id,name,email,phone,website,industry,company_size,country,city,state,status,created',
};

export const CLIENTIFY_TIMEOUT_DEFAULT = 15000;
