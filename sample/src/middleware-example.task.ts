import { Injectable, Logger } from '@nestjs/common';
import { JobHelpers } from 'graphile-worker';
import { Task, TaskHandler } from '../../src/index';

@Injectable()
@Task('middleware-example')
export class MiddlewareExampleTask {
  private logger = new Logger(MiddlewareExampleTask.name);

  @TaskHandler()
  async handler(payload: any, _helpers: JobHelpers) {
    this.logger.log(
      `Started processing middleware example task with payload: ${JSON.stringify(
        payload,
      )}`,
    );

    // Simulate some work
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check if payload was modified by middleware
    if (payload.enriched) {
      this.logger.log('Job executed with enriched context');
    } else {
      this.logger.log('Job executed without enriched context');
    }

    this.logger.log('Middleware example task completed');
  }
}
