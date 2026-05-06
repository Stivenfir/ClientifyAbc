import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { ClientifyService } from './clientify.service';

describe('ClientifyService', () => {
  let service: ClientifyService;
  let httpService: { request: jest.Mock };

  beforeEach(async () => {
    httpService = {
      request: jest.fn().mockReturnValue(of({ data: {} })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientifyService,
        {
          provide: HttpService,
          useValue: httpService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest
              .fn()
              .mockImplementation((key: string) =>
                key === 'CLIENTIFY_BASE_URL'
                  ? 'https://app.clientify.net/api/v2'
                  : 'token',
              ),
          },
        },
      ],
    }).compile();

    service = module.get<ClientifyService>(ClientifyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('maps operationType from deal custom fields into the open opportunities response', async () => {
    jest.spyOn(service, 'getDealPipelines').mockResolvedValue({
      results: [
        {
          id: 85494,
          name: 'Mudanzas',
          stages: [{ id: 376784, name: 'En costeo' }],
        },
      ],
    });

    httpService.request.mockReturnValueOnce(
      of({
        data: {
          next: null,
          results: [
            {
              id: 28351035,
              name: 'Zinthia Arias-Expo-Arequipa Perú',
              status: 1,
              pipeline_id: 85494,
              pipeline_stage_id: 376784,
              contact_id: 154237737,
              custom_fields: [
                {
                  field: 'Tipo de operación',
                  value: 'Agente',
                },
              ],
            },
          ],
        },
      }),
    );

    jest.spyOn(service, 'getContactById').mockResolvedValue({
      id: 154237737,
      firstName: 'Zinthia',
      lastName: 'Arias',
      fullName: 'Zinthia Arias',
      email: null,
      phone: null,
      companyId: 11244900,
      companyName: 'PERSONAS NATURALES COTIZACIONES - ABC MUDANZAS',
      status: 'client',
      title: '',
      created: '2026-04-08T08:13:56.378024-05:00',
      remarks: '',
      summary: '',
    });

    const response = await service.getClientsWithOpenOpportunities({
      pipeline: 'mudanzas',
      stage: 'en costeo',
      pageSize: 100,
    });

    expect(response.criteria).toMatchObject({
      pipelineId: 85494,
      pipelineStageId: 376784,
      operationType: null,
    });
    expect(response.totalDealsMatched).toBe(1);
    expect(response.totalClientsMatched).toBe(1);
    expect(response.clients).toEqual([
      expect.objectContaining({
        id: 154237737,
        operationType: 'Agente',
        operationTypes: ['Agente'],
        openOpportunities: [
          expect.objectContaining({
            id: 28351035,
            operationType: 'Agente',
            customFields: [
              expect.objectContaining({
                field: 'Tipo de operación',
                value: 'Agente',
              }),
            ],
          }),
        ],
      }),
    ]);
  });

  it('filters open opportunities by operationType when requested', async () => {
    jest.spyOn(service, 'getDealPipelines').mockResolvedValue({
      results: [
        {
          id: 85494,
          name: 'Mudanzas',
          stages: [{ id: 376784, name: 'En costeo' }],
        },
      ],
    });

    httpService.request.mockReturnValueOnce(
      of({
        data: {
          next: null,
          results: [
            {
              id: 1,
              name: 'Deal agente',
              status: 1,
              pipeline_id: 85494,
              pipeline_stage_id: 376784,
              contact_id: 10,
              custom_fields: [
                {
                  field: 'Tipo de operación',
                  value: 'Agente',
                },
              ],
            },
            {
              id: 2,
              name: 'Deal corporativo',
              status: 1,
              pipeline_id: 85494,
              pipeline_stage_id: 376784,
              contact_id: 20,
              custom_fields: [
                {
                  field: 'Tipo de operación',
                  value: 'Corporativo',
                },
              ],
            },
          ],
        },
      }),
    );

    jest
      .spyOn(service, 'getContactById')
      .mockImplementation(async (id: number) => ({
        id,
        firstName: id === 10 ? 'Zinthia' : 'Natalia',
        lastName: 'Demo',
        fullName: id === 10 ? 'Zinthia Demo' : 'Natalia Demo',
        email: null,
        phone: null,
        companyId: 11244900,
        companyName: 'ABC MUDANZAS',
        status: 'client',
        title: '',
        created: '2026-04-08T08:13:56.378024-05:00',
        remarks: '',
        summary: '',
      }));

    const response = await service.getClientsWithOpenOpportunities({
      pipeline: 'mudanzas',
      stage: 'en costeo',
      operationType: 'agente',
      pageSize: 100,
    });

    expect(response.criteria.operationType).toBe('agente');
    expect(response.totalDealsMatched).toBe(1);
    expect(response.totalClientsMatched).toBe(1);
    expect(response.clients).toHaveLength(1);
    expect(response.clients[0]).toEqual(
      expect.objectContaining({
        id: 10,
        operationType: 'Agente',
        operationTypes: ['Agente'],
      }),
    );
    expect(response.clients[0].openOpportunities).toEqual([
      expect.objectContaining({
        id: 1,
        operationType: 'Agente',
      }),
    ]);
  });

  it('caps provider page size at 100 even when the consumer sends 200', async () => {
    const getDealPipelinesSpy = jest
      .spyOn(service, 'getDealPipelines')
      .mockResolvedValue({
        results: [
          {
            id: 85494,
            name: 'Mudanzas',
            stages: [{ id: 376784, name: 'En costeo' }],
          },
        ],
      });

    httpService.request.mockReturnValueOnce(
      of({
        data: {
          next: null,
          results: [
            {
              id: 3,
              name: 'Deal capped',
              status: 1,
              pipeline_id: 85494,
              pipeline_stage_id: 376784,
              contact_id: 30,
              custom_fields: [],
            },
          ],
        },
      }),
    );

    jest.spyOn(service, 'getContactById').mockResolvedValue({
      id: 30,
      firstName: 'Cliente',
      lastName: 'Demo',
      fullName: 'Cliente Demo',
      email: null,
      phone: null,
      companyId: 11244900,
      companyName: 'ABC MUDANZAS',
      status: 'client',
      title: '',
      created: '2026-04-08T08:13:56.378024-05:00',
      remarks: '',
      summary: '',
    });

    await service.getClientsWithOpenOpportunities({
      pipeline: 'mudanzas',
      stage: 'en costeo',
      pageSize: 200,
    });

    expect(getDealPipelinesSpy).toHaveBeenCalledWith({
      page: 1,
      pageSize: 100,
    });
    expect(httpService.request).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({
          page_size: 100,
        }),
      }),
    );
  });

  it('adds company nit from the company custom fields into each client', async () => {
    jest.spyOn(service, 'getDealPipelines').mockResolvedValue({
      results: [
        {
          id: 85494,
          name: 'Mudanzas',
          stages: [{ id: 376784, name: 'En costeo' }],
        },
      ],
    });

    httpService.request.mockReturnValueOnce(
      of({
        data: {
          next: null,
          results: [
            {
              id: 4,
              name: 'Deal con nit',
              status: 1,
              pipeline_id: 85494,
              pipeline_stage_id: 376784,
              contact_id: 40,
              company_id: 11244900,
              custom_fields: [],
            },
          ],
        },
      }),
    );

    jest.spyOn(service, 'getContactById').mockResolvedValue({
      id: 40,
      firstName: 'Cliente',
      lastName: 'Nit',
      fullName: 'Cliente Nit',
      email: null,
      phone: null,
      companyId: 11244900,
      companyName: 'ABC MUDANZAS',
      status: 'client',
      title: '',
      created: '2026-04-08T08:13:56.378024-05:00',
      remarks: '',
      summary: '',
    });

    jest.spyOn(service, 'getCompanyById').mockResolvedValue({
      id: 11244900,
      name: 'ABC MUDANZAS',
      custom_fields: [
        {
          field: 'Número de Documento',
          value: '900123456-7',
        },
      ],
    });

    const response = await service.getClientsWithOpenOpportunities({
      pipeline: 'mudanzas',
      stage: 'en costeo',
      pageSize: 100,
    });

    expect(response.clients).toEqual([
      expect.objectContaining({
        id: 40,
        nit: '900123456-7',
      }),
    ]);
  });

  it('prefers taxpayer_identification_number when the company detail exposes it', async () => {
    jest.spyOn(service, 'getDealPipelines').mockResolvedValue({
      results: [
        {
          id: 85494,
          name: 'Mudanzas',
          stages: [{ id: 376784, name: 'En costeo' }],
        },
      ],
    });

    httpService.request.mockReturnValueOnce(
      of({
        data: {
          next: null,
          results: [
            {
              id: 5,
              name: 'Deal con taxpayer id',
              status: 1,
              pipeline_id: 85494,
              pipeline_stage_id: 376784,
              contact_id: 50,
              company_id: 11246515,
              custom_fields: [],
            },
          ],
        },
      }),
    );

    jest.spyOn(service, 'getContactById').mockResolvedValue({
      id: 50,
      firstName: 'Cliente',
      lastName: 'Fiscal',
      fullName: 'Cliente Fiscal',
      email: null,
      phone: null,
      companyId: 11246515,
      companyName: 'EMBAJADA BRITANICA',
      status: 'client',
      title: '',
      created: '2026-04-08T08:13:56.378024-05:00',
      remarks: '',
      summary: '',
    });

    jest.spyOn(service, 'getCompanyById').mockResolvedValue({
      id: 11246515,
      name: 'EMBAJADA BRITANICA',
      taxpayer_identification_number: '800090980-1',
      custom_fields: [],
    });

    const response = await service.getClientsWithOpenOpportunities({
      pipeline: 'mudanzas',
      stage: 'en costeo',
      pageSize: 100,
    });

    expect(response.clients).toEqual([
      expect.objectContaining({
        id: 50,
        nit: '800090980-1',
        openOpportunities: [
          expect.objectContaining({
            id: 5,
            nit: '800090980-1',
          }),
        ],
      }),
    ]);
  });

  it('falls back to the opportunity company when the contact has no company assigned', async () => {
    jest.spyOn(service, 'getDealPipelines').mockResolvedValue({
      results: [
        {
          id: 85494,
          name: 'Mudanzas',
          stages: [{ id: 376784, name: 'En costeo' }],
        },
      ],
    });

    httpService.request.mockReturnValueOnce(
      of({
        data: {
          next: null,
          results: [
            {
              id: 26977070,
              name: 'Deal persona natural',
              status: 1,
              pipeline_id: 85494,
              pipeline_stage_id: 376784,
              contact_id: 142939547,
              company_id: 11246515,
              custom_fields: [
                {
                  field: 'Tipo de operación',
                  value: 'Persona natural',
                },
              ],
            },
          ],
        },
      }),
    );

    jest.spyOn(service, 'getContactById').mockResolvedValue({
      id: 142939547,
      firstName: 'riveiro',
      lastName: 'rodriguez',
      fullName: 'riveiro rodriguez',
      email: null,
      phone: null,
      companyId: null,
      companyName: null,
      status: 'lost-lead',
      title: '',
      created: '2026-01-23T15:43:11.159809-05:00',
      remarks: '',
      summary: '',
    });

    jest.spyOn(service, 'getCompanyById').mockResolvedValue({
      id: 11246515,
      name: 'COMPANIA DEMO SAS',
      custom_fields: [
        {
          field: 'Número de Documento',
          value: '901234567-8',
        },
      ],
    });

    const response = await service.getClientsWithOpenOpportunities({
      pipeline: 'mudanzas',
      stage: 'en costeo',
      pageSize: 100,
    });

    expect(response.clients).toEqual([
      expect.objectContaining({
        id: 142939547,
        companyId: 11246515,
        companyName: 'COMPANIA DEMO SAS',
        nit: '901234567-8',
        openOpportunities: [
          expect.objectContaining({
            id: 26977070,
            companyId: 11246515,
            companyName: 'COMPANIA DEMO SAS',
            nit: '901234567-8',
            operationType: 'Persona natural',
          }),
        ],
      }),
    ]);
  });
});
