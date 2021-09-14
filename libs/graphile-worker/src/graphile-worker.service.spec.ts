import { Test, TestingModule } from '@nestjs/testing';
import {
  ConfigurationService,
  CONFIGURATION_SERVICE_KEY,
} from './configuration.service';
import { GraphileWorkerService } from './graphile-worker.service';
import { ListenerExplorerService } from './listener-explorer.service';

describe(GraphileWorkerService.name, () => {
  let service: GraphileWorkerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GraphileWorkerService,
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

    service = module.get<GraphileWorkerService>(GraphileWorkerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
