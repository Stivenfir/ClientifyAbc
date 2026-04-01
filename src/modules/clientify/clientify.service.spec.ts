import { Test, TestingModule } from '@nestjs/testing';
import { ClientifyService } from './clientify.service';

describe('ClientifyService', () => {
  let service: ClientifyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClientifyService],
    }).compile();

    service = module.get<ClientifyService>(ClientifyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
