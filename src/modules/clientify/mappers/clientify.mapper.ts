import { ClientifyContact, ClientifyDeal } from '../interfaces/clientify.interface';

export class ClientifyMapper {
  static toContactSummary(contact: ClientifyContact) {
    return {
      id: contact.id,
      firstName: contact.first_name ?? '',
      lastName: contact.last_name ?? '',
      fullName: `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim(),
      company: contact.company_name ?? contact.company ?? null,
      companyId: contact.company_id ?? null,
      status: contact.status ?? null,
      title: contact.title ?? null,
      email: contact.emails?.[0]?.email ?? null,
      phone: contact.phones?.[0]?.phone ?? null,
      created: contact.created ?? null,
      pictureUrl: contact.picture_url ?? null,
      description: contact.description ?? null,
      remarks: contact.remarks ?? null,
      summary: contact.summary ?? null,
    };
  }

  static toDealSummary(deal: ClientifyDeal) {
    return {
      id: deal.id,
      name: deal.name ?? '',
      status: deal.status ?? null,
      amount: deal.amount ?? null,
      stage: deal.stage ?? null,
      expectedClosedDate: deal.expected_closed_date ?? null,
    };
  }
}