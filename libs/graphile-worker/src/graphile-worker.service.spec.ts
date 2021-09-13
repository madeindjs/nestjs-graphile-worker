import { Test, TestingModule } from '@nestjs/testing';
import { GraphileWorkerService } from './graphile-worker.service';

describe('GraphileWorkerService', () => {
  let service: GraphileWorkerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GraphileWorkerService],
    }).compile();

    service = module.get<GraphileWorkerService>(GraphileWorkerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
