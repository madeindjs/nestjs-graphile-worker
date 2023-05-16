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
import { RUNNER_OPTIONS_KEY } from '../interfaces/module-config.interfaces';
import { uniq } from '../utils/array.utils';
import { ListenerExplorerService } from './listener-explorer.service';
import { TaskExplorerService } from './task-explorer.service';

@Injectable()
export class WorkerService {
  private readonly logger = new Logger(WorkerService.name);
  private isMigrationDone: boolean;

  constructor(
    @Inject(RUNNER_OPTIONS_KEY) private readonly options: RunnerOptions,
    private readonly listenerExplorerService: ListenerExplorerService,
    private readonly taskExplorerService: TaskExplorerService,
  ) {
    this.options.taskList = this.taskExplorerService.taskList;
    this.hookEvents();
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

  private async hookEvents() {
    await this.listenerExplorerService.ensureInitialized();
    const events = this.listenerExplorerService.listeners.map(
      ({ event }) => event,
    );

    for (const event of uniq(events)) {
      this.options.events.on(event, (...args: any[]) => {
        this.listenerExplorerService.listeners
          .filter(({ event: e }) => e === event)
          .forEach(({ callback }) => callback(...args));
      });
    }
  }
}
