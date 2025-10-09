import { Injectable, Logger } from '@nestjs/common';
import { JobHelpers } from 'graphile-worker';
import { Task, TaskHandler, UseMiddlewares } from '../../src/index';
import { Local1Middleware } from './middlewares/local1.middleware';
import { Local2Middleware } from './middlewares/local2.middleware';

@Injectable()
@Task('middleware-example')
export class MiddlewareExampleTask {
  private logger = new Logger(MiddlewareExampleTask.name);

  @UseMiddlewares([Local1Middleware, Local2Middleware])
  @TaskHandler()
  async handler(payload: any, _helpers: JobHelpers) {
    this.logger.log(
      'Now processing the middleware-example task handler logic, with payload:',
      payload,
    );
    await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate some work
    this.logger.log('middleware-example  task now completed');
  }
}
