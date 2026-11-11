import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';

type SqlColumnDefinition = {
  defaultValue?: string;
  isNullable?: boolean;
  name: string;
  type: string;
};

@Injectable()
export class SqlServerService implements OnModuleDestroy {
  private readonly logger = new Logger(SqlServerService.name);
  private pool: sql.ConnectionPool | null = null;
  readonly tables = {
    companies: 'clientify_companies',
    contacts: 'clientify_contacts',
    deals: 'clientify_deals',
    v1Calls: 'clientify_v1_calls',
    v1Users: 'clientify_v1_users',
    v1Tasks: 'clientify_v1_tasks',
    v1TaskTypes: 'clientify_v1_task_types',
    v1TaskStages: 'clientify_v1_task_stages',
    v1DealPipelines: 'clientify_v1_deal_pipelines',
    v1PipelineStages: 'clientify_v1_pipeline_stages',
    syncRuns: 'clientify_sync_runs',
  } as const;

  constructor(private readonly configService: ConfigService) {}

  isConfigured() {
    const password = this.configService.get<string>('SQL_SERVER_PASSWORD');
    return Boolean(
      this.configService.get<string>('SQL_SERVER_HOST') &&
      this.configService.get<string>('SQL_SERVER_USER') &&
      password !== undefined &&
      this.configService.get<string>('SQL_SERVER_DATABASE'),
    );
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }

  async ensureBaseSchema() {
    await this.ensureTable(
      this.tables.syncRuns,
      [
        {
          name: 'id',
          type: 'INT IDENTITY(1,1) PRIMARY KEY',
          isNullable: false,
        },
        { name: 'trigger_type', type: 'NVARCHAR(32)', isNullable: false },
        { name: 'status', type: 'NVARCHAR(32)', isNullable: false },
        { name: 'started_at', type: 'DATETIME2', isNullable: false },
        { name: 'finished_at', type: 'DATETIME2' },
        {
          name: 'contacts_synced',
          type: 'INT',
          defaultValue: '0',
          isNullable: false,
        },
        {
          name: 'companies_synced',
          type: 'INT',
          defaultValue: '0',
          isNullable: false,
        },
        {
          name: 'deals_synced',
          type: 'INT',
          defaultValue: '0',
          isNullable: false,
        },
        {
          name: 'v1_calls_synced',
          type: 'INT',
          defaultValue: '0',
          isNullable: false,
        },
        {
          name: 'v1_users_synced',
          type: 'INT',
          defaultValue: '0',
          isNullable: false,
        },
        {
          name: 'v1_tasks_synced',
          type: 'INT',
          defaultValue: '0',
          isNullable: false,
        },
        {
          name: 'v1_task_types_synced',
          type: 'INT',
          defaultValue: '0',
          isNullable: false,
        },
        {
          name: 'v1_task_stages_synced',
          type: 'INT',
          defaultValue: '0',
          isNullable: false,
        },
        {
          name: 'v1_deal_pipelines_synced',
          type: 'INT',
          defaultValue: '0',
          isNullable: false,
        },
        {
          name: 'v1_pipeline_stages_synced',
          type: 'INT',
          defaultValue: '0',
          isNullable: false,
        },
        { name: 'error_message', type: 'NVARCHAR(MAX)' },
      ],
      [],
    );

    await this.ensureTable(
      this.tables.contacts,
      [
        { name: 'clientify_id', type: 'INT', isNullable: false },
        { name: 'owner', type: 'NVARCHAR(255)' },
        { name: 'owner_id', type: 'INT' },
        { name: 'owner_name', type: 'NVARCHAR(255)' },
        { name: 'first_name', type: 'NVARCHAR(255)' },
        { name: 'last_name', type: 'NVARCHAR(255)' },
        { name: 'full_name', type: 'NVARCHAR(255)' },
        { name: 'email', type: 'NVARCHAR(255)' },
        { name: 'phone', type: 'NVARCHAR(100)' },
        { name: 'company_id', type: 'INT' },
        { name: 'company_name', type: 'NVARCHAR(255)' },
        { name: 'status', type: 'NVARCHAR(100)' },
        { name: 'title', type: 'NVARCHAR(255)' },
        { name: 'contact_source', type: 'NVARCHAR(255)' },
        { name: 'created_at_clientify', type: 'DATETIME2' },
        { name: 'modified_at_clientify', type: 'DATETIME2' },
        { name: 'last_contact_at_clientify', type: 'DATETIME2' },
        { name: 'remarks', type: 'NVARCHAR(MAX)' },
        { name: 'summary', type: 'NVARCHAR(MAX)' },
        { name: 'raw_json', type: 'NVARCHAR(MAX)' },
        {
          name: 'synced_at',
          type: 'DATETIME2',
          defaultValue: 'SYSUTCDATETIME()',
          isNullable: false,
        },
      ],
      ['clientify_id'],
    );

    await this.ensureTable(
      this.tables.companies,
      [
        { name: 'clientify_id', type: 'INT', isNullable: false },
        { name: 'owner', type: 'NVARCHAR(255)' },
        { name: 'owner_id', type: 'INT' },
        { name: 'owner_name', type: 'NVARCHAR(255)' },
        { name: 'name', type: 'NVARCHAR(255)' },
        { name: 'email', type: 'NVARCHAR(255)' },
        { name: 'phone', type: 'NVARCHAR(100)' },
        { name: 'website', type: 'NVARCHAR(255)' },
        { name: 'industry', type: 'NVARCHAR(255)' },
        { name: 'company_size', type: 'NVARCHAR(100)' },
        { name: 'country', type: 'NVARCHAR(100)' },
        { name: 'city', type: 'NVARCHAR(100)' },
        { name: 'state', type: 'NVARCHAR(100)' },
        { name: 'status', type: 'NVARCHAR(100)' },
        { name: 'created_at_clientify', type: 'DATETIME2' },
        { name: 'modified_at_clientify', type: 'DATETIME2' },
        { name: 'last_contact_at_clientify', type: 'DATETIME2' },
        { name: 'taxpayer_identification_number', type: 'NVARCHAR(100)' },
        { name: 'raw_json', type: 'NVARCHAR(MAX)' },
        {
          name: 'synced_at',
          type: 'DATETIME2',
          defaultValue: 'SYSUTCDATETIME()',
          isNullable: false,
        },
      ],
      ['clientify_id'],
    );

    await this.ensureTable(
      this.tables.deals,
      [
        { name: 'clientify_id', type: 'INT', isNullable: false },
        { name: 'owner', type: 'NVARCHAR(255)' },
        { name: 'owner_id', type: 'INT' },
        { name: 'owner_name', type: 'NVARCHAR(255)' },
        { name: 'name', type: 'NVARCHAR(255)' },
        { name: 'amount', type: 'NVARCHAR(100)' },
        { name: 'amount_user', type: 'NVARCHAR(100)' },
        { name: 'currency', type: 'NVARCHAR(20)' },
        { name: 'status', type: 'NVARCHAR(50)' },
        { name: 'status_desc', type: 'NVARCHAR(100)' },
        { name: 'probability', type: 'INT' },
        { name: 'probability_desc', type: 'NVARCHAR(100)' },
        { name: 'pipeline_id', type: 'INT' },
        { name: 'pipeline', type: 'NVARCHAR(500)' },
        { name: 'pipeline_desc', type: 'NVARCHAR(255)' },
        { name: 'pipeline_stage_id', type: 'INT' },
        { name: 'pipeline_stage', type: 'NVARCHAR(500)' },
        { name: 'pipeline_stage_desc', type: 'NVARCHAR(255)' },
        { name: 'created_at_clientify', type: 'DATETIME2' },
        { name: 'modified_at_clientify', type: 'DATETIME2' },
        { name: 'expected_closed_date', type: 'DATE' },
        { name: 'actual_closed_date', type: 'DATE' },
        { name: 'expected_closed_date_iso', type: 'DATETIME2' },
        { name: 'actual_closed_date_iso', type: 'DATETIME2' },
        { name: 'contact_id', type: 'INT' },
        { name: 'contact', type: 'NVARCHAR(500)' },
        { name: 'contact_name', type: 'NVARCHAR(255)' },
        { name: 'contact_email', type: 'NVARCHAR(255)' },
        { name: 'contact_phone', type: 'NVARCHAR(100)' },
        { name: 'contact_medium', type: 'NVARCHAR(100)' },
        { name: 'contact_source', type: 'NVARCHAR(255)' },
        { name: 'company_id', type: 'INT' },
        { name: 'company', type: 'NVARCHAR(500)' },
        { name: 'company_name', type: 'NVARCHAR(255)' },
        { name: 'source', type: 'NVARCHAR(255)' },
        { name: 'deal_source_id', type: 'INT' },
        { name: 'deal_source', type: 'NVARCHAR(255)' },
        { name: 'remarks', type: 'NVARCHAR(MAX)' },
        { name: 'lost_reason', type: 'NVARCHAR(255)' },
        { name: 'won_deal_reason', type: 'NVARCHAR(255)' },
        { name: 'relevant_closed_date', type: 'DATETIME2' },
        { name: 'amount_currency', type: 'NVARCHAR(50)' },
        { name: 'operation_type', type: 'NVARCHAR(100)' },
        { name: 'raw_json', type: 'NVARCHAR(MAX)' },
        {
          name: 'synced_at',
          type: 'DATETIME2',
          defaultValue: 'SYSUTCDATETIME()',
          isNullable: false,
        },
      ],
      ['clientify_id'],
    );

    await this.ensureTable(
      this.tables.v1Calls,
      [
        { name: 'clientify_id', type: 'BIGINT', isNullable: false },
        { name: 'api_url', type: 'NVARCHAR(500)' },
        { name: 'owner_username', type: 'NVARCHAR(255)' },
        { name: 'content_object', type: 'NVARCHAR(255)' },
        { name: 'call_type', type: 'NVARCHAR(50)' },
        { name: 'comment', type: 'NVARCHAR(MAX)' },
        { name: 'outcome', type: 'NVARCHAR(100)' },
        { name: 'audio_url', type: 'NVARCHAR(500)' },
        { name: 'duration', type: 'DECIMAL(18,4)' },
        { name: 'created_at_clientify', type: 'DATETIME2' },
        { name: 'call_date', type: 'DATE' },
        { name: 'call_time', type: 'NVARCHAR(50)' },
        { name: 'raw_json', type: 'NVARCHAR(MAX)' },
        {
          name: 'synced_at',
          type: 'DATETIME2',
          defaultValue: 'SYSUTCDATETIME()',
          isNullable: false,
        },
      ],
      ['clientify_id'],
    );

    await this.ensureTable(
      this.tables.v1Users,
      [
        { name: 'clientify_id', type: 'BIGINT', isNullable: false },
        { name: 'api_url', type: 'NVARCHAR(500)' },
        { name: 'username', type: 'NVARCHAR(255)' },
        { name: 'first_name', type: 'NVARCHAR(255)' },
        { name: 'last_name', type: 'NVARCHAR(255)' },
        { name: 'full_name', type: 'NVARCHAR(255)' },
        { name: 'email', type: 'NVARCHAR(255)' },
        { name: 'company_id', type: 'BIGINT' },
        { name: 'company_name', type: 'NVARCHAR(255)' },
        { name: 'raw_json', type: 'NVARCHAR(MAX)' },
        {
          name: 'synced_at',
          type: 'DATETIME2',
          defaultValue: 'SYSUTCDATETIME()',
          isNullable: false,
        },
      ],
      ['clientify_id'],
    );

    await this.ensureTable(
      this.tables.v1Tasks,
      [
        { name: 'clientify_id', type: 'BIGINT', isNullable: false },
        { name: 'api_url', type: 'NVARCHAR(500)' },
        { name: 'name', type: 'NVARCHAR(255)' },
        { name: 'due_date', type: 'DATETIME2' },
        { name: 'assigned_to', type: 'NVARCHAR(255)' },
        { name: 'remarks', type: 'NVARCHAR(MAX)' },
        { name: 'description', type: 'NVARCHAR(MAX)' },
        { name: 'location', type: 'NVARCHAR(255)' },
        { name: 'additional_options', type: 'NVARCHAR(MAX)' },
        { name: 'owner', type: 'NVARCHAR(255)' },
        { name: 'status', type: 'NVARCHAR(100)' },
        { name: 'status_desc', type: 'NVARCHAR(100)' },
        { name: 'task_type', type: 'NVARCHAR(500)' },
        { name: 'related_contacts', type: 'NVARCHAR(MAX)' },
        { name: 'related_companies', type: 'NVARCHAR(MAX)' },
        { name: 'related_deals', type: 'NVARCHAR(MAX)' },
        { name: 'guest_users', type: 'NVARCHAR(MAX)' },
        { name: 'created_at_clientify', type: 'DATETIME2' },
        { name: 'modified_at_clientify', type: 'DATETIME2' },
        { name: 'raw_json', type: 'NVARCHAR(MAX)' },
        {
          name: 'synced_at',
          type: 'DATETIME2',
          defaultValue: 'SYSUTCDATETIME()',
          isNullable: false,
        },
      ],
      ['clientify_id'],
    );

    await this.ensureTable(
      this.tables.v1TaskTypes,
      [
        { name: 'clientify_id', type: 'BIGINT', isNullable: false },
        { name: 'api_url', type: 'NVARCHAR(500)' },
        { name: 'name', type: 'NVARCHAR(255)' },
        { name: 'raw_json', type: 'NVARCHAR(MAX)' },
        {
          name: 'synced_at',
          type: 'DATETIME2',
          defaultValue: 'SYSUTCDATETIME()',
          isNullable: false,
        },
      ],
      ['clientify_id'],
    );

    await this.ensureTable(
      this.tables.v1TaskStages,
      [
        { name: 'clientify_id', type: 'BIGINT', isNullable: false },
        { name: 'api_url', type: 'NVARCHAR(500)' },
        { name: 'name', type: 'NVARCHAR(255)' },
        { name: 'task_type', type: 'NVARCHAR(500)' },
        { name: 'raw_json', type: 'NVARCHAR(MAX)' },
        {
          name: 'synced_at',
          type: 'DATETIME2',
          defaultValue: 'SYSUTCDATETIME()',
          isNullable: false,
        },
      ],
      ['clientify_id'],
    );

    await this.ensureTable(
      this.tables.v1DealPipelines,
      [
        { name: 'clientify_id', type: 'BIGINT', isNullable: false },
        { name: 'api_url', type: 'NVARCHAR(500)' },
        { name: 'name', type: 'NVARCHAR(255)' },
        { name: 'is_default', type: 'BIT' },
        { name: 'user_default', type: 'BIT' },
        { name: 'raw_json', type: 'NVARCHAR(MAX)' },
        {
          name: 'synced_at',
          type: 'DATETIME2',
          defaultValue: 'SYSUTCDATETIME()',
          isNullable: false,
        },
      ],
      ['clientify_id'],
    );

    await this.ensureTable(
      this.tables.v1PipelineStages,
      [
        { name: 'clientify_id', type: 'BIGINT', isNullable: false },
        { name: 'api_url', type: 'NVARCHAR(500)' },
        { name: 'name', type: 'NVARCHAR(255)' },
        { name: 'position', type: 'INT' },
        { name: 'probability', type: 'INT' },
        { name: 'pipeline', type: 'NVARCHAR(500)' },
        { name: 'raw_json', type: 'NVARCHAR(MAX)' },
        {
          name: 'synced_at',
          type: 'DATETIME2',
          defaultValue: 'SYSUTCDATETIME()',
          isNullable: false,
        },
      ],
      ['clientify_id'],
    );
  }

  async insertSyncRun(triggerType: string) {
    const result = await this.query<{
      id: number;
    }>(
      `INSERT INTO dbo.[${this.tables.syncRuns}] (
         trigger_type,
         status,
         started_at,
         contacts_synced,
         companies_synced,
         deals_synced,
         v1_calls_synced,
         v1_users_synced,
         v1_tasks_synced,
         v1_task_types_synced,
         v1_task_stages_synced,
         v1_deal_pipelines_synced,
         v1_pipeline_stages_synced
       )
       OUTPUT INSERTED.id
       VALUES (@trigger_type, @status, SYSUTCDATETIME(), 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)`,
      [
        { name: 'trigger_type', type: sql.NVarChar(32), value: triggerType },
        { name: 'status', type: sql.NVarChar(32), value: 'running' },
      ],
    );

    return result.recordset[0]?.id ?? 0;
  }

  async markSyncRunCompleted(
    runId: number,
    totals: {
      companies: number;
      contacts: number;
      deals: number;
      v1Calls: number;
      v1Users: number;
      v1Tasks: number;
      v1TaskTypes: number;
      v1TaskStages: number;
      v1DealPipelines: number;
      v1PipelineStages: number;
    },
  ) {
    await this.query(
      `UPDATE dbo.[${this.tables.syncRuns}]
       SET status = @status,
           finished_at = SYSUTCDATETIME(),
           contacts_synced = @contacts_synced,
           companies_synced = @companies_synced,
           deals_synced = @deals_synced,
           v1_calls_synced = @v1_calls_synced,
           v1_users_synced = @v1_users_synced,
           v1_tasks_synced = @v1_tasks_synced,
           v1_task_types_synced = @v1_task_types_synced,
           v1_task_stages_synced = @v1_task_stages_synced,
           v1_deal_pipelines_synced = @v1_deal_pipelines_synced,
           v1_pipeline_stages_synced = @v1_pipeline_stages_synced
       WHERE id = @id`,
      [
        { name: 'id', type: sql.Int, value: runId },
        { name: 'status', type: sql.NVarChar(32), value: 'completed' },
        { name: 'contacts_synced', type: sql.Int, value: totals.contacts },
        { name: 'companies_synced', type: sql.Int, value: totals.companies },
        { name: 'deals_synced', type: sql.Int, value: totals.deals },
        { name: 'v1_calls_synced', type: sql.Int, value: totals.v1Calls },
        { name: 'v1_users_synced', type: sql.Int, value: totals.v1Users },
        { name: 'v1_tasks_synced', type: sql.Int, value: totals.v1Tasks },
        {
          name: 'v1_task_types_synced',
          type: sql.Int,
          value: totals.v1TaskTypes,
        },
        {
          name: 'v1_task_stages_synced',
          type: sql.Int,
          value: totals.v1TaskStages,
        },
        {
          name: 'v1_deal_pipelines_synced',
          type: sql.Int,
          value: totals.v1DealPipelines,
        },
        {
          name: 'v1_pipeline_stages_synced',
          type: sql.Int,
          value: totals.v1PipelineStages,
        },
      ],
    );
  }

  async markSyncRunFailed(runId: number, errorMessage: string) {
    await this.query(
      `UPDATE dbo.[${this.tables.syncRuns}]
       SET status = @status,
           finished_at = SYSUTCDATETIME(),
           error_message = @error_message
       WHERE id = @id`,
      [
        { name: 'id', type: sql.Int, value: runId },
        { name: 'status', type: sql.NVarChar(32), value: 'failed' },
        {
          name: 'error_message',
          type: sql.NVarChar(sql.MAX),
          value: errorMessage,
        },
      ],
    );
  }

  async query<T = unknown>(
    query: string,
    params: Array<{
      name: string;
      type: sql.ISqlTypeFactory | sql.ISqlType;
      value: unknown;
    }> = [],
  ) {
    const pool = await this.getPool();
    const request = pool.request();

    for (const param of params) {
      request.input(param.name, param.type as sql.ISqlTypeFactory, param.value);
    }

    return request.query<T>(query);
  }

  async upsert(tableName: string, row: Record<string, unknown>) {
    const entries = Object.entries(row);
    const mergeParams = entries.map(([column], index) => ({
      column,
      parameterName: `p${index}`,
    }));

    const sourceColumns = mergeParams
      .map(({ column }) => `[${column}]`)
      .join(', ');
    const sourceValues = mergeParams
      .map(({ parameterName }) => `@${parameterName}`)
      .join(', ');
    const updateAssignments = mergeParams
      .filter(({ column }) => column !== 'clientify_id')
      .map(({ column }) => `TARGET.[${column}] = SOURCE.[${column}]`)
      .join(', ');
    const insertColumns = sourceColumns;
    const insertValues = mergeParams
      .map(({ column }) => `SOURCE.[${column}]`)
      .join(', ');

    const query = `
      MERGE dbo.[${tableName}] AS TARGET
      USING (SELECT ${sourceValues}) AS SOURCE (${sourceColumns})
      ON TARGET.[clientify_id] = SOURCE.[clientify_id]
      WHEN MATCHED THEN
        UPDATE SET ${updateAssignments}
      WHEN NOT MATCHED THEN
        INSERT (${insertColumns})
        VALUES (${insertValues});`;

    await this.query(
      query,
      mergeParams.map(({ column, parameterName }) => {
        const value = this.normalizeSqlValue(row[column]);

        return {
          name: parameterName,
          type: this.inferSqlType(value),
          value,
        };
      }),
    );
  }

  private async columnExists(tableName: string, columnName: string) {
    const result = await this.query<{ total: number }>(
      `SELECT COUNT(1) AS total
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @table_name AND COLUMN_NAME = @column_name`,
      [
        { name: 'table_name', type: sql.NVarChar(128), value: tableName },
        { name: 'column_name', type: sql.NVarChar(128), value: columnName },
      ],
    );

    return Number(result.recordset[0]?.total ?? 0) > 0;
  }

  private async ensureTable(
    tableName: string,
    columns: SqlColumnDefinition[],
    uniqueColumns: string[],
  ) {
    const tableExists = await this.query<{ total: number }>(
      `SELECT COUNT(1) AS total
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @table_name`,
      [{ name: 'table_name', type: sql.NVarChar(128), value: tableName }],
    );

    if (Number(tableExists.recordset[0]?.total ?? 0) === 0) {
      const createColumns = columns
        .map(
          (column) =>
            `[${column.name}] ${column.type}${column.isNullable === false ? ' NOT NULL' : ' NULL'}${
              column.defaultValue ? ` DEFAULT ${column.defaultValue}` : ''
            }`,
        )
        .join(', ');

      await this.query(`CREATE TABLE dbo.[${tableName}] (${createColumns})`);

      if (uniqueColumns.length > 0) {
        await this.query(
          `CREATE UNIQUE INDEX IX_${tableName}_${uniqueColumns.join('_')} ON dbo.[${tableName}] (${uniqueColumns
            .map((column) => `[${column}]`)
            .join(', ')})`,
        );
      }

      return;
    }

    for (const column of columns) {
      const exists = await this.columnExists(tableName, column.name);
      if (!exists) {
        await this.query(
          `ALTER TABLE dbo.[${tableName}] ADD [${column.name}] ${column.type}${
            column.defaultValue ? ` DEFAULT ${column.defaultValue}` : ''
          } ${column.isNullable === false ? 'NOT NULL' : 'NULL'}`,
        );
      }
    }
  }

  private inferSqlType(value: unknown): sql.ISqlTypeFactory | sql.ISqlType {
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        return value > 2147483647 || value < -2147483648 ? sql.BigInt : sql.Int;
      }

      return sql.Decimal(18, 4);
    }

    if (typeof value === 'boolean') {
      return sql.Bit;
    }

    if (value instanceof Date) {
      return sql.DateTime2;
    }

    return sql.NVarChar(sql.MAX);
  }

  private normalizeSqlValue(value: unknown) {
    if (value === undefined) {
      return null;
    }

    if (
      value === null ||
      value instanceof Date ||
      ['string', 'number', 'boolean'].includes(typeof value)
    ) {
      return value;
    }

    return JSON.stringify(value);
  }

  private async getPool() {
    if (this.pool) {
      return this.pool;
    }

    const configuredHost = this.configService
      .get<string>('SQL_SERVER_HOST')!
      .replace(/\\+/g, '\\')
      .trim();
    const [serverHost, ...instanceSegments] = configuredHost.split('\\');
    const instanceName = instanceSegments.join('\\').trim();
    const configuredPort = Number(
      this.configService.get<number>('SQL_SERVER_PORT', 1433),
    );

    const pool = new sql.ConnectionPool({
      server: serverHost,
      port: instanceName ? undefined : configuredPort,
      user: this.configService.get<string>('SQL_SERVER_USER')!,
      password: this.configService.get<string>('SQL_SERVER_PASSWORD')!,
      database: this.configService.get<string>('SQL_SERVER_DATABASE')!,
      options: {
        encrypt: Boolean(
          this.configService.get<boolean>('SQL_SERVER_ENCRYPT', true),
        ),
        instanceName: instanceName || undefined,
        trustServerCertificate: Boolean(
          this.configService.get<boolean>(
            'SQL_SERVER_TRUST_SERVER_CERTIFICATE',
            true,
          ),
        ),
      },
    });

    this.pool = await pool.connect();
    this.logger.log('SQL Server connection established');
    return this.pool;
  }
}
