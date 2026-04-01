import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { ClientifyService } from './clientify.service';

describe('ClientifyService', () => {
  let service: ClientifyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientifyService,
        {
          provide: HttpService,
          useValue: {
            request: jest.fn().mockReturnValue(of({ data: {} })),
          },
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
});
