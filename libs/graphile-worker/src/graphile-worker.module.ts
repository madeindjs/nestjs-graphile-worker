import { DynamicModule, Module, Provider } from '@nestjs/common';
import {
  GraphileWorkerAsyncConfiguration,
  GraphileWorkerConfiguration,
  GraphileWorkerConfigurationFactory,
} from './config.interface';
import { GraphileWorkerService } from './graphile-worker.service';

export const GRAPHILE_WORKER_TOKEN = Symbol.for('NestJsGraphileWorker');

@Module({
  providers: [GraphileWorkerService],
  exports: [GraphileWorkerService],
})
export class GraphileWorkerModule {
  /**
   * Registers a globally available `GraphileWorkerService`.
   */
  static forRoot(config: GraphileWorkerConfiguration): DynamicModule {
    const graphileWorkerService: Provider = {
      provide: GraphileWorkerService,
      useValue: new GraphileWorkerService(config),
    };

    return {
      global: true,
      module: GraphileWorkerModule,
      providers: [graphileWorkerService],
      exports: [graphileWorkerService],
    };
  }

  static forRootAsync(
    asyncConfig: GraphileWorkerAsyncConfiguration,
  ): DynamicModule {
    const providers = this.createAsyncSharedConfigurationProviders(asyncConfig);

    return {
      global: true,
      module: GraphileWorkerModule,
      imports: asyncConfig.imports,
      providers,
      exports: providers,
    };
  }

  private static createAsyncSharedConfigurationProviders(
    options: GraphileWorkerAsyncConfiguration,
  ): Provider[] {
    return [this.createAsyncSharedConfigurationProvider(options)];
  }

  private static createAsyncSharedConfigurationProvider(
    options: GraphileWorkerAsyncConfiguration,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: GraphileWorkerService,
        useFactory: async (...args: any[]) => {
          const configuration = await options.useFactory(...args);
          return new GraphileWorkerService(configuration);
        },
        inject: options.inject || [],
      };
    }

    return {
      provide: GraphileWorkerService,
      useFactory: async (
        optionsFactory: GraphileWorkerConfigurationFactory,
      ) => {
        const configuration = await optionsFactory.createSharedConfiguration();

        return new GraphileWorkerService(configuration);
      },
      inject: options.inject,
    };
  }
}
