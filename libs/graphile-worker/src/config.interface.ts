import { FactoryProvider, ModuleMetadata } from '@nestjs/common';
import { RunnerOptions } from 'graphile-worker';

export type GraphileWorkerConfiguration = RunnerOptions;

export interface GraphileWorkerConfigurationFactory {
  createSharedConfiguration():
    | Promise<GraphileWorkerConfiguration>
    | GraphileWorkerConfiguration;
}

export interface GraphileWorkerAsyncConfiguration
  extends Pick<ModuleMetadata, 'imports'> {
  /**
   * Existing Provider to be used.
   */
  // useExisting?: Type<GraphileWorkerConfigurationFactory>;

  /**
   * Type (class name) of provider (instance to be registered and injected).
   */
  // useClass?: Type<GraphileWorkerConfigurationFactory>;

  /**
   * Factory function that returns an instance of the provider to be injected.
   */
  useFactory?: (
    ...args: any[]
  ) => Promise<GraphileWorkerConfiguration> | GraphileWorkerConfiguration;

  /**
   * Optional list of providers to be injected into the context of the Factory function.
   */
  inject?: FactoryProvider['inject'];
}
