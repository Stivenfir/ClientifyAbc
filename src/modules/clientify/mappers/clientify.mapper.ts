import { ClientifyContact, ClientifyDeal } from '../interfaces/clientify.interface';

export class ClientifyMapper {
  static toContactSummary(contact: ClientifyContact) {
    return {
      id: contact.id,
      firstName: contact.first_name ?? '',
      lastName: contact.last_name ?? '',
      fullName:
        contact.full_name ??
        `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim(),
      email: contact.email ?? contact.emails?.[0]?.email ?? null,
      phone: contact.phone ?? contact.phones?.[0]?.phone ?? null,
      companyId: contact.company_id ?? null,
      companyName: contact.company_name ?? null,
      status: contact.status ?? null,
      title: contact.title ?? null,
      created: contact.created ?? null,
      remarks: contact.remarks ?? null,
      summary: contact.summary ?? null,
    };
  }

  static toDealSummary(deal: ClientifyDeal) {
    return {
      id: deal.id,
      name: deal.name ?? '',
      amount: deal.amount ?? null,
      currency: deal.currency ?? null,
      status: deal.status ?? null,
      statusDesc: deal.status_desc ?? null,
      probability: deal.probability ?? null,
      pipelineId: deal.pipeline_id ?? null,
      pipeline: deal.pipeline ?? null,
      pipelineStageId: deal.pipeline_stage_id ?? null,
      pipelineStage: deal.pipeline_stage ?? null,
      pipelineStageDesc: deal.pipeline_stage_desc ?? null,
      expectedClosedDate: deal.expected_closed_date ?? null,
      actualClosedDate: deal.actual_closed_date ?? null,
      contactId: deal.contact_id ?? null,
      companyId: deal.company_id ?? null,
      dealSource: deal.deal_source ?? null,
      customFields: deal.custom_fields ?? [],
    };
  }
}
