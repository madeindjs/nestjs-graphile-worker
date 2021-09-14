import { Injectable, Logger } from '@nestjs/common';
import {
  Job,
  makeWorkerUtils,
  run,
  runMigrations,
  RunnerOptions,
  runOnce,
  TaskSpec,
} from 'graphile-worker';

@Injectable()
export class GraphileWorkerService {
  private readonly logger = new Logger(GraphileWorkerService.name);
  private isMigrationDone: boolean;

  constructor(private readonly options: RunnerOptions) {}

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
    const workerUtils = await makeWorkerUtils(this.options);
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

    await runMigrations(this.options);
    this.logger.debug('Run migrations');
    this.isMigrationDone = true;
  }
}
