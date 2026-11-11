import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { ClientifyService } from '../clientify/clientify.service';
import { SqlServerService } from './sql-server.service';

type SyncTrigger = 'cron' | 'manual';
type SyncedContact = Awaited<
  ReturnType<ClientifyService['getContacts']>
>['results'][number];
type SyncedDeal = Awaited<
  ReturnType<ClientifyService['getDeals']>
>['results'][number];
type SyncedV1Call = Awaited<
  ReturnType<ClientifyService['getV1Calls']>
>['results'][number];
type SyncedV1User = Awaited<
  ReturnType<ClientifyService['getV1Users']>
>['results'][number];
type SyncedV1Task = Awaited<
  ReturnType<ClientifyService['getV1Tasks']>
>['results'][number];
type SyncedV1TaskType = Awaited<
  ReturnType<ClientifyService['getV1TaskTypes']>
>['results'][number];
type SyncedV1TaskStage = Awaited<
  ReturnType<ClientifyService['getV1TaskStages']>
>['results'][number];
type SyncedV1DealPipeline = Awaited<
  ReturnType<ClientifyService['getV1DealPipelines']>
>['results'][number];
type SyncedV1PipelineStage = Awaited<
  ReturnType<ClientifyService['getV1DealPipelineStages']>
>['results'][number];
type SyncedCompany = {
  city?: string | null;
  company_size?: string | number | null;
  country?: string | null;
  created?: string | null;
  email?: string | null;
  id?: number | null;
  industry?: string | null;
  last_contact?: string | null;
  modified?: string | null;
  name?: string | null;
  owner?: string | null;
  owner_id?: number | null;
  owner_name?: string | null;
  phone?: string | null;
  state?: string | null;
  status?: string | null;
  taxpayer_identification_number?: string | number | null;
  website?: string | null;
};

@Injectable()
export class ClientifySyncService {
  private readonly logger = new Logger(ClientifySyncService.name);
  private isRunning = false;

  constructor(
    private readonly clientifyService: ClientifyService,
    private readonly configService: ConfigService,
    private readonly sqlServerService: SqlServerService,
  ) {}

  @Cron('0 0 7,13 * * *', {
    name: 'clientify-sync',
    timeZone: 'America/Bogota',
  })
  async runCronSync() {
    if (!this.isSyncEnabled() || !this.isCronEnabled()) {
      return;
    }

    await this.runFullSync('cron');
  }

  async runFullSync(trigger: SyncTrigger) {
    if (!this.isSyncEnabled()) {
      throw new ServiceUnavailableException(
        'La sincronización está deshabilitada. Configure CLIENTIFY_SYNC_ENABLED=true',
      );
    }

    if (!this.sqlServerService.isConfigured()) {
      throw new ServiceUnavailableException(
        'Faltan variables de entorno de SQL Server para sincronizar',
      );
    }

    if (this.isRunning) {
      return {
        message: 'Ya existe una sincronización en ejecución',
        status: 'skipped',
        trigger,
      };
    }

    this.isRunning = true;
    let runId = 0;

    try {
      await this.sqlServerService.ensureBaseSchema();
      runId = await this.sqlServerService.insertSyncRun(trigger);

      const companies = await this.syncCompanies();
      const contacts = await this.syncContacts();
      const deals = await this.syncDeals();
      const v1Calls = await this.syncV1Calls();
      const v1Users = await this.syncV1Users();
      const v1Tasks = await this.syncV1Tasks();
      const v1TaskTypes = await this.syncV1TaskTypes();
      const v1TaskStages = await this.syncV1TaskStages();
      const v1DealPipelines = await this.syncV1DealPipelines();
      const v1PipelineStages = await this.syncV1PipelineStages();

      await this.sqlServerService.markSyncRunCompleted(runId, {
        companies,
        contacts,
        deals,
        v1Calls,
        v1Users,
        v1Tasks,
        v1TaskTypes,
        v1TaskStages,
        v1DealPipelines,
        v1PipelineStages,
      });

      return {
        message: 'Sincronización completada',
        runId,
        status: 'completed',
        totals: {
          companies,
          contacts,
          deals,
          v1Calls,
          v1Users,
          v1Tasks,
          v1TaskTypes,
          v1TaskStages,
          v1DealPipelines,
          v1PipelineStages,
        },
        trigger,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Sync failed: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (runId > 0) {
        await this.sqlServerService.markSyncRunFailed(runId, message);
      }

      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  private async syncCompanies() {
    return this.syncPaginatedResource<SyncedCompany>({
      label: 'companies',
      fetchPage: async (page, pageSize) => {
        const response = (await this.clientifyService.getCompanies({
          page,
          pageSize,
          fields:
            'id,owner_id,owner,owner_name,name,email,phone,website,industry,company_size,country,city,state,status,created,modified,last_contact,taxpayer_identification_number',
        })) as { next?: string | null; results?: SyncedCompany[] };

        return {
          next: response.next ?? null,
          results: response.results ?? [],
        };
      },
      persist: async (company) => {
        await this.sqlServerService.upsert(
          this.sqlServerService.tables.companies,
          {
            clientify_id: company.id ?? null,
            owner: company.owner ?? null,
            owner_id: company.owner_id ?? null,
            owner_name: company.owner_name ?? null,
            name: company.name ?? null,
            email: company.email ?? null,
            phone: company.phone ?? null,
            website: company.website ?? null,
            industry: company.industry ?? null,
            company_size:
              company.company_size != null
                ? String(company.company_size)
                : null,
            country: company.country ?? null,
            city: company.city ?? null,
            state: company.state ?? null,
            status: company.status ?? null,
            created_at_clientify: this.toSqlDateTime(company.created),
            modified_at_clientify: this.toSqlDateTime(company.modified),
            last_contact_at_clientify: this.toSqlDateTime(
              company.last_contact,
            ),
            taxpayer_identification_number:
              company.taxpayer_identification_number ?? null,
            raw_json: JSON.stringify(company),
            synced_at: new Date(),
          },
        );
      },
    });
  }

  private async syncContacts() {
    return this.syncPaginatedResource<SyncedContact>({
      label: 'contacts',
      fetchPage: async (page, pageSize) =>
        this.clientifyService.getContacts({
          page,
          pageSize,
        }),
      persist: async (contact) => {
        await this.sqlServerService.upsert(
          this.sqlServerService.tables.contacts,
          {
            clientify_id: contact.id ?? null,
            owner: contact.owner ?? null,
            owner_id: contact.ownerId ?? null,
            owner_name: contact.ownerName ?? null,
            first_name: contact.firstName ?? null,
            last_name: contact.lastName ?? null,
            full_name: contact.fullName ?? null,
            email: contact.email ?? null,
            phone: contact.phone ?? null,
            company_id: contact.companyId ?? null,
            company_name: contact.companyName ?? null,
            status: contact.status ?? null,
            title: contact.title ?? null,
            contact_source: contact.contactSource ?? null,
            created_at_clientify: this.toSqlDateTime(contact.created),
            modified_at_clientify: this.toSqlDateTime(contact.modified),
            last_contact_at_clientify: this.toSqlDateTime(contact.lastContact),
            remarks: contact.remarks ?? null,
            summary: contact.summary ?? null,
            raw_json: JSON.stringify(contact),
            synced_at: new Date(),
          },
        );
      },
    });
  }

  private async syncDeals() {
    return this.syncPaginatedResource<SyncedDeal>({
      label: 'deals',
      fetchPage: async (page, pageSize) =>
        this.clientifyService.getDeals({
          page,
          pageSize,
        }),
      persist: async (deal) => {
        await this.sqlServerService.upsert(this.sqlServerService.tables.deals, {
          clientify_id: deal.id ?? null,
          owner: deal.owner ?? null,
          owner_id: deal.ownerId ?? null,
          owner_name: deal.ownerName ?? null,
          name: deal.name ?? null,
          amount: deal.amount ?? null,
          amount_user: deal.amountUser ?? null,
          currency: deal.currency ?? null,
          status: deal.status != null ? String(deal.status) : null,
          status_desc: deal.statusDesc ?? null,
          probability: deal.probability ?? null,
          probability_desc: deal.probabilityDesc ?? null,
          pipeline_id: deal.pipelineId ?? null,
          pipeline: deal.pipeline ?? null,
          pipeline_desc: deal.pipelineDesc ?? null,
          pipeline_stage_id: deal.pipelineStageId ?? null,
          pipeline_stage: deal.pipelineStage ?? null,
          pipeline_stage_desc: deal.pipelineStageDesc ?? null,
          created_at_clientify: this.toSqlDateTime(deal.created),
          modified_at_clientify: this.toSqlDateTime(deal.modified),
          expected_closed_date: this.toSqlDate(deal.expectedClosedDate),
          actual_closed_date: this.toSqlDate(deal.actualClosedDate),
          expected_closed_date_iso: this.toSqlDateTime(
            deal.expectedClosedDateIso,
          ),
          actual_closed_date_iso: this.toSqlDateTime(deal.actualClosedDateIso),
          contact_id: deal.contactId ?? null,
          contact: deal.contact ?? null,
          contact_name: deal.contactName ?? null,
          contact_email: deal.contactEmail ?? null,
          contact_phone: deal.contactPhone ?? null,
          contact_medium: deal.contactMedium ?? null,
          contact_source: deal.contactSource ?? null,
          company_id: deal.companyId ?? null,
          company: deal.company ?? null,
          company_name: deal.companyName ?? null,
          source: deal.source != null ? String(deal.source) : null,
          deal_source_id: deal.dealSourceId ?? null,
          deal_source: deal.dealSource ?? null,
          remarks: deal.remarks ?? null,
          lost_reason: deal.lostReason ?? null,
          won_deal_reason: deal.wonDealReason ?? null,
          relevant_closed_date: this.toSqlDateTime(deal.relevantClosedDate),
          amount_currency: deal.amountCurrency ?? null,
          operation_type: deal.operationType ?? null,
          raw_json: JSON.stringify(deal),
          synced_at: new Date(),
        });
      },
    });
  }

  private async syncV1Calls() {
    return this.syncPaginatedResource<SyncedV1Call>({
      label: 'v1 calls',
      fetchPage: async (page, pageSize) =>
        this.clientifyService.getV1Calls({
          page,
          pageSize,
        }),
      persist: async (call) => {
        const clientifyId = this.resolveClientifyId(call, 'v1 call');
        if (clientifyId === null) {
          return false;
        }

        await this.sqlServerService.upsert(this.sqlServerService.tables.v1Calls, {
          clientify_id: clientifyId,
          api_url: call.url ?? null,
          owner_username: call.owner ?? null,
          content_object: call.content_object ?? null,
          call_type: call.type ?? null,
          comment: call.comment ?? null,
          outcome: call.outcome ?? null,
          audio_url: call.audio_url ?? null,
          duration: call.duration ?? null,
          created_at_clientify: this.toSqlDateTime(call.created),
          call_date: this.toSqlDate(call.call_date),
          call_time: call.call_time ?? null,
          raw_json: JSON.stringify(call),
          synced_at: new Date(),
        });
      },
    });
  }

  private async syncV1Users() {
    return this.syncPaginatedResource<SyncedV1User>({
      label: 'v1 users',
      fetchPage: async (page, pageSize) =>
        this.clientifyService.getV1Users({
          page,
          pageSize,
        }),
      persist: async (user) => {
        const clientifyId = this.resolveClientifyId(user, 'v1 user');
        if (clientifyId === null) {
          return false;
        }

        await this.sqlServerService.upsert(this.sqlServerService.tables.v1Users, {
          clientify_id: clientifyId,
          api_url: user.url ?? null,
          username: user.username ?? null,
          first_name: user.first_name ?? null,
          last_name: user.last_name ?? null,
          full_name: user.full_name ?? null,
          email: user.email ?? null,
          company_id: user.company_id ?? null,
          company_name: user.company_name ?? null,
          raw_json: JSON.stringify(user),
          synced_at: new Date(),
        });
      },
    });
  }

  private async syncV1Tasks() {
    return this.syncPaginatedResource<SyncedV1Task>({
      label: 'v1 tasks',
      fetchPage: async (page, pageSize) =>
        this.clientifyService.getV1Tasks({
          page,
          pageSize,
        }),
      persist: async (task) => {
        const clientifyId = this.resolveClientifyId(task, 'v1 task');
        if (clientifyId === null) {
          return false;
        }

        await this.sqlServerService.upsert(this.sqlServerService.tables.v1Tasks, {
          clientify_id: clientifyId,
          api_url: task.url ?? null,
          name: task.name ?? null,
          due_date: this.toSqlDateTime(task.due_date),
          assigned_to: task.assigned_to ?? null,
          remarks: task.remarks ?? null,
          description: task.description ?? null,
          location: task.location ?? null,
          additional_options: task.additional_options ?? null,
          owner: task.owner ?? null,
          status: task.status != null ? String(task.status) : null,
          status_desc: task.status_desc ?? null,
          task_type: task.task_type ?? null,
          related_contacts: this.toSqlJson(task.related_contacts),
          related_companies: this.toSqlJson(task.related_companies),
          related_deals: this.toSqlJson(task.deals),
          guest_users: this.toSqlJson(task.guest_users),
          created_at_clientify: this.toSqlDateTime(task.created),
          modified_at_clientify: this.toSqlDateTime(task.modified),
          raw_json: JSON.stringify(task),
          synced_at: new Date(),
        });
      },
    });
  }

  private async syncV1TaskTypes() {
    return this.syncPaginatedResource<SyncedV1TaskType>({
      label: 'v1 task types',
      fetchPage: async (page, pageSize) =>
        this.clientifyService.getV1TaskTypes({
          page,
          pageSize,
        }),
      persist: async (taskType) => {
        const clientifyId = this.resolveClientifyId(taskType, 'v1 task type');
        if (clientifyId === null) {
          return false;
        }

        await this.sqlServerService.upsert(
          this.sqlServerService.tables.v1TaskTypes,
          {
            clientify_id: clientifyId,
            api_url: taskType.url ?? null,
            name: taskType.name ?? null,
            raw_json: JSON.stringify(taskType),
            synced_at: new Date(),
          },
        );
      },
    });
  }

  private async syncV1TaskStages() {
    return this.syncPaginatedResource<SyncedV1TaskStage>({
      label: 'v1 task stages',
      fetchPage: async (page, pageSize) =>
        this.clientifyService.getV1TaskStages({
          page,
          pageSize,
        }),
      persist: async (taskStage) => {
        const clientifyId = this.resolveClientifyId(taskStage, 'v1 task stage');
        if (clientifyId === null) {
          return false;
        }

        await this.sqlServerService.upsert(
          this.sqlServerService.tables.v1TaskStages,
          {
            clientify_id: clientifyId,
            api_url: taskStage.url ?? null,
            name: taskStage.name ?? null,
            task_type: taskStage.task_type ?? null,
            raw_json: JSON.stringify(taskStage),
            synced_at: new Date(),
          },
        );
      },
    });
  }

  private async syncV1DealPipelines() {
    return this.syncPaginatedResource<SyncedV1DealPipeline>({
      label: 'v1 deal pipelines',
      fetchPage: async (page, pageSize) =>
        this.clientifyService.getV1DealPipelines({
          page,
          pageSize,
        }),
      persist: async (pipeline) => {
        const clientifyId = this.resolveClientifyId(
          pipeline,
          'v1 deal pipeline',
        );
        if (clientifyId === null) {
          return false;
        }

        await this.sqlServerService.upsert(
          this.sqlServerService.tables.v1DealPipelines,
          {
            clientify_id: clientifyId,
            api_url: pipeline.url ?? null,
            name: pipeline.name ?? null,
            is_default: pipeline.is_default ?? null,
            user_default: pipeline.user_default ?? null,
            raw_json: JSON.stringify(pipeline),
            synced_at: new Date(),
          },
        );
      },
    });
  }

  private async syncV1PipelineStages() {
    return this.syncPaginatedResource<SyncedV1PipelineStage>({
      label: 'v1 pipeline stages',
      fetchPage: async (page, pageSize) =>
        this.clientifyService.getV1DealPipelineStages({
          page,
          pageSize,
        }),
      persist: async (stage) => {
        const clientifyId = this.resolveClientifyId(stage, 'v1 pipeline stage');
        if (clientifyId === null) {
          return false;
        }

        await this.sqlServerService.upsert(
          this.sqlServerService.tables.v1PipelineStages,
          {
            clientify_id: clientifyId,
            api_url: stage.url ?? null,
            name: stage.name ?? null,
            position: stage.position ?? null,
            probability: stage.probability ?? null,
            pipeline: stage.pipeline ?? null,
            raw_json: JSON.stringify(stage),
            synced_at: new Date(),
          },
        );
      },
    });
  }

  private async syncPaginatedResource<T>(options: {
    label: string;
    fetchPage: (
      page: number,
      pageSize: number,
    ) => Promise<{ next?: string | null; results?: T[] } | T[]>;
    persist: (item: T) => Promise<boolean | void>;
  }) {
    const pageSize = this.getSyncPageSize();
    const pageDelayMs = this.getSyncPageDelayMs();
    let total = 0;
    let page = 1;
    let hasNext = true;

    while (hasNext) {
      const response = await options.fetchPage(page, pageSize);
      const pageResults = Array.isArray(response)
        ? response
        : Array.isArray(response.results)
          ? response.results
          : [];

      this.logger.log(
        `Syncing ${options.label} page ${page} with ${pageResults.length} records`,
      );

      for (const item of pageResults) {
        const persisted = await options.persist(item);
        if (persisted !== false) {
          total += 1;
        }
      }

      hasNext = Array.isArray(response) ? false : Boolean(response.next);

      if (hasNext && pageDelayMs > 0) {
        await this.sleep(pageDelayMs);
      }

      page += 1;
    }

    this.logger.log(`Finished syncing ${options.label}. Total records: ${total}`);
    return total;
  }

  private resolveClientifyId(
    entity: { id?: unknown; url?: unknown },
    label: string,
  ) {
    if (typeof entity.id === 'number' && Number.isFinite(entity.id)) {
      return entity.id;
    }

    if (typeof entity.id === 'string') {
      const parsedId = Number(entity.id.trim());
      if (Number.isFinite(parsedId)) {
        return parsedId;
      }
    }

    if (typeof entity.url === 'string') {
      const match = entity.url.match(/\/(\d+)\/?$/);
      if (match) {
        const parsedId = Number(match[1]);
        if (Number.isFinite(parsedId)) {
          return parsedId;
        }
      }
    }

    this.logger.warn(
      `Skipping ${label} because Clientify did not return a usable id. Payload=${JSON.stringify(entity)}`,
    );
    return null;
  }

  private isSyncEnabled() {
    return Boolean(
      this.configService.get<boolean>('CLIENTIFY_SYNC_ENABLED', false),
    );
  }

  private isCronEnabled() {
    return this.configService.get<boolean>('CLIENTIFY_SYNC_CRON_ENABLED', true);
  }

  private getSyncPageSize() {
    const configuredSize = Number(
      this.configService.get<number>('CLIENTIFY_SYNC_PAGE_SIZE', 100),
    );

    if (!Number.isFinite(configuredSize) || configuredSize < 1) {
      return 100;
    }

    return Math.min(Math.trunc(configuredSize), 100);
  }

  private getSyncPageDelayMs() {
    const configuredDelay = Number(
      this.configService.get<number>('CLIENTIFY_SYNC_PAGE_DELAY_MS', 750),
    );

    if (!Number.isFinite(configuredDelay) || configuredDelay < 0) {
      return 750;
    }

    return Math.trunc(configuredDelay);
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private toSqlJson(value: unknown) {
    if (value === undefined || value === null) {
      return null;
    }

    return JSON.stringify(value);
  }

  private toSqlDate(value: unknown) {
    if (!value) {
      return null;
    }

    const parsedDate = new Date(String(value));
    return Number.isNaN(parsedDate.getTime())
      ? null
      : parsedDate.toISOString().slice(0, 10);
  }

  private toSqlDateTime(value: unknown) {
    if (!value) {
      return null;
    }

    const parsedDate = new Date(String(value));
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }
}
