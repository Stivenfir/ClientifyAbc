import {
  ClientifyContact,
  ClientifyCustomField,
  ClientifyDeal,
} from '../interfaces/clientify.interface';

export class ClientifyMapper {
  private static toSearchableText(value: unknown) {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private static extractCustomFieldValue(
    customFields: ClientifyCustomField[] | undefined,
    fieldName: string,
  ) {
    const matchedField = (customFields ?? []).find(
      (customField) =>
        this.toSearchableText(customField.field) ===
        this.toSearchableText(fieldName),
    );

    if (!matchedField) {
      return null;
    }

    const { value } = matchedField;
    return ['string', 'number', 'boolean'].includes(typeof value)
      ? String(value).trim()
      : null;
  }

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
    const customFields = deal.custom_fields ?? [];
    const operationType = this.extractCustomFieldValue(
      customFields,
      'Tipo de operación',
    );

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
      operationType,
      customFields,
    };
  }
}
