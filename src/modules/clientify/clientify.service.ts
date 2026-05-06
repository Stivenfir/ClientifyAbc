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
  ClientifyCompany,
  ClientifyContact,
  ClientifyCustomField,
  ClientifyDeal,
  ClientifyPaginatedResponse,
} from './interfaces/clientify.interface';
import { ClientifyMapper } from './mappers/clientify.mapper';

@Injectable()
export class ClientifyService {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly pipelineResolveCache = new Map<
    string,
    { pipelineId: number; pipelineStageId: number; expiresAt: number }
  >();
  private readonly contactCache = new Map<
    number,
    {
      data: Awaited<ReturnType<ClientifyService['getContactById']>>;
      expiresAt: number;
    }
  >();
  private readonly companyCache = new Map<
    number,
    {
      data: ClientifyCompany;
      expiresAt: number;
    }
  >();

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

  private getCacheKey(pipeline: string, stage: string) {
    return `${this.toSearchableText(pipeline)}::${this.toSearchableText(stage)}`;
  }

  private async getContactByIdCached(contactId: number) {
    const now = Date.now();
    const cached = this.contactCache.get(contactId);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    const data = await this.getContactById(contactId);
    this.contactCache.set(contactId, {
      data,
      expiresAt: now + 5 * 60 * 1000,
    });

    return data;
  }

  private async getCompanyByIdCached(companyId: number) {
    const now = Date.now();
    const cached = this.companyCache.get(companyId);
    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    const data = await this.getCompanyById(
      companyId,
      CLIENTIFY_DEFAULT_FIELDS.companyDetailWithCustomFields,
    );
    this.companyCache.set(companyId, {
      data,
      expiresAt: now + 5 * 60 * 1000,
    });

    return data;
  }

  private extractCustomFieldValue(
    customFields: ClientifyCustomField[] | undefined,
    fieldNames: string[],
  ) {
    const matchedField = (customFields ?? []).find((customField) =>
      fieldNames.some(
        (fieldName) =>
          this.toSearchableText(customField.field) ===
          this.toSearchableText(fieldName),
      ),
    );

    if (!matchedField) {
      return null;
    }

    const { value } = matchedField;
    return ['string', 'number', 'boolean'].includes(typeof value)
      ? String(value).trim()
      : null;
  }

  private extractNitFromCompany(company: ClientifyCompany | null | undefined) {
    if (!company) {
      return null;
    }

    const directValue = [
      company.taxpayer_identification_number,
      company.nit,
      company.tax_id,
      company.identification,
      company.document_number,
      company.document,
    ].find((value) => ['string', 'number', 'boolean'].includes(typeof value));

    if (directValue !== undefined) {
      return String(directValue).trim();
    }

    return this.extractCustomFieldValue(company.custom_fields, [
      'NIT',
      'Número de Documento',
      'Numero de Documento',
    ]);
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
    const response = await this.request<
      ClientifyPaginatedResponse<ClientifyContact>
    >('GET', '/contacts/', {
      params: this.normalizeListParams(
        query,
        CLIENTIFY_DEFAULT_FIELDS.contacts,
      ),
    });

    const normalized = this.normalizePaginated(response);
    return {
      ...normalized,
      results: normalized.results.map((c) =>
        ClientifyMapper.toContactSummary(c),
      ),
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
    const response = await this.request<
      ClientifyPaginatedResponse<ClientifyDeal>
    >('GET', `/contacts/${id}/deals/`, {
      params: { fields: fields ?? CLIENTIFY_DEFAULT_FIELDS.deals },
    });

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
      params: this.normalizeListParams(
        query,
        CLIENTIFY_DEFAULT_FIELDS.companies,
      ),
    });
  }

  getCompanyById(id: number, fields?: string) {
    return this.request<ClientifyCompany>('GET', `/companies/${id}/`, {
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
    const response = await this.request<
      ClientifyPaginatedResponse<ClientifyDeal>
    >('GET', '/deals/', {
      params: this.normalizeListParams(query, CLIENTIFY_DEFAULT_FIELDS.deals),
    });

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
      params: this.normalizeListParams(
        query,
        CLIENTIFY_DEFAULT_FIELDS.contacts,
      ),
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
    const operationTypeNeedle = filter.operationType
      ? this.toSearchableText(filter.operationType)
      : null;
    const providerPageSize = Math.min(filter.pageSize, 100);
    const resolveCacheKey = this.getCacheKey(filter.pipeline, filter.stage);
    const now = Date.now();
    let resolvedIds = this.pipelineResolveCache.get(resolveCacheKey);

    if (!resolvedIds || resolvedIds.expiresAt <= now) {
      const pipelinesResponse = await this.getDealPipelines({
        page: 1,
        pageSize: providerPageSize,
      });

      const pipelineResults = Array.isArray(
        (pipelinesResponse as { results?: unknown[] }).results,
      )
        ? ((pipelinesResponse as { results?: Array<Record<string, unknown>> })
            .results ?? [])
        : Array.isArray(pipelinesResponse)
          ? (pipelinesResponse as Array<Record<string, unknown>>)
          : [];

      const matchedPipeline = pipelineResults.find((pipeline) =>
        this.toSearchableText(pipeline.name).includes(pipelineNeedle),
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

      resolvedIds = {
        pipelineId: Number(matchedPipeline.id),
        pipelineStageId: Number(matchedStage.id),
        expiresAt: now + 10 * 60 * 1000,
      };
      this.pipelineResolveCache.set(resolveCacheKey, resolvedIds);
    }

    const filteredDeals: Array<
      ReturnType<typeof ClientifyMapper.toDealSummary>
    > = [];
    let page = 1;
    let hasNext = true;

    while (hasNext) {
      const providerPage = await this.request<
        ClientifyPaginatedResponse<ClientifyDeal>
      >('GET', '/deals/', {
        params: {
          fields: CLIENTIFY_DEFAULT_FIELDS.deals,
          page,
          page_size: providerPageSize,
          order_by: '-modified',
          pipeline_id: resolvedIds.pipelineId,
          pipeline_stage_id: resolvedIds.pipelineStageId,
          status: 1,
        },
      });

      const mappedDeals = (providerPage.results ?? []).map((deal) =>
        ClientifyMapper.toDealSummary(deal),
      );
      filteredDeals.push(
        ...mappedDeals.filter(
          (deal) =>
            deal.pipelineId === resolvedIds.pipelineId &&
            deal.pipelineStageId === resolvedIds.pipelineStageId &&
            Number(deal.status) === 1 &&
            Number.isFinite(deal.contactId) &&
            (!operationTypeNeedle ||
              this.toSearchableText(deal.operationType).includes(
                operationTypeNeedle,
              )),
        ),
      );

      hasNext = Boolean(providerPage.next);
      page += 1;
    }

    const uniqueContactIds = Array.from(
      new Set(
        filteredDeals
          .map((deal) => deal.contactId)
          .filter((contactId): contactId is number =>
            Number.isFinite(contactId),
          ),
      ),
    );

    const contacts: Array<Awaited<
      ReturnType<ClientifyService['getContactById']>
    > | null> = [];
    const batchSize = 10;
    for (let i = 0; i < uniqueContactIds.length; i += batchSize) {
      const chunk = uniqueContactIds.slice(i, i + batchSize);
      const chunkResults = await Promise.all(
        chunk.map(async (contactId) => {
          try {
            return await this.getContactByIdCached(contactId);
          } catch {
            return null;
          }
        }),
      );
      contacts.push(...chunkResults);
    }

    const contactMap = new Map(
      contacts
        .filter((contact): contact is NonNullable<typeof contact> =>
          Boolean(contact),
        )
        .map((contact) => [contact.id, contact]),
    );

    const uniqueCompanyIds = Array.from(
      new Set(
        [
          ...Array.from(contactMap.values()).map(
            (contact) => contact.companyId,
          ),
          ...filteredDeals.map((deal) => deal.companyId),
        ].filter((companyId): companyId is number =>
          Number.isFinite(companyId),
        ),
      ),
    );

    const companies: Array<ClientifyCompany | null> = [];
    for (let i = 0; i < uniqueCompanyIds.length; i += batchSize) {
      const chunk = uniqueCompanyIds.slice(i, i + batchSize);
      const chunkResults = await Promise.all(
        chunk.map(async (companyId) => {
          try {
            return await this.getCompanyByIdCached(companyId);
          } catch {
            return null;
          }
        }),
      );
      companies.push(...chunkResults);
    }

    const companyMap = new Map(
      companies
        .filter((company): company is ClientifyCompany => Boolean(company))
        .map((company) => [company.id, company]),
    );

    return {
      criteria: {
        pipeline: filter.pipeline,
        stage: filter.stage,
        pipelineId: resolvedIds.pipelineId,
        pipelineStageId: resolvedIds.pipelineStageId,
        operationType: filter.operationType ?? null,
      },
      totalDealsMatched: filteredDeals.length,
      totalClientsMatched: contactMap.size,
      clients: Array.from(contactMap.values()).map((client) => {
        const clientCompanyId =
          typeof client.companyId === 'number' ? client.companyId : null;
        const rawOpenOpportunities = filteredDeals.filter(
          (deal) => deal.contactId === client.id,
        );
        const relatedCompanyIds = Array.from(
          new Set(
            [
              clientCompanyId,
              ...rawOpenOpportunities.map((deal) =>
                typeof deal.companyId === 'number' ? deal.companyId : null,
              ),
            ].filter((companyId): companyId is number => companyId !== null),
          ),
        );
        const fallbackCompanyId =
          clientCompanyId ??
          (relatedCompanyIds.length === 1 ? relatedCompanyIds[0] : null);
        const fallbackCompany =
          fallbackCompanyId !== null ? companyMap.get(fallbackCompanyId) : null;
        const openOpportunities = rawOpenOpportunities.map((deal) => {
          const dealCompanyId =
            typeof deal.companyId === 'number' ? deal.companyId : null;
          const dealCompany =
            dealCompanyId !== null ? companyMap.get(dealCompanyId) : null;

          return {
            ...deal,
            companyName: dealCompany?.name ?? null,
            nit: this.extractNitFromCompany(dealCompany),
          };
        });
        const operationTypes = Array.from(
          new Set(
            openOpportunities
              .map((deal) => deal.operationType)
              .filter((operationType): operationType is string =>
                Boolean(operationType),
              ),
          ),
        );

        return {
          ...client,
          companyId: client.companyId ?? fallbackCompany?.id ?? null,
          companyName: client.companyName ?? fallbackCompany?.name ?? null,
          nit: this.extractNitFromCompany(fallbackCompany),
          operationType: operationTypes.length === 1 ? operationTypes[0] : null,
          operationTypes,
          openOpportunities,
        };
      }),
    };
  }
}
