import { FactoryProvider, ModuleMetadata } from '@nestjs/common';
import { RunnerOptions, JobHelpers } from 'graphile-worker';

export const RUNNER_OPTIONS_KEY = Symbol.for('RUNNER_OPTIONS_KEY');
export const GLOBAL_JOB_MIDDLEWARES_KEY = Symbol.for(
  'GLOBAL_JOB_MIDDLEWARES_KEY',
);

/**
 * Job middleware function type.
 * Middleware can modify payload, execute side effects, and control job execution.
 */
export type JobMiddleware = (
  payload: any,
  helpers: JobHelpers,
  next: (payload?: any) => Promise<void>,
) => Promise<void>;

/**
 * We use `events` internally for decorators.
 */
export type GraphileWorkerConfiguration = Omit<
  RunnerOptions,
  'events' | 'taskList'
> & {
  /**
   * Global middlewares that will be applied to all jobs.
   * Middlewares are executed in the order they are defined.
   */
  middlewares?: JobMiddleware[];
};

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
  useFactory: (
    ...args: any[]
  ) => Promise<GraphileWorkerConfiguration> | GraphileWorkerConfiguration;

  /**
   * Optional list of providers to be injected into the context of the Factory function.
   */
  inject?: FactoryProvider['inject'];
}
