import { Test, TestingModule } from '@nestjs/testing';
import {
  ConfigurationService,
  CONFIGURATION_SERVICE_KEY,
} from './configuration.service';
import { ListenerExplorerService } from './listener-explorer.service';
import { WorkerService } from './worker.service';

describe(WorkerService.name, () => {
  let service: WorkerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkerService,
        {
          provide: ListenerExplorerService,
          useValue: {
            listeners: [],
          },
        },
        {
          useFactory: () => {
            const configurationService = new ConfigurationService({
              taskList: { hello: () => {} },
              connectionString: 'postgres://example:password@postgres/example',
            });
            return configurationService;
          },
          provide: CONFIGURATION_SERVICE_KEY,
        },
      ],
    }).compile();

    service = module.get<WorkerService>(WorkerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
