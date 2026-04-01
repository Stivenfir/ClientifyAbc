import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  ClientifyContact,
  ClientifyDeal,
  ClientifyPaginatedResponse,
} from './interfaces/clientify.interface';
import { GetContactsDto } from './dto/get-contacts.dto';
import { ClientifyMapper } from './mappers/clientify.mapper';

@Injectable()
export class ClientifyService {
  private readonly baseUrl: string;
  private readonly token: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('CLIENTIFY_BASE_URL')!;
    this.token = this.configService.get<string>('CLIENTIFY_TOKEN')!;
  }

  private getHeaders() {
    return {
      Authorization: `Token ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  private async get<T>(url: string, params?: Record<string, any>): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<T>(url, {
          headers: this.getHeaders(),
          params,
        }),
      );

      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;

      if (status) {
        throw new BadGatewayException({
          message: 'Error al consumir Clientify',
          clientifyStatus: status,
          clientifyError: data,
        });
      }

      throw new InternalServerErrorException(
        'No fue posible conectarse con Clientify',
      );
    }
  }

  async getMe() {
  return this.get(`${this.baseUrl}/me/`, {
    fields:
      'url,id,username,first_name,last_name,is_staff,is_active,permissions_profile_id,country,phone,channel,inbox_user,sales_user,chat_internal_user,website,language,online_status,vacations,whatsapp_number,virtual_meeting_url,full_name,role_id,time_zone,email,company_id,company_name,currency,short_name,full_short_name,locale,date_format,hour_format,date_format_string,alt_date_format_string,datetime_format_string,time_format_template,thousand_separator,decimal_separator,currency_symbol_position,street,city,state,postal_code,name_format,is_partner_admin,is_tester,is_partner',
  });
}

  async getContacts(filters: GetContactsDto) {
    const fields =
      'id,first_name,last_name,status,title,company_id,company_name,emails,phones,created';

    const response = await this.get<ClientifyPaginatedResponse<ClientifyContact>>(
      `${this.baseUrl}/contacts/`,
      {
        fields,
        page: filters.page,
        page_size: filters.pageSize,
        order_by: filters.orderBy,
        query: filters.query,
      },
    );

    return {
      total: response.count ?? 0,
      next: response.next ?? null,
      previous: response.previous ?? null,
      results: (response.results ?? []).map((contact) =>
        ClientifyMapper.toContactSummary(contact),
      ),
    };
  }

  async getContactById(contactId: number) {
    const fields =
      'id,owner_id,first_name,last_name,status,title,company_id,company_name,picture_url,description,remarks,summary';

    const contact = await this.get<ClientifyContact>(
      `${this.baseUrl}/contacts/${contactId}/`,
      { fields },
    );

    return ClientifyMapper.toContactSummary(contact);
  }

  async getContactDeals(contactId: number) {
    const fields =
      'id,owner_id,name,amount,currency,contact_id,created,modified,expected_closed_date,actual_closed_date,status,pipeline_stage,pipeline_id';

    const response = await this.get<ClientifyPaginatedResponse<ClientifyDeal>>(
      `${this.baseUrl}/contacts/${contactId}/deals/`,
      { fields },
    );

    return {
      total: response.count ?? 0,
      results: (response.results ?? []).map((deal) =>
        ClientifyMapper.toDealSummary(deal),
      ),
    };
  }
}