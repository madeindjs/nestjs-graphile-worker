import { DynamicModule, Module, Provider } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import {
  GraphileWorkerAsyncConfiguration,
  GraphileWorkerConfigurationFactory,
  RunnerOptionWithoutEvents,
} from './config.interface';
import {
  ConfigurationService,
  CONFIGURATION_SERVICE_KEY,
} from './configuration.service';
import { GraphileWorkerService } from './graphile-worker.service';
import { ListenerExplorerService } from './listener-explorer.service';
import { MetadataAccessorService } from './metadata-accessor.service';

export const GRAPHILE_WORKER_TOKEN = Symbol.for('NestJsGraphileWorker');

const internalsProviders = [
  MetadataAccessorService,
  ListenerExplorerService,
  GraphileWorkerService,
];

const internalsModules = [DiscoveryModule];

@Module({
  providers: [GraphileWorkerService],
  exports: [GraphileWorkerService],
})
export class GraphileWorkerModule {
  /**
   * Registers a globally available `GraphileWorkerService`.
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
  static forRoot(config: RunnerOptionWithoutEvents): DynamicModule {
    const configurationService = new ConfigurationService(config);

    const graphileConfigurationServiceProvider: Provider = {
      provide: CONFIGURATION_SERVICE_KEY,
      useValue: configurationService,
    };

    return {
      global: true,
      imports: internalsModules,
      module: GraphileWorkerModule,
      providers: [graphileConfigurationServiceProvider, ...internalsProviders],
      exports: [GraphileWorkerService],
    };
  }

  /**
   * Registers a globally available `GraphileWorkerService`.
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
        provide: CONFIGURATION_SERVICE_KEY,
        useFactory: async (...args: any[]) => {
          const config = await options.useFactory(...args);
          return new ConfigurationService(config);
        },
        inject: options.inject || [],
      };
    }

    return {
      provide: CONFIGURATION_SERVICE_KEY,
      useFactory: async (
        optionsFactory: GraphileWorkerConfigurationFactory,
      ) => {
        const config = await optionsFactory.createSharedConfiguration();
        return new ConfigurationService(config);
      },
      inject: options.inject,
    };
  }
}
