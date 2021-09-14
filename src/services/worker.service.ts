import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  Job,
  makeWorkerUtils,
  run,
  RunnerOptions,
  runOnce,
  TaskSpec,
  WorkerUtils,
} from 'graphile-worker';
import {
  ConfigurationService,
  CONFIGURATION_SERVICE_KEY,
} from './configuration.service';
import { ListenerExplorerService } from './listener-explorer.service';

@Injectable()
export class WorkerService {
  private readonly logger = new Logger(WorkerService.name);
  private isMigrationDone: boolean;
  private readonly options: RunnerOptions;

  constructor(
    @Inject(CONFIGURATION_SERVICE_KEY)
    configuration: ConfigurationService,
    private readonly explorerService: ListenerExplorerService,
  ) {
    configuration.config.events.on('job:success', (...args: any[]) => {
      this.explorerService.listeners
        .filter(({ event }) => event === 'job:success')
        .forEach(({ callback }) => callback(...args));
    });

    this.options = configuration.config;
  }

  /**
   * Runs until either stopped by a signal event like `SIGINT` or by calling the `stop()` method on the resolved object.
   *
   * The resolved `Runner` object has a number of helpers on it, see [Runner object](https://github.com/graphile/worker#runner-object) for more information.
   */
  async run(): Promise<void> {
    await this.runMigrations();

    this.logger.debug('Start runner');

    const runner = await run(this.options);
    return runner.promise;
  }

  /**
   * Runs until there are no runnable jobs left, and then resolve.
   */
  async runOnce(): Promise<void> {
    await this.runMigrations();

    this.logger.debug('Start runner');

    await runOnce(this.options);
  }

  getWorkerUtils(): Promise<WorkerUtils> {
    return makeWorkerUtils(this.options);
  }

  async addJob(
    identifier: string,
    payload?: unknown,
    spec?: TaskSpec,
  ): Promise<Job> {
    const [job] = await this.addJobs([{ identifier, payload, spec }]);
    return job;
  }

  async addJobs(
    jobs: Array<{ identifier: string; payload?: unknown; spec?: TaskSpec }>,
  ): Promise<Job[]> {
    const workerUtils = await this.getWorkerUtils();
    const createdJobs: Job[] = [];

    try {
      await workerUtils.migrate();

      for (const { identifier, payload, spec } of jobs) {
        const job = await workerUtils.addJob(identifier, payload, spec);
        createdJobs.push(job);
      }
      return createdJobs;
    } finally {
      await workerUtils.release();
    }
  }

  private async runMigrations() {
    if (this.isMigrationDone) {
      return;
    }

    this.logger.debug('Run migrations');
    this.isMigrationDone = true;
  }
}
