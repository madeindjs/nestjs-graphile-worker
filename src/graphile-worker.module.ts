import { DynamicModule, Module, Provider } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { EventEmitter } from 'node:events';
import { RunnerOptions } from 'graphile-worker';
import {
  GraphileWorkerAsyncConfiguration,
  GraphileWorkerConfiguration,
  RUNNER_OPTIONS_KEY,
  GLOBAL_JOB_MIDDLEWARES_KEY,
} from './interfaces/module-config.interfaces';
import { ListenerExplorerService } from './services/listener-explorer.service';
import { MetadataAccessorService } from './services/metadata-accessor.service';
import { MiddlewareService } from './services/middleware.service';
import { TaskExplorerService } from './services/task-explorer.service';
import { WorkerService } from './services/worker.service';
import { RunnerLogger } from './utils/graphile-worker-logger.utils';

export const GRAPHILE_WORKER_TOKEN = Symbol.for('NestJsGraphileWorker');

const internalsProviders = [
  MetadataAccessorService,
  ListenerExplorerService,
  TaskExplorerService,
  MiddlewareService,
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
   *  }),
   * ```
   */
  static forRoot(config: GraphileWorkerConfiguration): DynamicModule {
    const graphileConfigurationServiceProvider: Provider = {
      provide: RUNNER_OPTIONS_KEY,
      useValue: buildRunnerOptions(config),
    };

    const globalJobMiddlewaresProvider: Provider = {
      provide: GLOBAL_JOB_MIDDLEWARES_KEY,
      useValue: config.middlewares || [],
    };

    return {
      global: true,
      imports: internalsModules,
      module: GraphileWorkerModule,
      providers: [
        graphileConfigurationServiceProvider,
        globalJobMiddlewaresProvider,
        ...internalsProviders,
      ],
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
   *   }),
   *  }),
   * ```
   */
  static forRootAsync(
    asyncConfig: GraphileWorkerAsyncConfiguration,
  ): DynamicModule {
    const providers = this.createAsyncSharedConfigurationProviders(asyncConfig);

    const configImports = asyncConfig.imports ?? [];

    return {
      global: true,
      module: GraphileWorkerModule,
      imports: [...configImports, ...internalsModules],
      providers: [...providers, ...internalsProviders],
      exports: [WorkerService],
    };
  }

  private static createAsyncSharedConfigurationProviders(
    options: GraphileWorkerAsyncConfiguration,
  ): Provider[] {
    return [
      this.createAsyncRunnerOptionsProvider(options),
      this.createAsyncMiddlewaresProvider(options),
    ];
  }

  private static createAsyncRunnerOptionsProvider(
    options: GraphileWorkerAsyncConfiguration,
  ): Provider {
    return {
      provide: RUNNER_OPTIONS_KEY,
      inject: options.inject || [],
      useFactory: async (...args: any[]) => {
        const config = await options.useFactory(...args);
        return buildRunnerOptions(config);
      },
    };
  }

  private static createAsyncMiddlewaresProvider(
    options: GraphileWorkerAsyncConfiguration,
  ): Provider {
    return {
      provide: GLOBAL_JOB_MIDDLEWARES_KEY,
      inject: options.inject || [],
      useFactory: async (...args: any[]) => {
        const config = await options.useFactory(...args);
        return config.middlewares || [];
      },
    };
  }
}

function buildRunnerOptions(
  configuration: GraphileWorkerConfiguration,
): RunnerOptions {
  const events = new EventEmitter();

  const { middlewares, ...runnerConfig } = configuration;

  return {
    logger: RunnerLogger,
    ...runnerConfig,
    events,
  };
}
