import { DynamicModule, Module, Provider } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { EventEmitter } from 'events';
import { RunnerOptions } from 'graphile-worker';
import {
  GraphileWorkerAsyncConfiguration,
  GraphileWorkerConfiguration,
  GraphileWorkerConfigurationFactory,
  RUNNER_OPTIONS_KEY,
} from './interfaces/module-config.interfaces';
import { ListenerExplorerService } from './services/listener-explorer.service';
import { MetadataAccessorService } from './services/metadata-accessor.service';
import { WorkerService } from './services/worker.service';

export const GRAPHILE_WORKER_TOKEN = Symbol.for('NestJsGraphileWorker');

const internalsProviders = [
  MetadataAccessorService,
  ListenerExplorerService,
  WorkerService,
];

const internalsModules = [DiscoveryModule];

@Module({
  providers: [WorkerService],
  exports: [WorkerService],
})
export class GraphileWorkerModule {
  /**
   * Registers a globally available `WorkerService`.
   *
   * Example:
   *
   * ```ts
   *  GraphileWorkerModule.forRoot({
   *   connectionString: 'postgres://example:password@postgres/example',
   *   taskList: {
   *     hello: helloTask,
   *   },
   *  }),
   * ```
   */
  static forRoot(config: GraphileWorkerConfiguration): DynamicModule {
    const graphileConfigurationServiceProvider: Provider = {
      provide: RUNNER_OPTIONS_KEY,
      useValue: config,
    };

    return {
      global: true,
      imports: internalsModules,
      module: GraphileWorkerModule,
      providers: [graphileConfigurationServiceProvider, ...internalsProviders],
      exports: [WorkerService],
    };
  }

  /**
   * Registers a globally available `WorkerService`.
   *
   * Example:
   *
   * ```ts
   * GraphileWorkerModule.forRootAsync({
   *   imports: [ConfigModule],
   *   inject: [ConfigService],
   *   useFactory: (config: ConfigService) => ({
   *     connectionString: config.get('PG_CONNECTION'),
   *     taskList: {
   *       hello: helloTask,
   *     },
   *   }),
   *  }),
   * ```
   */
  static forRootAsync(
    asyncConfig: GraphileWorkerAsyncConfiguration,
  ): DynamicModule {
    const providers = this.createAsyncSharedConfigurationProviders(asyncConfig);

    return {
      global: true,
      module: GraphileWorkerModule,
      imports: [...asyncConfig.imports, ...internalsModules],
      providers: [...providers, ...internalsProviders],
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
        provide: RUNNER_OPTIONS_KEY,
        inject: options.inject || [],
        useFactory: async (...args: any[]) => {
          const config = await options.useFactory(...args);
          return buildRunnerOptions(config);
        },
      };
    }

    return {
      provide: RUNNER_OPTIONS_KEY,
      inject: options.inject,
      useFactory: async (
        optionsFactory: GraphileWorkerConfigurationFactory,
      ) => {
        const config = await optionsFactory.createSharedConfiguration();
        return buildRunnerOptions(config);
      },
    };
  }
}

function buildRunnerOptions(
  configuration: GraphileWorkerConfiguration,
): RunnerOptions {
  const events = new EventEmitter();

  return {
    ...configuration,
    events,
  };
}
