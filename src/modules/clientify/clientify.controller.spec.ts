import { Test, TestingModule } from '@nestjs/testing';
import { ClientifyController } from './clientify.controller';

describe('ClientifyController', () => {
  let controller: ClientifyController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientifyController],
    }).compile();

    controller = module.get<ClientifyController>(ClientifyController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
