import {
  BadRequestException,
  BadGatewayException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosError, AxiosRequestConfig, Method } from 'axios';
import { firstValueFrom } from 'rxjs';
import {
  CLIENTIFY_DEFAULT_FIELDS,
  CLIENTIFY_V1_BASE_URL_DEFAULT,
} from './constants/clientify.constants';
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
  ClientifyV1Call,
  ClientifyV1DealPipeline,
  ClientifyV1PipelineStage,
  ClientifyV1Task,
  ClientifyV1TaskStage,
  ClientifyV1TaskType,
  ClientifyV1User,
} from './interfaces/clientify.interface';
import { ClientifyMapper } from './mappers/clientify.mapper';

@Injectable()
export class ClientifyService {
  private readonly logger = new Logger(ClientifyService.name);
  private readonly baseUrl: string;
  private readonly v1BaseUrl: string;
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
    this.v1BaseUrl =
      this.configService.get<string>('CLIENTIFY_V1_BASE_URL') ??
      CLIENTIFY_V1_BASE_URL_DEFAULT;
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

  private buildV1ListParams(query: ListQueryDto) {
    return Object.fromEntries(
      Object.entries({
        page: query.page,
        page_size: query.pageSize,
        order_by: query.orderBy,
        query: query.query,
        created: query.created,
        created_start: query.createdStart,
        created_end: query.createdEnd,
      }).filter(([, value]) => value !== undefined && value !== null && value !== ''),
    );
  }

  private async request<T>(
    method: Method,
    endpoint: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.requestToBase(this.baseUrl, method, endpoint, config);
  }

  private async requestV1<T>(
    method: Method,
    endpoint: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.requestToBase(this.v1BaseUrl, method, endpoint, config);
  }

  private async requestToBase<T>(
    baseUrl: string,
    method: Method,
    endpoint: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const maxRetries = 5;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const response = await firstValueFrom(
          this.httpService.request<T>({
            method,
            url: `${baseUrl}${endpoint}`,
            headers: this.getHeaders(),
            ...config,
          }),
        );

        return response.data;
      } catch (error) {
        const axiosError = error as AxiosError;
        const status = axiosError.response?.status;
        const data = axiosError.response?.data;
        const code = axiosError.code ?? null;

        if (this.shouldRetryRequest(status, code) && attempt < maxRetries) {
          const delayMs =
            status === 429
              ? this.extractThrottleDelayMs(data)
              : this.extractRetryDelayMs(attempt);
          this.logger.warn(
            `Clientify request to ${endpoint} failed with ${status ?? code ?? 'unknown error'}. Retrying in ${delayMs} ms (attempt ${attempt + 1}/${maxRetries})`,
          );
          await this.sleep(delayMs);
          continue;
        }

        if (status) {
          throw new BadGatewayException({
            message: 'Error del proveedor Clientify',
            provider: 'clientify',
            providerStatus: status,
            providerError: data,
          });
        }

        throw new BadGatewayException({
          message: 'No fue posible conectarse con Clientify',
          provider: 'clientify',
          providerStatus: null,
          providerError: {
            code,
            detail: axiosError.message,
          },
        });
      }
    }

    throw new BadGatewayException({
      message: 'No fue posible completar la solicitud a Clientify',
      provider: 'clientify',
      providerStatus: null,
    });
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

  private extractThrottleDelayMs(data: unknown) {
    const detail =
      typeof data === 'object' && data !== null && 'detail' in data
        ? String((data as { detail?: unknown }).detail ?? '')
        : '';
    const matchedSeconds = detail.match(/(\d+)\s*seconds?/i);
    const seconds = matchedSeconds ? Number(matchedSeconds[1]) : 10;

    return (Number.isFinite(seconds) ? seconds : 10) * 1000 + 500;
  }

  private extractRetryDelayMs(attempt: number) {
    const baseDelayMs = 3000;
    const cappedAttempt = Math.min(attempt, 4);
    return baseDelayMs * 2 ** cappedAttempt;
  }

  private shouldRetryRequest(status?: number, code?: string | null) {
    if (status && [408, 429, 502, 503, 504].includes(status)) {
      return true;
    }

    if (!code) {
      return false;
    }

    return [
      'ECONNABORTED',
      'ECONNRESET',
      'EAI_AGAIN',
      'ENETUNREACH',
      'ENOTFOUND',
      'ETIMEDOUT',
    ].includes(code);
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

  private normalizeIdentification(value: unknown) {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
  }

  private extractContactIdentification(contact: ClientifyContact) {
    return this.extractCustomFieldValue(contact.custom_fields, [
      'DNI',
      'DNI trasladado',
      'Documento',
      'Número de Documento',
      'Numero de Documento',
      'Identificación',
      'Identificacion',
      'ID fiscal (NIF, CIF...)',
      'ID fiscal',
    ]);
  }

  private extractValueFromCustomFieldSources(
    sources: Array<ClientifyCustomField[] | undefined>,
    fieldNames: string[],
  ) {
    for (const source of sources) {
      const value = this.extractCustomFieldValue(source, fieldNames);
      if (value) {
        return value;
      }
    }

    return null;
  }

  private extractRawValueFromCustomFieldSources(
    sources: Array<ClientifyCustomField[] | undefined>,
    fieldNames: string[],
  ) {
    for (const source of sources) {
      const matchedField = (source ?? []).find((customField) =>
        fieldNames.some(
          (fieldName) =>
            this.toSearchableText(customField.field) ===
            this.toSearchableText(fieldName),
        ),
      );

      if (matchedField?.value !== undefined && matchedField.value !== null) {
        return matchedField.value;
      }
    }

    return null;
  }

  private toResponseString(value: unknown) {
    return value === undefined || value === null ? '' : String(value).trim();
  }

  private toResponseStringArray(value: unknown) {
    if (Array.isArray(value)) {
      return value
        .map((item) => this.toResponseString(item))
        .filter((item) => item.length > 0);
    }

    if (typeof value === 'string') {
      return value
        .split(/[,;|]/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    }

    const normalizedValue = this.toResponseString(value);
    return normalizedValue ? [normalizedValue] : [];
  }

  private extractContactCountry(contact: ClientifyContact | null) {
    if (!contact) {
      return null;
    }

    if (contact.country) {
      return String(contact.country).trim();
    }

    for (const address of contact.addresses ?? []) {
      const country = address.country;
      if (typeof country === 'string' && country.trim()) {
        return country.trim();
      }

      if (country && typeof country === 'object') {
        const countryName = country.name ?? country.value;
        if (countryName) {
          return String(countryName).trim();
        }
      }
    }

    return null;
  }

  async getClientByIdentification(identification: string) {
    const requestedIdentification = String(identification ?? '').trim();
    const normalizedIdentification = this.normalizeIdentification(
      requestedIdentification,
    );

    if (!normalizedIdentification) {
      throw new BadRequestException('La identificación es obligatoria');
    }

    const contactFields = `${CLIENTIFY_DEFAULT_FIELDS.contactDetail},addresses,country`;
    const [contactsResponse, companiesResponse] = await Promise.all([
      this.request<ClientifyPaginatedResponse<ClientifyContact>>(
        'GET',
        '/contacts/',
        {
          params: {
            fields: contactFields,
            page: 1,
            page_size: 100,
            query: requestedIdentification,
          },
        },
      ),
      this.request<ClientifyPaginatedResponse<ClientifyCompany>>(
        'GET',
        '/companies/',
        {
          params: {
            fields: CLIENTIFY_DEFAULT_FIELDS.companyDetailWithCustomFields,
            page: 1,
            page_size: 100,
            query: requestedIdentification,
          },
        },
      ),
    ]);

    const contacts = contactsResponse.results ?? [];
    const companies = companiesResponse.results ?? [];
    let contact =
      contacts.find(
        (item) =>
          this.normalizeIdentification(
            this.extractContactIdentification(item),
          ) === normalizedIdentification,
      ) ?? (contacts.length === 1 ? contacts[0] : null);
    let company =
      companies.find(
        (item) =>
          this.normalizeIdentification(this.extractNitFromCompany(item)) ===
          normalizedIdentification,
      ) ?? (companies.length === 1 ? companies[0] : null);

    if (!company && contact?.company_id) {
      company = await this.getCompanyByIdCached(contact.company_id);
    }

    if (!contact && company) {
      const companyContactsResponse =
        await this.request<ClientifyPaginatedResponse<ClientifyContact>>(
          'GET',
          '/contacts/',
          {
            params: {
              fields: contactFields,
              page: 1,
              page_size: 100,
              query: company.name,
            },
          },
        );

      contact =
        (companyContactsResponse.results ?? []).find(
          (item) => item.company_id === company?.id,
        ) ?? null;
    }

    if (!contact && !company) {
      throw new NotFoundException(
        `No se encontró un cliente con la identificación ${requestedIdentification}`,
      );
    }

    const deals = contact
      ? (await this.getContactDeals(contact.id)).results
      : [];
    const latestDeal = [...deals].sort((left, right) => {
      const leftDate = Date.parse(left.modified ?? left.created ?? '') || 0;
      const rightDate = Date.parse(right.modified ?? right.created ?? '') || 0;
      return rightDate - leftDate;
    })[0];
    const customFieldSources = [
      contact?.custom_fields,
      company?.custom_fields,
      latestDeal?.customFields,
    ];
    const contactDocument = contact
      ? this.extractContactIdentification(contact)
      : null;
    const composedContactName =
      `${contact?.first_name ?? ''} ${contact?.last_name ?? ''}`.trim();
    const customContactName = this.extractValueFromCustomFieldSources(
      customFieldSources,
      ['Trasladado', 'Nombre contacto'],
    );

    return {
      nombrecuenta: company?.name ?? contact?.company_name ?? null,
      nombrecontacto:
        contact?.full_name?.trim() ||
        composedContactName ||
        customContactName ||
        null,
      Correocontacto:
        contact?.email ??
        contact?.emails?.[0]?.email ??
        this.extractValueFromCustomFieldSources(customFieldSources, [
          'Correo trasladado',
          'Correo contacto',
        ]),
      telefonocontacto:
        contact?.phone ??
        contact?.phones?.[0]?.phone ??
        this.extractValueFromCustomFieldSources(customFieldSources, [
          'Telefono trasladado',
          'Teléfono trasladado',
          'Teléfono contacto',
          'Telefono contacto',
        ]),
      paiscontacto:
        this.extractContactCountry(contact) ??
        company?.country ??
        this.extractValueFromCustomFieldSources(customFieldSources, [
          'País',
          'Pais',
          'País contacto',
          'Pais contacto',
        ]),
      modo: this.extractValueFromCustomFieldSources(customFieldSources, [
        'Modo',
        'Modo de transporte',
        'Tipo de operación',
        'Tipo de operacion',
      ]),
      lineaservicio: this.extractValueFromCustomFieldSources(
        customFieldSources,
        ['Línea de servicio', 'Linea de servicio', 'Línea servicio'],
      ),
      modalidad: this.extractValueFromCustomFieldSources(customFieldSources, [
        'Modalidad',
        'Modalidad de servicio',
      ]),
      documento:
        contactDocument ??
        this.extractNitFromCompany(company) ??
        requestedIdentification,
    };
  }

  async getClientByOpportunity(opportunityId: string) {
    const normalizedOpportunityId = String(opportunityId ?? '').trim();
    const numericOpportunityId = Number(normalizedOpportunityId);

    if (
      !normalizedOpportunityId ||
      !Number.isInteger(numericOpportunityId) ||
      numericOpportunityId <= 0
    ) {
      throw new BadRequestException(
        'El número de oportunidad debe ser un entero positivo',
      );
    }

    const deal = await this.request<ClientifyDeal>(
      'GET',
      `/deals/${numericOpportunityId}/`,
      { params: { fields: CLIENTIFY_DEFAULT_FIELDS.deals } },
    );
    const contactFields = `${CLIENTIFY_DEFAULT_FIELDS.contactDetail},addresses,country`;
    const contact = deal.contact_id
      ? await this.request<ClientifyContact>(
          'GET',
          `/contacts/${deal.contact_id}/`,
          { params: { fields: contactFields } },
        )
      : null;
    const companyId = deal.company_id ?? contact?.company_id;
    const company = companyId
      ? await this.getCompanyByIdCached(companyId)
      : null;
    const commercialOwnerId =
      deal.owner_id ?? contact?.owner_id ?? company?.owner_id;
    const commercialOwner = deal.owner ?? contact?.owner ?? company?.owner;
    let commercial: ClientifyV1User | null = null;
    let commercialEmail =
      typeof commercialOwner === 'string' && commercialOwner.includes('@')
        ? commercialOwner.trim()
        : '';

    if (!commercialEmail && commercialOwnerId) {
      try {
        commercial = await this.request<ClientifyV1User>(
          'GET',
          `/users/${commercialOwnerId}/`,
          { params: { fields: CLIENTIFY_DEFAULT_FIELDS.users } },
        );
      } catch {
        try {
          commercial = await this.requestV1<ClientifyV1User>(
            'GET',
            `/users/${commercialOwnerId}/`,
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'error desconocido';
          this.logger.warn(
            `No fue posible consultar el comercial ${commercialOwnerId}: ${message}`,
          );
        }
      }

      commercialEmail = this.toResponseString(
        commercial?.email ?? commercial?.username,
      );
    }
    const customFieldSources = [
      deal.custom_fields,
      contact?.custom_fields,
      company?.custom_fields,
    ];
    const composedContactName =
      `${contact?.first_name ?? ''} ${contact?.last_name ?? ''}`.trim();
    const customContactName = this.extractValueFromCustomFieldSources(
      customFieldSources,
      ['Trasladado', 'Nombre contacto'],
    );
    const lineaNegocioValue = this.extractRawValueFromCustomFieldSources(
      customFieldSources,
      [
        'Línea de negocio',
        'Linea de negocio',
        'Líneas de negocio',
        'Lineas de negocio',
      ],
    );

    return {
      NombreCuenta: this.toResponseString(
        company?.name ?? deal.company_name ?? contact?.company_name,
      ),
      NombreContacto: this.toResponseString(
        contact?.full_name?.trim() ||
          composedContactName ||
          deal.contact_name ||
          customContactName,
      ),
      correoContacto: this.toResponseString(
        contact?.email ??
          contact?.emails?.[0]?.email ??
          deal.contact_email ??
          this.extractValueFromCustomFieldSources(customFieldSources, [
            'Correo trasladado',
            'Correo contacto',
          ]),
      ),
      correo_comercial: commercialEmail,
      telefonoContacto: this.toResponseString(
        contact?.phone ??
          contact?.phones?.[0]?.phone ??
          deal.contact_phone ??
          this.extractValueFromCustomFieldSources(customFieldSources, [
            'Telefono trasladado',
            'Teléfono trasladado',
            'Teléfono contacto',
            'Telefono contacto',
          ]),
      ),
      paisContacto: this.toResponseString(
        this.extractContactCountry(contact) ??
          company?.country ??
          this.extractValueFromCustomFieldSources(customFieldSources, [
            'País',
            'Pais',
            'País contacto',
            'Pais contacto',
          ]),
      ),
      modo: this.toResponseString(
        this.extractValueFromCustomFieldSources(customFieldSources, [
          'Modo',
          'Modo de transporte',
          'Tipo de operación',
          'Tipo de operacion',
        ]),
      ),
      lineaServicio: this.toResponseString(
        this.extractValueFromCustomFieldSources(customFieldSources, [
          'Línea de servicio',
          'Linea de servicio',
          'Línea servicio',
        ]),
      ),
      modalidad: this.toResponseString(
        this.extractValueFromCustomFieldSources(customFieldSources, [
          'Modalidad',
          'Modalidad de servicio',
        ]),
      ),
      documento: this.toResponseString(
        (contact && this.extractContactIdentification(contact)) ??
          this.extractNitFromCompany(company),
      ),
      lineaNegocio: this.toResponseStringArray(lineaNegocioValue),
    };
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

  async getV1Users(query: ListQueryDto) {
    const response = await this.requestV1<
      ClientifyPaginatedResponse<ClientifyV1User>
    >('GET', '/users/', {
      params: this.buildV1ListParams(query),
    });

    return this.normalizePaginated(response);
  }

  async getV1Calls(query: ListQueryDto) {
    const response = await this.requestV1<
      ClientifyPaginatedResponse<ClientifyV1Call>
    >('GET', '/calls/', {
      params: this.buildV1ListParams(query),
    });

    return this.normalizePaginated(response);
  }

  getV1CallById(id: number) {
    return this.requestV1<ClientifyV1Call>('GET', `/calls/${id}/`);
  }

  async getV1Tasks(query: ListQueryDto) {
    const response = await this.requestV1<
      ClientifyPaginatedResponse<ClientifyV1Task>
    >('GET', '/tasks/', {
      params: this.buildV1ListParams(query),
    });

    return this.normalizePaginated(response);
  }

  async getV1TaskTypes(query: ListQueryDto) {
    const response = await this.requestV1<
      ClientifyPaginatedResponse<ClientifyV1TaskType>
    >('GET', '/tasks/types', {
      params: this.buildV1ListParams(query),
    });

    return this.normalizePaginated(response);
  }

  async getV1TaskStages(query: ListQueryDto) {
    const response = await this.requestV1<
      ClientifyPaginatedResponse<ClientifyV1TaskStage>
    >('GET', '/tasks/types/stages', {
      params: this.buildV1ListParams(query),
    });

    return this.normalizePaginated(response);
  }

  async getV1DealPipelines(query: ListQueryDto) {
    const response = await this.requestV1<
      ClientifyPaginatedResponse<ClientifyV1DealPipeline>
    >('GET', '/deals/pipelines/', {
      params: this.buildV1ListParams(query),
    });

    return this.normalizePaginated(response);
  }

  async getV1DealPipelineStages(query: ListQueryDto) {
    const response = await this.requestV1<
      ClientifyPaginatedResponse<ClientifyV1PipelineStage>
    >('GET', '/deals/pipelines/stages/', {
      params: this.buildV1ListParams(query),
    });

    return this.normalizePaginated(response);
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
