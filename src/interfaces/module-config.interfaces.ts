import { FactoryProvider, ModuleMetadata } from '@nestjs/common';
import { RunnerOptions } from 'graphile-worker';

export const RUNNER_OPTIONS_KEY = Symbol.for('RUNNER_OPTIONS_KEY');

/**
 * We use `events` internally for decorators.
 */
export type GraphileWorkerConfiguration = Omit<RunnerOptions, 'events'>;

export interface GraphileWorkerConfigurationFactory {
  createSharedConfiguration():
    | Promise<GraphileWorkerConfiguration>
    | GraphileWorkerConfiguration;
}

export interface GraphileWorkerAsyncConfiguration
  extends Pick<ModuleMetadata, 'imports'> {
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
