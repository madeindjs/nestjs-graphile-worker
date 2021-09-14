import { DynamicModule, Module, Provider } from '@nestjs/common';
import { RunnerOptions } from 'graphile-worker';
import { GraphileWorkerService } from './graphile-worker.service';

export const GRAPHILE_WORKER_TOKEN = Symbol.for('NestJsGraphileWorker');

@Module({
  providers: [GraphileWorkerService],
  exports: [GraphileWorkerService],
})
export class GraphileWorkerModule {
  static forRoot(options: RunnerOptions): DynamicModule {
    const graphileWorkerService: Provider = {
      provide: GraphileWorkerService,
      useValue: new GraphileWorkerService(options),
    };

    return {
      global: true,
      module: GraphileWorkerModule,
      providers: [graphileWorkerService],
      exports: [graphileWorkerService],
    };
  }
}
