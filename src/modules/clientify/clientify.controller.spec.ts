import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { InternalApiKeyGuard } from '../../common/guards/internal-api-key.guard';
import { ClientifyController } from './clientify.controller';
import { ClientifyService } from './clientify.service';

describe('ClientifyController', () => {
  let controller: ClientifyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientifyController],
      providers: [
        {
          provide: ClientifyService,
          useValue: {},
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test') },
        },
        InternalApiKeyGuard,
      ],
    }).compile();

    controller = module.get<ClientifyController>(ClientifyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
