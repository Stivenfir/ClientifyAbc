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
      owner: contact.owner ?? null,
      ownerId: contact.owner_id ?? null,
      ownerName: contact.owner_name ?? null,
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
      contactSource: contact.contact_source ?? null,
      created: contact.created ?? null,
      modified: contact.modified ?? null,
      lastContact: contact.last_contact ?? null,
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
      owner: deal.owner ?? null,
      ownerId: deal.owner_id ?? null,
      ownerName: deal.owner_name ?? null,
      name: deal.name ?? '',
      amount: deal.amount ?? null,
      amountUser: deal.amount_user ?? null,
      currency: deal.currency ?? null,
      status: deal.status ?? null,
      statusDesc: deal.status_desc ?? null,
      probability: deal.probability ?? null,
      probabilityDesc: deal.probability_desc ?? null,
      pipelineId: deal.pipeline_id ?? null,
      pipeline: deal.pipeline ?? null,
      pipelineDesc: deal.pipeline_desc ?? null,
      pipelineStageId: deal.pipeline_stage_id ?? null,
      pipelineStage: deal.pipeline_stage ?? null,
      pipelineStageDesc: deal.pipeline_stage_desc ?? null,
      created: deal.created ?? null,
      modified: deal.modified ?? null,
      expectedClosedDate: deal.expected_closed_date ?? null,
      actualClosedDate: deal.actual_closed_date ?? null,
      expectedClosedDateIso: deal.expected_closed_date_iso ?? null,
      actualClosedDateIso: deal.actual_closed_date_iso ?? null,
      contactId: deal.contact_id ?? null,
      contact: deal.contact ?? null,
      contactName: deal.contact_name ?? null,
      contactEmail: deal.contact_email ?? null,
      contactPhone: deal.contact_phone ?? null,
      contactMedium: deal.contact_medium ?? null,
      contactSource: deal.contact_source ?? null,
      companyId: deal.company_id ?? null,
      company: deal.company ?? null,
      companyName: deal.company_name ?? null,
      source: deal.source ?? null,
      dealSourceId: deal.deal_source_id ?? null,
      dealSource: deal.deal_source ?? null,
      remarks: deal.remarks ?? null,
      lostReason: deal.lost_reason ?? null,
      wonDealReason: deal.won_deal_reason ?? null,
      relevantClosedDate: deal.relevant_closed_date ?? null,
      amountCurrency: deal.amount_currency ?? null,
      operationType,
      customFields,
    };
  }
}
