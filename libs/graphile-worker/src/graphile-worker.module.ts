import { DynamicModule, Module, Provider } from '@nestjs/common';
import { WorkerUtilsOptions } from 'graphile-worker';
import { GraphileWorkerService } from './graphile-worker.service';

export const GRAPHILE_WORKER_TOKEN = Symbol.for('NestJsGraphileWorker');

@Module({
  providers: [GraphileWorkerService],
  exports: [GraphileWorkerService],
})
export class GraphileWorkerModule {
  static forRoot(options: WorkerUtilsOptions): DynamicModule;
  static forRoot(connectionString: string): DynamicModule;
  static forRoot(connectionStringOrOptions: unknown): DynamicModule {
    let options: WorkerUtilsOptions = {};

    if (typeof connectionStringOrOptions === 'string') {
      options.connectionString = connectionStringOrOptions;
    } else if (isWorkerUtilsOptions(connectionStringOrOptions)) {
      options = connectionStringOrOptions;
    } else {
      throw Error(
        'Cannot detect type of option provided for `GraphileWorkerModule.forRoot()`',
      );
    }

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

function isWorkerUtilsOptions(options: unknown): options is WorkerUtilsOptions {
  return (options as WorkerUtilsOptions).connectionString !== undefined;
}
