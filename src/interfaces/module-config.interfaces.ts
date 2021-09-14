import { FactoryProvider, ModuleMetadata } from '@nestjs/common';
import { RunnerOptions } from 'graphile-worker';

export type RunnerOptionWithoutEvents = Omit<RunnerOptions, 'events'>;

export interface GraphileWorkerConfigurationFactory {
  createSharedConfiguration():
    | Promise<RunnerOptionWithoutEvents>
    | RunnerOptionWithoutEvents;
}

export interface GraphileWorkerAsyncConfiguration
  extends Pick<ModuleMetadata, 'imports'> {
  /**
   * Factory function that returns an instance of the provider to be injected.
   */
  useFactory?: (
    ...args: any[]
  ) => Promise<RunnerOptionWithoutEvents> | RunnerOptionWithoutEvents;

  /**
   * Optional list of providers to be injected into the context of the Factory function.
   */
  inject?: FactoryProvider['inject'];
}
