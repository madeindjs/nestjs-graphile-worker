import { DynamicModule, Module, Provider } from '@nestjs/common';
import { GraphileWorkerService } from './graphile-worker.service';

export const GRAPHILE_WORKER_TOKEN = Symbol.for('NestJsGraphileWorker');

@Module({
  providers: [GraphileWorkerService],
  exports: [GraphileWorkerService],
})
export class GraphileWorkerModule {
  /**
   *
   * @param connectionString `${env.TYPEORM_CONNECTION}://${env.TYPEORM_USERNAME}:${env.TYPEORM_PASSWORD}@${env.TYPEORM_HOST}/${env.TYPEORM_DATABASE}`
  }
   * @returns
   */
  static forRoot(connectionString: string): DynamicModule {
    const graphileWorkerService: Provider = {
      provide: GraphileWorkerService,
      useValue: new GraphileWorkerService(connectionString),
    };

    return {
      global: true,
      module: GraphileWorkerModule,
      providers: [graphileWorkerService],
      exports: [graphileWorkerService],
    };
  }
}
