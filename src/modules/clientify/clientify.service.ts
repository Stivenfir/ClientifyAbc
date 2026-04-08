import {
  BadGatewayException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosRequestConfig, Method } from 'axios';
import { firstValueFrom } from 'rxjs';
import { CLIENTIFY_DEFAULT_FIELDS } from './constants/clientify.constants';
import { CreateCompanyDto, UpdateCompanyDto } from './dto/company.dto';
import { CreateContactDto, UpdateContactDto } from './dto/contact.dto';
import { CreateDealDto, UpdateDealDto } from './dto/deal.dto';
import { ListQueryDto } from './dto/list-query.dto';
import { OpportunityFilterDto } from './dto/opportunity-filter.dto';
import { CreatePipelineDto } from './dto/pipeline.dto';
import {
  ClientifyContact,
  ClientifyDeal,
  ClientifyPaginatedResponse,
} from './interfaces/clientify.interface';
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

  private normalizeListParams(query: ListQueryDto, defaultFields: string) {
    return {
      fields: query.fields ?? defaultFields,
      page: query.page,
      page_size: query.pageSize,
      order_by: query.orderBy,
      query: query.query,
      created: query.created,
      created_start: query.createdStart,
      created_end: query.createdEnd,
      is_filter: query.isFilter,
    };
  }

  private async request<T>(
    method: Method,
    endpoint: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({
          method,
          url: `${this.baseUrl}${endpoint}`,
          headers: this.getHeaders(),
          ...config,
        }),
      );

      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const data = axiosError.response?.data;

      if (status) {
        throw new BadGatewayException({
          message: 'Error del proveedor Clientify',
          provider: 'clientify',
          providerStatus: status,
          providerError: data,
        });
      }

      throw new InternalServerErrorException(
        'No fue posible conectarse con Clientify',
      );
    }
  }

  private normalizePaginated<T>(response: ClientifyPaginatedResponse<T>) {
    return {
      total: response.count ?? 0,
      next: response.next ?? null,
      previous: response.previous ?? null,
      results: response.results ?? [],
    };
  }

  private toSearchableText(value: unknown) {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  getHealth() {
    return {
      provider: 'clientify',
      status: 'ok',
      checkedAt: new Date().toISOString(),
    };
  }

  getMe() {
    return this.request('GET', '/me/', {
      params: { fields: CLIENTIFY_DEFAULT_FIELDS.me },
    });
  }

  getUsers(query: ListQueryDto) {
    return this.request('GET', '/users/', {
      params: this.normalizeListParams(query, CLIENTIFY_DEFAULT_FIELDS.users),
    });
  }

  async getContacts(query: ListQueryDto) {
    const response = await this.request<ClientifyPaginatedResponse<ClientifyContact>>(
      'GET',
      '/contacts/',
      {
        params: this.normalizeListParams(query, CLIENTIFY_DEFAULT_FIELDS.contacts),
      },
    );

    const normalized = this.normalizePaginated(response);
    return {
      ...normalized,
      results: normalized.results.map((c) => ClientifyMapper.toContactSummary(c)),
    };
  }

  getSearchContacts(query: string, listQuery: ListQueryDto) {
    return this.getContacts({ ...listQuery, query });
  }

  async getContactById(id: number, fields?: string) {
    const response = await this.request<ClientifyContact>(
      'GET',
      `/contacts/${id}/`,
      {
        params: { fields: fields ?? CLIENTIFY_DEFAULT_FIELDS.contactDetail },
      },
    );

    return ClientifyMapper.toContactSummary(response);
  }

  createContact(body: CreateContactDto) {
    const { force_insert, ...payload } = body;
    return this.request('POST', '/contacts/', {
      params: { force_insert },
      data: payload,
    });
  }

  updateContact(id: number, body: UpdateContactDto) {
    return this.request('PUT', `/contacts/${id}/`, { data: body });
  }

  async getContactDeals(id: number, fields?: string) {
    const response = await this.request<ClientifyPaginatedResponse<ClientifyDeal>>(
      'GET',
      `/contacts/${id}/deals/`,
      { params: { fields: fields ?? CLIENTIFY_DEFAULT_FIELDS.deals } },
    );

    const normalized = this.normalizePaginated(response);
    return {
      ...normalized,
      results: normalized.results.map((d) => ClientifyMapper.toDealSummary(d)),
    };
  }

  getContactTasks(id: number, query: ListQueryDto) {
    return this.request('GET', `/contacts/${id}/tasks/`, {
      params: this.normalizeListParams(query, 'id,name,status,due_date'),
    });
  }

  getContactCustomFields(id: number) {
    return this.request('GET', `/contacts/${id}/customfields/`);
  }

  async getContactsWithDeals(query: ListQueryDto) {
    const contacts = await this.getContacts(query);
    const results = await Promise.all(
      contacts.results.map(async (contact) => ({
        ...contact,
        deals: (await this.getContactDeals(contact.id)).results,
      })),
    );

    return { ...contacts, results };
  }

  getCompanies(query: ListQueryDto) {
    return this.request('GET', '/companies/', {
      params: this.normalizeListParams(query, CLIENTIFY_DEFAULT_FIELDS.companies),
    });
  }

  getCompanyById(id: number, fields?: string) {
    return this.request('GET', `/companies/${id}/`, {
      params: { fields: fields ?? CLIENTIFY_DEFAULT_FIELDS.companies },
    });
  }

  createCompany(body: CreateCompanyDto) {
    return this.request('POST', '/companies/', { data: body });
  }

  updateCompany(id: number, body: UpdateCompanyDto) {
    return this.request('PUT', `/companies/${id}/`, { data: body });
  }

  getCompanySectors() {
    return this.request('GET', '/companies/sectors/');
  }

  getCompanyTags() {
    return this.request('GET', '/companies/tags/');
  }

  async getDeals(query: ListQueryDto) {
    const response = await this.request<ClientifyPaginatedResponse<ClientifyDeal>>(
      'GET',
      '/deals/',
      {
        params: this.normalizeListParams(query, CLIENTIFY_DEFAULT_FIELDS.deals),
      },
    );

    const normalized = this.normalizePaginated(response);
    return {
      ...normalized,
      results: normalized.results.map((d) => ClientifyMapper.toDealSummary(d)),
    };
  }

  async getDealById(id: number, fields?: string) {
    const response = await this.request<ClientifyDeal>('GET', `/deals/${id}/`, {
      params: { fields: fields ?? CLIENTIFY_DEFAULT_FIELDS.deals },
    });

    return ClientifyMapper.toDealSummary(response);
  }

  createDeal(body: CreateDealDto) {
    return this.request('POST', '/deals/', { data: body });
  }

  updateDeal(id: number, body: UpdateDealDto) {
    return this.request('PUT', `/deals/${id}/`, { data: body });
  }

  getDealTasks(id: number, query: ListQueryDto) {
    return this.request('GET', `/deals/${id}/tasks/`, {
      params: this.normalizeListParams(query, 'id,name,status,due_date'),
    });
  }

  getDealContacts(id: number, query: ListQueryDto) {
    return this.request('GET', `/deals/${id}/contacts/`, {
      params: this.normalizeListParams(query, CLIENTIFY_DEFAULT_FIELDS.contacts),
    });
  }

  getDealPipelines(query: ListQueryDto) {
    return this.request('GET', '/deals/pipelines/', {
      params: this.normalizeListParams(query, 'id,name,is_default,stages'),
    });
  }

  getDealPipelineById(id: number) {
    return this.request('GET', `/deals/pipelines/${id}/`);
  }

  createDealPipeline(body: CreatePipelineDto) {
    return this.request('POST', '/deals/pipelines/', { data: body });
  }

  getDealTags() {
    return this.request('GET', '/deals/tags/');
  }

  getCustomFields(query: ListQueryDto) {
    return this.request('GET', '/customfields/', {
      params: this.normalizeListParams(query, 'id,name,field_type,module'),
    });
  }

  getPipelines(query: ListQueryDto) {
    return this.getDealPipelines(query);
  }

  getTags() {
    return Promise.all([
      this.request('GET', '/contacts/tags/'),
      this.request('GET', '/companies/tags/'),
      this.request('GET', '/deals/tags/'),
    ]).then(([contacts, companies, deals]) => ({ contacts, companies, deals }));
  }

  async getClientsWithOpenOpportunities(filter: OpportunityFilterDto) {
    const pipelineNeedle = this.toSearchableText(filter.pipeline);
    const stageNeedle = this.toSearchableText(filter.stage);

    const pipelinesResponse = await this.getDealPipelines({
      page: 1,
      pageSize: filter.pageSize,
    });

    const pipelineResults = Array.isArray((pipelinesResponse as { results?: unknown[] }).results)
      ? ((pipelinesResponse as { results?: Array<Record<string, unknown>> }).results ?? [])
      : (Array.isArray(pipelinesResponse)
          ? (pipelinesResponse as Array<Record<string, unknown>>)
          : []);

    const matchedPipeline = pipelineResults.find(
      (pipeline) => this.toSearchableText(pipeline.name).includes(pipelineNeedle),
    );

    if (!matchedPipeline) {
      return {
        criteria: {
          pipeline: filter.pipeline,
          stage: filter.stage,
          pipelineMatched: false,
          stageMatched: false,
        },
        totalDealsMatched: 0,
        totalClientsMatched: 0,
        clients: [],
      };
    }

    const stages = Array.isArray(matchedPipeline.stages)
      ? (matchedPipeline.stages as Array<Record<string, unknown>>)
      : [];

    const matchedStage = stages.find((stage) =>
      this.toSearchableText(stage.name).includes(stageNeedle),
    );

    if (!matchedStage) {
      return {
        criteria: {
          pipeline: filter.pipeline,
          stage: filter.stage,
          pipelineId: matchedPipeline.id ?? null,
          pipelineMatched: true,
          stageMatched: false,
        },
        totalDealsMatched: 0,
        totalClientsMatched: 0,
        clients: [],
      };
    }

    const allDeals: Array<ReturnType<typeof ClientifyMapper.toDealSummary>> = [];
    let page = 1;
    let hasNext = true;

    while (hasNext) {
      const dealsPage = await this.getDeals({
        page,
        pageSize: filter.pageSize,
        orderBy: '-modified',
      });

      allDeals.push(...dealsPage.results);
      hasNext = Boolean(dealsPage.next);
      page += 1;
    }

    const filteredDeals = allDeals.filter(
      (deal) =>
        deal.pipelineId === matchedPipeline.id &&
        deal.pipelineStageId === matchedStage.id &&
        Number(deal.status) === 1 &&
        Number.isFinite(deal.contactId),
    );

    const uniqueContactIds = Array.from(
      new Set(
        filteredDeals
          .map((deal) => deal.contactId)
          .filter((contactId): contactId is number => Number.isFinite(contactId)),
      ),
    );

    const contacts = await Promise.all(
      uniqueContactIds.map(async (contactId) => {
        try {
          return await this.getContactById(contactId);
        } catch {
          return null;
        }
      }),
    );

    const contactMap = new Map(
      contacts
        .filter((contact): contact is NonNullable<typeof contact> => Boolean(contact))
        .map((contact) => [contact.id, contact]),
    );

    return {
      criteria: {
        pipeline: filter.pipeline,
        stage: filter.stage,
        pipelineId: matchedPipeline.id,
        pipelineStageId: matchedStage.id,
      },
      totalDealsMatched: filteredDeals.length,
      totalClientsMatched: contactMap.size,
      clients: Array.from(contactMap.values()).map((client) => ({
        ...client,
        openOpportunities: filteredDeals.filter(
          (deal) => deal.contactId === client.id,
        ),
      })),
    };
  }
}
