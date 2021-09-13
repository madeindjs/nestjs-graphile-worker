import { Injectable, Logger } from '@nestjs/common';
import {
  Job,
  quickAddJob,
  runMigrations,
  TaskSpec,
  WorkerUtilsOptions,
} from 'graphile-worker';

@Injectable()
export class GraphileWorkerService {
  private readonly logger = new Logger(GraphileWorkerService.name);
  private isMigrationDone: boolean;

  constructor(private readonly connectionString: string) {}

  async quickAddJob(
    options: WorkerUtilsOptions,
    identifier: string,
    payload?: unknown,
    spec?: TaskSpec,
  ): Promise<Job> {
    await this.runMigrations();

    const job = await quickAddJob(
      {
        connectionString: this.connectionString,
        ...options,
      },
      identifier,
      payload,
      spec,
    );

    this.logger.debug(`quickAddJob add job #${job.id}`);

    return job;
  }

  private async runMigrations() {
    if (this.isMigrationDone) {
      return;
    }

    await runMigrations({ connectionString: this.connectionString });
    this.logger.debug('Run migrations');
    this.isMigrationDone = true;
  }
}
