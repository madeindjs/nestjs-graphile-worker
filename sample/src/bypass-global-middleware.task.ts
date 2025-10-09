import { Injectable, Logger } from '@nestjs/common';
import { JobHelpers } from 'graphile-worker';
import { Task, TaskHandler, UseMiddlewares } from '../../src/index';
import { Local1Middleware } from './middlewares/local1.middleware';
import { Global1Middleware } from './middlewares/global1.middleware';

@Injectable()
@Task('bypass-global-middleware')
export class BypassGlobalMiddlewareTask {
  private logger = new Logger(BypassGlobalMiddlewareTask.name);

  @UseMiddlewares([Local1Middleware], {
    bypassGlobalMiddlewares: [Global1Middleware],
  })
  @TaskHandler()
  async handler(_payload: any, _helpers: JobHelpers) {
    this.logger.log(
      'Now processing the bypass-global-middleware task handler logic',
    );
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate some work
    this.logger.log('bypass-example task completed');
  }
}
