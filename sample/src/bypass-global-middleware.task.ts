import { Injectable, Logger } from '@nestjs/common';
import { JobHelpers } from 'graphile-worker';
import { Task, TaskHandler, UseMiddlewares } from '../../src/index';

@Injectable()
@Task('bypass-global-middleware')
export class BypassGlobalMiddlewareTask {
  private logger = new Logger(BypassGlobalMiddlewareTask.name);

  @UseMiddlewares(['local1'], { bypassGlobalMiddlewares: ['global1'] })
  @TaskHandler()
  async handler(_payload: any, _helpers: JobHelpers) {
    this.logger.log(
      'Now processing the bypass-global-middleware task handler logic',
    );
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate some work
    this.logger.log('bypass-example task completed');
  }
}
